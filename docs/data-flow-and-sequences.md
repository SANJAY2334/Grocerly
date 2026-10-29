# Grocerly — Data Flows & Sequence Diagrams

**Document Identifier:** `DOC-FLOW`  
**Current Version:** 2.0.0  
**Status:** Verified & Active  
**Last Reviewed:** October 18, 2026  

---

## 1. Authentication & Email OTP Verification Lifecycle

This sequence illustrates the end-to-end registration, cryptographic OTP delivery, verification, and session establishment workflow.

```mermaid
sequenceDiagram
    autonumber
    actor User as Shopper / Client
    participant Front as Frontend (React / App Router)
    participant API as /api/auth/* Route Handlers
    participant AuthSvc as Auth & OTP Services
    participant DB as MongoDB (Users & OtpChallenges)
    participant Email as Nodemailer / SMTP Relay

    User->>Front: Submit registration form (name, email, password)
    Front->>API: POST /api/auth/register {name, email, password}
    API->>AuthSvc: registerUser(payload)
    AuthSvc->>AuthSvc: Validate Zod schema & hash password (Bcrypt salt 12)
    AuthSvc->>DB: Check email uniqueness & create User (status: PENDING_VERIFICATION)
    AuthSvc->>AuthSvc: Generate 6-digit random OTP & compute HMAC-SHA256
    AuthSvc->>DB: Store OtpChallenge (otpHash, 300s expiry, attempts: 0)
    AuthSvc->>Email: Dispatch email with plaintext 6-digit OTP
    AuthSvc-->>API: Return user safe object & requiresVerification: true
    API-->>Front: HTTP 201 Created (Prompt for OTP)

    Note over User,Front: User retrieves 6-digit code from email

    User->>Front: Enter 6-digit OTP on /verify-email
    Front->>API: POST /api/auth/verify-email {email, otp}
    API->>AuthSvc: verifyUserEmail(email, otp)
    AuthSvc->>DB: Find active OtpChallenge for email
    AuthSvc->>AuthSvc: Check expiry (<300s) & attempts (<5)
    AuthSvc->>AuthSvc: Verify OTP using constant-time HMAC comparison
    AuthSvc->>DB: Mark OtpChallenge consumed & User status: ACTIVE, verified: true
    AuthSvc->>DB: Create Session record (tokenHash, 7-day TTL)
    AuthSvc-->>API: Return signed sessionToken & safe user
    API-->>Front: HTTP 200 OK + Set-Cookie: grocerly_session (HttpOnly, Secure)
    Front-->>User: Redirect to Storefront / Dashboard (Authenticated)
```

---

## 2. Cart Synchronization & Server-Side Pricing Validation

This sequence details how client carts are reconciled with live database stock and authoritative server-side pricing.

```mermaid
sequenceDiagram
    autonumber
    actor User as Shopper
    participant Front as Frontend (Zustand Store)
    participant CartAPI as POST /api/cart/validate
    participant DB as MongoDB (Products & Coupons)
    participant Engine as Pricing Engine (lib/pricing.ts)

    User->>Front: Add item to cart / Apply promo coupon "FRESH50"
    Front->>CartAPI: POST /api/cart/validate {items: [{productId, quantity}], couponCode}
    CartAPI->>DB: Fetch live Product documents & active Coupon documents
    CartAPI->>Engine: calculatePricingBreakdown(items, {products, coupons})
    loop For each item
        Engine->>Engine: Validate quantity against live product stock
        Engine->>Engine: Calculate integer paise line total (unitPrice * qty)
    end
    Engine->>Engine: Evaluate coupon validity (minSubtotal, expiry, limits)
    Engine->>Engine: Calculate statutory 5% GST (2.5% CGST + 2.5% SGST)
    Engine->>Engine: Evaluate delivery fee (Free if subtotal >= 30000 paise, else 4000 paise)
    Engine-->>CartAPI: Return authoritative PricingBreakdown
    CartAPI-->>Front: HTTP 200 OK {pricing, availableCoupons}
    Front->>Front: Update client store totals (Subtotal, GST, Delivery Fee, Final Payable)
    Front-->>User: Render verified totals & checkout button
```

---

## 3. Order Placement & Atomic Inventory Reservation

This sequence illustrates the checkout workflow, including idempotency deduplication and atomic stock decrementing.

```mermaid
sequenceDiagram
    autonumber
    actor User as Authenticated Customer
    participant Front as Checkout UI (/checkout)
    participant OrderAPI as POST /api/orders
    participant OrderSvc as Order Service (lib/services/order.ts)
    participant DB as MongoDB (Orders & Products)
    participant Email as Nodemailer Email Service

    User->>Front: Click "Place Order" (Cash on Delivery or Online)
    Front->>OrderAPI: POST /api/orders {items, address, slot, paymentMethod, idempotencyKey}
    OrderAPI->>OrderAPI: Check rate limit (15 req/min) & verify session
    OrderAPI->>OrderSvc: createNewOrder(orderParams)
    
    OrderSvc->>DB: Find existing order by idempotencyKey
    alt Duplicate idempotencyKey exists
        DB-->>OrderSvc: Return existing Order document
        OrderSvc-->>OrderAPI: Return existing order (deduplicated)
        OrderAPI-->>Front: HTTP 201 Created (Existing order)
    else New Unique Order
        loop For each order item
            OrderSvc->>DB: Check Product stock >= quantity
        end
        loop For each order item
            OrderSvc->>DB: findOneAndUpdate({id, stock: {$gte: qty}}, {$inc: {stock: -qty, soldCount: qty}})
        end
        OrderSvc->>OrderSvc: Snapshot pricing breakdown in integer paise
        OrderSvc->>DB: Create Order document (status: CONFIRMED, paymentStatus: PENDING)
        OrderSvc->>DB: Insert AuditLog record (ORDER_CREATED)
        OrderSvc->>Email: Dispatch Order Confirmation Email asynchronously
        OrderSvc-->>OrderAPI: Return created Order document
        OrderAPI-->>Front: HTTP 201 Created {success: true, order}
        Front-->>User: Redirect to /confirmation?orderId=ORD-XXXXXX
    end
```

---

## 4. Online Payment Verification & Webhook Handling (Razorpay)

This sequence details online payment initialization, HMAC signature verification, and redundant webhook processing.

```mermaid
sequenceDiagram
    autonumber
    actor User as Customer
    participant Front as Checkout Client
    participant PayAPI as POST /api/payments/*
    participant Razorpay as Razorpay API Gateway
    participant DB as MongoDB (Orders & ProcessedWebhooks)
    participant OrderSvc as Order Service

    User->>Front: Select "Pay Online (UPI / Card)"
    Front->>PayAPI: POST /api/payments/create-order {orderId}
    PayAPI->>DB: Find Order & verify user ownership
    PayAPI->>Razorpay: POST /v1/orders {amount: amountPaise, currency: "INR", receipt: orderId}
    Razorpay-->>PayAPI: Return {id: "rzp_order_abc123", amount}
    PayAPI->>DB: Save razorpayOrderId on Order document
    PayAPI-->>Front: HTTP 200 OK {razorpayOrderId, keyId, amountPaise}

    Front->>Razorpay: Open Razorpay Checkout Modal & Process Payment
    Razorpay-->>Front: Return payment credentials {razorpay_payment_id, razorpay_signature}

    Front->>PayAPI: POST /api/payments/verify {orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature}
    PayAPI->>PayAPI: Verify HMAC-SHA256(order_id + "|" + payment_id, RAZORPAY_KEY_SECRET)
    alt Signature Valid
        PayAPI->>DB: Update Order paymentStatus: "PAID", razorpayPaymentId
        PayAPI->>OrderSvc: Advance order timeline note: "Online payment verified"
        PayAPI-->>Front: HTTP 200 OK {verified: true}
        Front-->>User: Display payment success & delivery timeline
    else Signature Invalid
        PayAPI-->>Front: HTTP 400 Bad Request ("Signature verification failed")
        Front-->>User: Show payment verification failure alert
    end

    opt Redundant Server-to-Server Webhook
        Razorpay->>PayAPI: POST /api/payments/webhook (payment.captured)
        PayAPI->>PayAPI: Verify X-Razorpay-Signature with WEBHOOK_SECRET
        PayAPI->>DB: Check ProcessedWebhook(eventId)
        alt Not already processed
            PayAPI->>DB: Update Order paymentStatus: "PAID"
            PayAPI->>DB: Record eventId in ProcessedWebhook (30-day TTL)
            PayAPI-->>Razorpay: HTTP 200 OK
        else Already processed
            PayAPI-->>Razorpay: HTTP 200 OK (Idempotent acknowledge)
        end
    end
```

---

## 5. Order State Machine & Fulfillment Workflow

This diagram models the permissible operational state transitions and actor authority.

```mermaid
stateDiagram-v2
    [*] --> PENDING_PAYMENT : Order Created

    PENDING_PAYMENT --> CONFIRMED : Payment Captured / COD Placed
    PENDING_PAYMENT --> PAYMENT_FAILED : Payment Declined
    PENDING_PAYMENT --> CANCELLED : Customer / System Cancel

    PAYMENT_FAILED --> PENDING_PAYMENT : Customer Retries Payment
    PAYMENT_FAILED --> CANCELLED : Customer Abandons Checkout

    CONFIRMED --> PROCESSING : Ops Picking Started
    CONFIRMED --> CANCELLED : Customer / Ops Cancellation (Stock Released)
    CONFIRMED --> REFUNDED : Admin Refund

    PROCESSING --> PACKED : Freshness QC Passed
    PROCESSING --> CANCELLED : Ops Cancellation (Stock Released)
    PROCESSING --> REFUNDED : Admin Refund

    PACKED --> OUT_FOR_DELIVERY : Driver Dispatched
    PACKED --> CANCELLED : Ops Emergency Cancel
    PACKED --> REFUNDED : Admin Refund

    OUT_FOR_DELIVERY --> DELIVERED : Delivery Handover
    OUT_FOR_DELIVERY --> CANCELLED : Failed Delivery Attempt

    DELIVERED --> REFUNDED : Admin Post-Delivery Refund
    CANCELLED --> REFUNDED : Admin Refund If Charged

    DELIVERED --> [*] : Terminal State
    REFUNDED --> [*] : Terminal State
```
