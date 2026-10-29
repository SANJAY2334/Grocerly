import nodemailer, { Transporter } from "nodemailer";
import { config } from "@/lib/config";
import { appLogger } from "@/lib/logging";
import { Order } from "@/lib/types";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SentEmailRecord {
  to: string;
  subject: string;
  sentAt: string;
  previewText: string;
}

const sentEmailsTestQueue: SentEmailRecord[] = [];
let simulateFailureInTest: boolean = false;

export function setSimulateEmailFailureForTest(shouldFail: boolean): void {
  simulateFailureInTest = shouldFail;
}

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter;

  if (config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS) {
    cachedTransporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT || 587,
      secure: config.SMTP_SECURE,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    return cachedTransporter;
  }

  return null;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; simulated?: boolean }> {
  const transporter = getTransporter();

  // Test environment isolation: only automated tests may use the test queue
  if (process.env.NODE_ENV === "test") {
    if (simulateFailureInTest) {
      appLogger.error(
        { to: options.to, subject: options.subject },
        "EMAIL_DELIVERY_FAILURE: Simulated delivery failure in test mode."
      );
      throw new Error("Simulated SMTP connection error: ETIMEDOUT connect to mail server");
    }

    const record: SentEmailRecord = {
      to: options.to,
      subject: options.subject,
      sentAt: new Date().toISOString(),
      previewText: options.text,
    };
    sentEmailsTestQueue.unshift(record);
    if (sentEmailsTestQueue.length > 50) sentEmailsTestQueue.pop();

    appLogger.info(
      { to: options.to, subject: options.subject, mode: "TEST_FIXTURE_TRANSPORTER" },
      "EMAIL_DELIVERY: Email buffered in isolated test environment queue."
    );
    return { success: true, messageId: `test_${Date.now()}`, simulated: true };
  }

  // Outside automated tests, SMTP must be configured; fail honestly without fake success
  if (!transporter) {
    appLogger.error(
      { to: options.to, subject: options.subject },
      "EMAIL_DELIVERY_FAILED: SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in environment."
    );
    throw new Error(
      "Transactional email service is unconfigured. SMTP_HOST, SMTP_USER, and SMTP_PASS must be configured in environment variables."
    );
  }

  try {
    const info = await transporter.sendMail({
      from: config.SMTP_FROM,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    appLogger.info({ to: options.to, subject: options.subject, messageId: info.messageId }, "EMAIL_DELIVERY_SUCCESS");
    return { success: true, messageId: info.messageId, simulated: false };
  } catch (err) {
    appLogger.error(
      { to: options.to, subject: options.subject, err: err instanceof Error ? err.message : String(err) },
      "EMAIL_DELIVERY_FAILURE"
    );
    throw new Error(`Email delivery failed: ${err instanceof Error ? err.message : "Unknown SMTP error"}`);
  }
}

export function getSentEmailsForTest(): SentEmailRecord[] {
  return [...sentEmailsTestQueue];
}

export function clearSentEmailsForTest(): void {
  sentEmailsTestQueue.length = 0;
}

export async function checkEmailHealth(): Promise<{
  configured: boolean;
  provider: "SMTP" | "SIMULATED_TEST_PROVIDER";
  status: "ready" | "unconfigured" | "error";
  details?: string;
}> {
  const hasConfig = Boolean(config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS);
  if (!hasConfig) {
    return {
      configured: false,
      provider: "SIMULATED_TEST_PROVIDER",
      status: "unconfigured",
      details: "SMTP credentials not provided. Using in-memory test transporter.",
    };
  }

  try {
    const transporter = getTransporter();
    if (transporter) {
      await transporter.verify();
      return {
        configured: true,
        provider: "SMTP",
        status: "ready",
      };
    }
    return {
      configured: false,
      provider: "SIMULATED_TEST_PROVIDER",
      status: "unconfigured",
    };
  } catch (err) {
    return {
      configured: true,
      provider: "SMTP",
      status: "error",
      details: err instanceof Error ? err.message : "SMTP verification failed",
    };
  }
}

// -----------------------------------------------------------------------------
// BRANDED EMAIL TEMPLATES
// -----------------------------------------------------------------------------

function renderEmailLayout(title: string, bodyContent: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F7F2; margin: 0; padding: 24px; color: #163C29; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid rgba(22,60,41,0.08); overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
    .header { background: #163C29; padding: 28px 32px; text-align: center; }
    .logo-badge { display: inline-block; background: #C8E27A; color: #163C29; font-weight: 900; font-size: 14px; letter-spacing: 2px; padding: 6px 16px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 8px; }
    .brand-title { color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; }
    .content { padding: 32px; line-height: 1.6; font-size: 14px; }
    .otp-code { font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #163C29; background: #F8F7F2; border: 2px dashed #C8E27A; border-radius: 12px; padding: 16px; text-align: center; margin: 24px 0; }
    .button { display: inline-block; background: #163C29; color: #ffffff !important; text-decoration: none; font-weight: 700; padding: 12px 24px; border-radius: 12px; font-size: 14px; margin: 16px 0; }
    .footer { background: #fafaf7; padding: 20px 32px; font-size: 11px; color: #6b7280; text-align: center; border-top: 1px solid rgba(22,60,41,0.06); }
    .security-notice { font-size: 12px; color: #854d0e; background: #fefce8; border: 1px solid #fef08a; padding: 12px; border-radius: 8px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo-badge">Grocerly Fresh</div>
      <h1 class="brand-title">Good Food. Brighter Days.</h1>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      <p>This is an automated email from Grocerly Organic E-Commerce Platform.</p>
      <p>If you did not request this communication, please contact security@grocerly.in immediately.</p>
      <p>© ${new Date().getFullYear()} Grocerly Inc. 100% Farm-Fresh Guarantee.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * 1. Welcome & Email Verification (OTP)
 */
export async function sendVerificationOtpEmail(to: string, name: string, otp: string): Promise<void> {
  const title = "Verify Your Grocerly Account";
  const html = renderEmailLayout(
    title,
    `
      <h2 style="margin-top:0; color:#163C29;">Welcome to Grocerly, ${name}!</h2>
      <p>Thank you for joining our fresh farm-to-table grocery platform. Please use the 6-digit one-time verification code below to confirm your email address:</p>
      <div class="otp-code">${otp}</div>
      <div class="security-notice">
        <strong>Security Notice:</strong> This OTP is valid for 5 minutes. Never share this code with anyone. Grocerly staff will never ask for your verification code.
      </div>
      <p>Once verified, you will have instant access to your cart, farm-fresh produce discounts, and fast contactless delivery.</p>
    `
  );
  const text = `Welcome to Grocerly, ${name}!\n\nYour 6-digit verification code is: ${otp}\n\nThis code expires in 5 minutes. Do not share it with anyone.`;
  await sendEmail({ to, subject: `${otp} is your Grocerly verification code`, html, text });
}

/**
 * 2. Password Reset Email
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  tokenOrUrl: string,
  maybeToken?: string
): Promise<void> {
  const token = maybeToken || (tokenOrUrl.includes("token=") ? tokenOrUrl.split("token=")[1].split("&")[0] : tokenOrUrl);
  const resetUrl = tokenOrUrl.startsWith("http") ? tokenOrUrl : `${config.APP_URL}/reset-password?token=${token}`;

  const title = "Reset Your Grocerly Password";
  const html = renderEmailLayout(
    title,
    `
      <h2 style="margin-top:0; color:#163C29;">Password Reset Request</h2>
      <p>Hello ${name},</p>
      <p>We received a request to reset the password associated with your Grocerly account. Click the button below to set a new password:</p>
      <p style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset My Password →</a>
      </p>
      <p style="font-size: 12px; color: #6b7280;">If the button does not work, copy and paste this link into your browser:<br><a href="${resetUrl}" style="color:#163C29;">${resetUrl}</a></p>
      <div class="security-notice">
        <strong>Security Notice:</strong> This reset link expires in 15 minutes and can only be used once. If you did not initiate this request, your account is safe and you can ignore this email.
      </div>
    `
  );
  const text = `Hello ${name},\n\nWe received a request to reset your Grocerly account password. Open this link to reset it:\n${resetUrl}\n\nThis link expires in 15 minutes. If you did not request this, please ignore this email.`;
  await sendEmail({ to, subject: "Reset your Grocerly account password", html, text });
}

/**
 * 3. Password Change Confirmation
 */
export async function sendPasswordChangeConfirmationEmail(to: string, name: string): Promise<void> {
  const title = "Password Changed Successfully";
  const html = renderEmailLayout(
    title,
    `
      <h2 style="margin-top:0; color:#163C29;">Your Password Has Been Updated</h2>
      <p>Hello ${name},</p>
      <p>This is a confirmation that your Grocerly account password was changed on <strong>${new Date().toUTCString()}</strong>.</p>
      <p>All other active sessions have been automatically terminated for your protection.</p>
      <div class="security-notice">
        If you did not make this change, please reset your password immediately or email security@grocerly.in.
      </div>
    `
  );
  const text = `Hello ${name},\n\nYour Grocerly account password was changed on ${new Date().toUTCString()}. All active sessions were revoked. If you did not make this change, contact security@grocerly.in immediately.`;
  await sendEmail({ to, subject: "Security Alert: Your Grocerly password was updated", html, text });
}

/**
 * 4. Order Confirmation Email
 */
export async function sendOrderConfirmationEmail(to: string, name: string, order: Order): Promise<void> {
  const title = `Order Confirmed: #${order.id}`;
  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f0f0eb;">
          <strong>${item.name}</strong> (${item.unit}) × ${item.quantity}
        </td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f0f0eb; text-align: right; font-weight: bold;">
          ₹${item.lineTotal.toFixed(2)}
        </td>
      </tr>
    `
    )
    .join("");

  const html = renderEmailLayout(
    title,
    `
      <h2 style="margin-top:0; color:#163C29;">Thank you for your order!</h2>
      <p>Hello ${name},</p>
      <p>Your grocery order <strong>#${order.id}</strong> has been received and confirmed.</p>
      <div style="background:#F8F7F2; border-radius:12px; padding:16px; margin:16px 0;">
        <table style="width:100%; border-collapse: collapse; font-size:13px;">
          ${itemsHtml}
          <tr>
            <td style="padding: 12px 0 4px 0; font-weight: bold; font-size:14px;">Total Payable</td>
            <td style="padding: 12px 0 4px 0; text-align: right; font-weight: 900; font-size:16px; color:#163C29;">
              ₹${order.pricing.finalPayable.toFixed(2)}
            </td>
          </tr>
        </table>
      </div>
      <p><strong>Delivery Slot:</strong> ${order.deliverySlot}</p>
      <p><strong>Delivery Address:</strong> ${order.address.street}, ${order.address.city}, ${order.address.pincode}</p>
      <p>Our fulfillment team is carefully preparing your farm-fresh produce with cold-chain packaging.</p>
    `
  );
  const text = `Hello ${name},\n\nYour order #${order.id} is confirmed! Total: ₹${order.pricing.finalPayable.toFixed(2)}\nDelivery Slot: ${order.deliverySlot}\nAddress: ${order.address.street}, ${order.address.city}, ${order.address.pincode}`;
  await sendEmail({ to, subject: `Order Confirmed #${order.id} — Grocerly Fresh`, html, text });
}

/**
 * 5. Order Status Update Email
 */
export async function sendOrderStatusUpdateEmail(to: string, name: string, order: Order, newStatus: string): Promise<void> {
  const title = `Order #${order.id} is now ${newStatus}`;
  const html = renderEmailLayout(
    title,
    `
      <h2 style="margin-top:0; color:#163C29;">Order Status Update</h2>
      <p>Hello ${name},</p>
      <p>Your Grocerly order <strong>#${order.id}</strong> has been updated to: <span style="display:inline-block; background:#C8E27A; color:#163C29; padding:4px 12px; border-radius:9999px; font-weight:bold;">${newStatus}</span></p>
      <p><strong>Delivery Slot:</strong> ${order.deliverySlot}</p>
      <p>You can track the live progress of your delivery directly on your Grocerly dashboard.</p>
    `
  );
  const text = `Hello ${name},\n\nYour order #${order.id} status has been updated to ${newStatus}.\nDelivery Slot: ${order.deliverySlot}`;
  await sendEmail({ to, subject: `Status Update for Order #${order.id}: ${newStatus}`, html, text });
}

/**
 * 6. Account Security Alert Email
 */
export async function sendSecurityAlertEmail(to: string, name: string, message: string): Promise<void> {
  const title = "Grocerly Account Security Alert";
  const html = renderEmailLayout(
    title,
    `
      <h2 style="margin-top:0; color:#163C29;">Security Notification</h2>
      <p>Hello ${name},</p>
      <p>${message}</p>
      <div class="security-notice">
        If you recognize this activity, no action is needed. If you did not authorize this, please reset your password immediately.
      </div>
    `
  );
  const text = `Hello ${name},\n\nSecurity Notification: ${message}`;
  await sendEmail({ to, subject: "Grocerly Security Alert", html, text });
}
