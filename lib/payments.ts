import crypto from "crypto";

export interface RazorpayConfigStatus {
  configured: boolean;
  mode: "LIVE" | "TEST" | "UNCONFIGURED";
  keyId: string | null;
  webhookConfigured: boolean;
}

export function getRazorpayConfigStatus(): RazorpayConfigStatus {
  const keyId = process.env.RAZORPAY_KEY_ID || null;
  const keySecret = process.env.RAZORPAY_KEY_SECRET || null;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || null;

  const configured = Boolean(keyId && keySecret);
  let mode: "LIVE" | "TEST" | "UNCONFIGURED" = "UNCONFIGURED";

  if (configured && keyId) {
    mode = keyId.startsWith("rzp_live_") ? "LIVE" : "TEST";
  }

  return {
    configured,
    mode,
    keyId: configured ? keyId : null,
    webhookConfigured: Boolean(webhookSecret),
  };
}

export interface CreateRazorpayOrderResult {
  success: boolean;
  razorpayOrderId?: string;
  amountPaise?: number;
  currency?: "INR";
  keyId?: string;
  errorCode?: "PAYMENT_PROVIDER_UNAVAILABLE" | "PROVIDER_API_ERROR";
  errorMessage?: string;
}

/**
 * Create a payment order on Razorpay from the trusted server.
 * Never fabricates a successful payment order when credentials are absent.
 */
export async function createRazorpayServerOrder(
  internalOrderId: string,
  amountPaise: number
): Promise<CreateRazorpayOrderResult> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return {
      success: false,
      errorCode: "PAYMENT_PROVIDER_UNAVAILABLE",
      errorMessage:
        "Online payment gateway (Razorpay) is not configured on this server. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env, or select Cash on Delivery (COD).",
    };
  }

  try {
    const authToken = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: internalOrderId,
        notes: {
          grocerlyOrderId: internalOrderId,
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return {
        success: false,
        errorCode: "PROVIDER_API_ERROR",
        errorMessage: `Payment gateway returned status ${response.status}.`,
      };
    }

    const data = (await response.json()) as { id: string; amount: number; currency: "INR" };
    return {
      success: true,
      razorpayOrderId: data.id,
      amountPaise: data.amount,
      currency: "INR",
      keyId,
    };
  } catch (err) {
    return {
      success: false,
      errorCode: "PROVIDER_API_ERROR",
      errorMessage:
        err instanceof Error ? err.message : "Unable to reach Razorpay payment gateway.",
    };
  }
}

/**
 * Verify Razorpay checkout signature server-side using HMAC-SHA256 and timing-safe comparison.
 */
export function verifyRazorpayPaymentSignature(
  paramsOrOrderId:
    | {
        razorpayOrderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
        secretOverride?: string;
      }
    | string,
  posPaymentId?: string,
  posSignature?: string,
  posSecret?: string
): boolean {
  const params =
    typeof paramsOrOrderId === "string"
      ? {
          razorpayOrderId: paramsOrOrderId,
          razorpayPaymentId: posPaymentId || "",
          razorpaySignature: posSignature || "",
          secretOverride: posSecret,
        }
      : paramsOrOrderId;

  const secret = params.secretOverride || process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  if (!params.razorpayOrderId || !params.razorpayPaymentId || !params.razorpaySignature) {
    return false;
  }

  const payload = `${params.razorpayOrderId}|${params.razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    const providedBuf = Buffer.from(params.razorpaySignature, "hex");
    const expectedBuf = Buffer.from(expectedSignature, "hex");
    if (providedBuf.length === 0 || providedBuf.length !== expectedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(providedBuf, expectedBuf);
  } catch {
    return false;
  }
}

/**
 * Verify Razorpay webhook payload signature (X-Razorpay-Signature) using HMAC-SHA256.
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  webhookSecretOverride?: string
): boolean {
  const secret = webhookSecretOverride || process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signatureHeader || typeof rawBody !== "string") {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  try {
    const providedBuf = Buffer.from(signatureHeader, "hex");
    const expectedBuf = Buffer.from(expectedSignature, "hex");
    if (providedBuf.length === 0 || providedBuf.length !== expectedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(providedBuf, expectedBuf);
  } catch {
    return false;
  }
}
