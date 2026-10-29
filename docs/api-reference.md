# Grocerly — REST API Specification & Endpoint Reference

**Document Identifier:** `DOC-API`  
**Current Version:** 2.0.0  
**Status:** Verified & Active  
**Last Reviewed:** October 18, 2026  

---

## 1. Global Conventions & Standards

- **Base URL**: `http://localhost:3000` (Local) / `https://grocerly.in` (Production)
- **Content Type**: `application/json`
- **Authentication**:
  - `Cookie: grocerly_session=<token>` (Primary browser mechanism)
  - `Authorization: Bearer <token>` (Supported API / mobile mechanism)
- **CSRF Protection**: All mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) require `Origin` header matching server `Host`.
- **Response Format**:
  - Success responses return JSON:
    ```json
    {
      "success": true,
      "data": { ... },
      "timestamp": "2026-10-18T15:00:00.000Z"
    }
    ```
  - Error responses return standardized error envelopes:
    ```json
    {
      "success": false,
      "error": {
        "code": "ERROR_CODE",
        "message": "Human-readable description.",
        "details": null
      },
      "requestId": "req_1792335394532_x4yb4",
      "timestamp": "2026-10-18T15:00:00.000Z"
    }
    ```

---

## 2. Health & Diagnostics Endpoints

### `GET /api/health`
Returns runtime status and diagnostic telemetry for core subsystems.
- **Access**: Public
- **Rate Limit**: None
- **Response `200 OK`**:
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-10-18T15:00:00.000Z",
    "services": {
      "database": {
        "status": "connected",
        "pingMs": 4,
        "dbName": "grocerly"
      },
      "email": {
        "status": "ready"
      }
    },
    "system": {
      "uptimeSeconds": 1420.5,
      "heapUsedMB": 82.4
    }
  }
  ```

### `GET /api/ready`
Readiness probe for container orchestrators (Kubernetes / Cloud Run).
- **Access**: Public
- **Response `200 OK`**: Subsystems ready to receive traffic.
- **Response `503 Service Unavailable`**: Database disconnected or unconfigured.

---

## 3. Authentication & Session Endpoints

### `POST /api/auth/register`
Creates a customer account in `PENDING_VERIFICATION` state and dispatches a 6-digit OTP email.
- **Access**: Public
- **Rate Limit**: 10 req/min per IP
- **Request Body**:
  ```json
  {
    "name": "Ananya Sharma",
    "email": "ananya@example.in",
    "password": "SecurePassword@2026",
    "phone": "+91 98765 43210"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "data": {
      "message": "Registration successful. Please verify your email with the 6-digit code sent to your inbox.",
      "user": {
        "id": "usr_1792335394245_d1d89671",
        "name": "Ananya Sharma",
        "email": "ananya@example.in",
        "role": "CUSTOMER",
        "verified": false
      },
      "requiresVerification": true
    }
  }
  ```
- **Errors**: `400 Bad Request` (Validation), `409 Conflict` (`EMAIL_ALREADY_EXISTS`).

### `POST /api/auth/verify-email`
Verifies and atomically consumes the 6-digit OTP challenge, activates user account, and sets session cookie.
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "ananya@example.in",
    "otp": "492018"
  }
  ```
- **Response `200 OK`**: Sets `Set-Cookie: grocerly_session=...; HttpOnly; SameSite=Lax`.
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "usr_1792335394245_d1d89671",
        "email": "ananya@example.in",
        "verified": true,
        "status": "ACTIVE"
      },
      "sessionId": "sess_1792335395771_147da0b3"
    }
  }
  ```
- **Errors**: `400 Bad Request` (`OTP_EXPIRED`, `INVALID_OTP`, `OTP_MAX_ATTEMPTS_EXCEEDED`).

### `POST /api/auth/resend-otp`
Dispatches a new OTP challenge, invalidating any previous active challenge.
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "ananya@example.in",
    "purpose": "EMAIL_VERIFICATION"
  }
  ```
- **Response `200 OK`**: `{ "success": true, "data": { "message": "Verification code resent successfully." } }`
- **Errors**: `429 Too Many Requests` (`RESEND_COOLDOWN_ACTIVE`).

### `POST /api/auth/login`
Authenticates existing account. If unverified, rejects login with 403 and automatically dispatches an OTP.
- **Access**: Public
- **Rate Limit**: 10 req/min per IP
- **Request Body**:
  ```json
  {
    "email": "ananya@example.in",
    "password": "SecurePassword@2026"
  }
  ```
- **Response `200 OK`**: Sets `Set-Cookie: grocerly_session=...`
- **Response `403 Forbidden`**:
  ```json
  {
    "success": false,
    "error": {
      "code": "EMAIL_NOT_VERIFIED",
      "message": "Your email address is not yet verified. A fresh 6-digit verification code has been dispatched to your inbox."
    }
  }
  ```

### `POST /api/auth/logout`
Revokes active session from MongoDB and clears the browser session cookie.
- **Access**: Public / Authenticated
- **Response `200 OK`**: Sets `Set-Cookie: grocerly_session=; Max-Age=0`.

### `GET /api/auth/me`
Restores current authenticated user profile and active session metadata.
- **Access**: Authenticated (`CUSTOMER`, `OPS`, `ADMIN`)
- **Response `200 OK`**: `{ "success": true, "data": { "user": { ... } } }`
- **Response `401 Unauthorized`**: If unauthenticated.

### `POST /api/auth/forgot-password`
Initiates anti-enumeration password recovery. Sends a single-use reset token link.
- **Access**: Public
- **Request Body**: `{ "email": "ananya@example.in" }`
- **Response `200 OK`**: Always returns identical message regardless of whether email exists:
  `{ "success": true, "data": { "message": "If an account exists with this email address, a password reset link has been dispatched." } }`

### `POST /api/auth/reset-password`
Consumes reset token and establishes a new password. Immediately revokes all prior active sessions.
- **Access**: Public
- **Request Body**: `{ "token": "crypto_token_hex", "password": "NewSecurePassword@2026" }`
- **Response `200 OK`**: Password updated successfully.

### `POST /api/auth/change-password`
Changes password for an authenticated session after verifying the current password.
- **Access**: Authenticated
- **Request Body**: `{ "currentPassword": "OldPassword@2026", "newPassword": "NewPassword@2026" }`

### `GET /api/auth/sessions` & `DELETE /api/auth/sessions/[id]`
Inspects all active device sessions for the authenticated user and allows remote session revocation.

---

## 4. Product Catalog Endpoints

### `GET /api/products`
Retrieves paginated, filtered catalog products.
- **Query Parameters**:
  - `category` (string): e.g. `"Vegetables"`, `"Fruits"`, or `"all"` (default)
  - `search` (string): Text search across name, brand, description, and tags
  - `maxPrice` (number): Price ceiling in INR
  - `minRating` (number): Minimum rating (0–5)
  - `inStockOnly` (boolean): Filters products where `stock > 0`
  - `organicOnly` (boolean): Filters certified organic products
  - `onSaleOnly` (boolean): Filters products with `discount > 0`
  - `sortBy` (string): `"price-asc"`, `"price-desc"`, `"rating"`, `"freshness"`, `"popularity"`
  - `page` (number): Page index (default: `1`)
  - `limit` (number): Items per page (default: `50`, max: `100`)
- **Response `200 OK`**:
  ```json
  {
    "products": [
      {
        "id": "prod-spinach-01",
        "sku": "GRY-VEG-SPIN-01",
        "slug": "organic-baby-spinach",
        "name": "Hydroponic Baby Spinach",
        "brand": "GreenRoot Farms",
        "category": "Vegetables",
        "price": 45,
        "originalPrice": 60,
        "discount": 25,
        "stock": 42,
        "reservedStock": 0,
        "unit": "250g pack",
        "organic": true,
        "freshnessScore": 98
      }
    ],
    "pagination": { "page": 1, "limit": 50, "total": 16, "totalPages": 1 }
  }
  ```

### `GET /api/products/[id]`
Fetches product detail by unique ID (`prod-spinach-01`) or slug (`organic-baby-spinach`).
- **Response `200 OK`**: `{ "product": { ... } }`
- **Response `404 Not Found`**: `{ "error": "Product not found." }`

---

## 5. Cart & Delivery Endpoints

### `GET /api/cart`
Fetches persistent cart items and recalculates live pricing breakdown.
- **Headers**: Optional `x-guest-id` for anonymous cart persistence.
- **Response `200 OK`**: `{ "success": true, "data": { "items": [...], "pricing": { ... }, "couponCode": null } }`

### `POST /api/cart`
Saves updated cart items and revalidates against available inventory.
- **Request Body**:
  ```json
  {
    "items": [{ "productId": "prod-spinach-01", "quantity": 2 }],
    "couponCode": "FRESH50"
  }
  ```

### `POST /api/cart/validate`
Authoritative stateless pricing validation endpoint.
- **Request Body**:
  ```json
  {
    "items": [{ "productId": "prod-spinach-01", "quantity": 2 }],
    "couponCode": "FRESH50"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "pricing": {
      "itemSubtotal": 90,
      "discountAmount": 0,
      "deliveryFee": 40,
      "gstAmount": 4.5,
      "cgstAmount": 2.25,
      "sgstAmount": 2.25,
      "finalPayable": 134.5,
      "lineItems": [...]
    },
    "availableCoupons": [...]
  }
  ```

### `GET /api/delivery/check`
Validates PIN code serviceability and returns available delivery time slots.
- **Query Parameter**: `?pincode=560034`
- **Response `200 OK`**:
  ```json
  {
    "pincode": "560034",
    "serviceable": true,
    "zone": {
      "pincode": "560034",
      "city": "Bengaluru",
      "state": "Karnataka",
      "areaName": "Koramangala Fresh Hub",
      "estimatedWindow": "60 mins",
      "serviceable": true
    },
    "message": "Delivering from Koramangala Fresh Hub, Bengaluru (Est. 60 mins).",
    "slots": [
      { "id": "slot-morning", "label": "Morning: 07:00 AM – 09:00 AM", "isAvailable": true }
    ]
  }
  ```

---

## 6. Orders & Checkout Endpoints

### `GET /api/orders`
Retrieves order history.
- **Access**: Authenticated.
  - `CUSTOMER`: Returns only the customer's own orders.
  - `OPS` / `ADMIN`: Returns all customer orders.
- **Response `200 OK`**: `{ "success": true, "orders": [...] }`

### `POST /api/orders`
Places a new order with atomic inventory reservation and idempotency deduplication.
- **Access**: Authenticated
- **Rate Limit**: 15 req/min per IP
- **Request Body**:
  ```json
  {
    "items": [{ "productId": "prod-spinach-01", "quantity": 2 }],
    "address": {
      "fullName": "Ananya Sharma",
      "phone": "+91 98765 43210",
      "street": "12/4 Palm Grove Ave",
      "city": "Bengaluru",
      "state": "Karnataka",
      "pincode": "560034"
    },
    "deliverySlot": "slot-morning",
    "paymentMethod": "COD",
    "couponCode": "FRESH50",
    "idempotencyKey": "idem_1792335394532_8f2a"
  }
  ```
- **Response `201 Created`**: `{ "success": true, "order": { "id": "ORD-335394-A8F2", ... } }`

### `GET /api/orders/[id]`
Retrieves order details and timeline tracking. Strictly isolated to the order owner or administrative roles.

### `PATCH /api/orders/[id]`
Updates order status along the valid state machine.
- **Access**: Authenticated
  - `CUSTOMER`: Can transition `PENDING_PAYMENT` or `CONFIRMED` $\to$ `CANCELLED`.
  - `OPS` / `ADMIN`: Can transition fulfillment stages.
- **Request Body**:
  ```json
  {
    "status": "CANCELLED",
    "note": "Customer requested order cancellation prior to dispatch."
  }
  ```
- **Response `200 OK`**: `{ "order": { ... } }`

---

## 7. Payment Integration Endpoints

### `POST /api/payments/create-order`
Creates a Razorpay server-side payment order.
- **Access**: Authenticated (order owner)
- **Request Body**: `{ "orderId": "ORD-335394-A8F2" }`
- **Response `200 OK`**: `{ "orderId": "...", "razorpayOrderId": "order_Hn43jX...", "amountPaise": 13450, "currency": "INR", "keyId": "rzp_..." }`
- **Response `503 Service Unavailable`**: If Razorpay credentials are not configured.

### `POST /api/payments/verify`
Cryptographically verifies Razorpay payment signature and marks order `PAID`.
- **Request Body**:
  ```json
  {
    "orderId": "ORD-335394-A8F2",
    "razorpay_order_id": "order_Hn43jX...",
    "razorpay_payment_id": "pay_Hn43kY...",
    "razorpay_signature": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  }
  ```

### `POST /api/payments/webhook`
Receives asynchronous Razorpay webhook events (`payment.captured`, `payment.failed`) with idempotency deduplication.
- **Headers**: `X-Razorpay-Signature: <hmac_hex>`

---

## 8. Administrative Operations Endpoints

### `GET /api/admin/inventory`
Returns product catalog with inventory levels, low-stock alerts, active order counts, and revenue metrics.
- **Access**: `ADMIN`, `OPS`

### `PATCH /api/admin/inventory`
Modifies stock, pricing, or promotional coupons.
- **Stock Updates**: `ADMIN`, `OPS` (`{ "productId": "...", "stock": 50 }`)
- **Price Updates**: `ADMIN` only (`{ "productId": "...", "price": 42 }`)
- **Coupon Toggle**: `ADMIN` only (`{ "action": "TOGGLE_COUPON", "code": "FRESH50", "active": false }`)

### `GET /api/admin/orders`
Returns full order management queue with customer addresses and line item details.
- **Access**: `ADMIN`, `OPS`

### `GET /api/admin/users`
Lists registered customer accounts with verification statuses, email verification timestamps, and account status. Passwords permanently excluded.
- **Access**: `ADMIN` only

### `GET /api/admin/audit-logs`
Queries append-only security audit trail with severity and event filtering.
- **Access**: `ADMIN` only
