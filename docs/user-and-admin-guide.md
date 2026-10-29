# Grocerly — User & Administrator Operations Manual

**Document Identifier:** `DOC-GUIDE`  
**Current Version:** 2.0.0  
**Status:** Verified & Active  
**Last Reviewed:** October 18, 2026  

---

## 1. Customer Storefront User Guide

### 1.1 Browsing & Finding Produce
- **Department Browsing**: Use the category grid on `/` or `/shop` to view curated items across `Vegetables`, `Fruits`, `Dairy`, `Bakery`, `Beverages`, and `Snacks`.
- **Search & Filtering**: Enter search terms in the top navigation search bar or filter by organic certification, price range, freshness score, and in-stock availability.
- **Product Details & 3D Produce Showcase**: Click on any product card to view high-resolution imagery, nutritional breakdowns (calories, protein, carbs, fat, fiber), allergen tags, and the interactive 3D Freshness Orbit.

### 1.2 Smart Meal Planner & Automated Pantry Deduplication
1. Navigate to `/recipes` or scroll to the Smart Meal Planner section on the homepage.
2. Select desired recipes (e.g., *Palak Paneer*, *Mediterranean Quinoa Salad*, *Avocado Toast*).
3. Adjust the serving count; the engine dynamically scales ingredient requirements.
4. Review the generated consolidated ingredient list.
5. Check items already present in your kitchen pantry under the "In My Pantry" checklist. The planner automatically subtracts these ingredients, recalculating your pantry savings.
6. Click **"Add Remaining to Cart"** to transfer unfulfilled items directly into your shopping cart.

### 1.3 Cart, Promo Coupons & Checkout
1. Open the Cart Drawer from the top-right header icon or bottom floating cart bar.
2. Enter your delivery PIN code to verify serviceability and view estimated arrival windows.
3. Apply active promo codes in the coupon box:
   - `FRESH50`: Flat ₹50 off on orders $\ge$ ₹200.
   - `ORGANIC10`: 10% off (up to ₹100) on orders $\ge$ ₹250 containing organic produce.
   - `WELCOME100`: Flat ₹100 off on orders $\ge$ ₹500.
4. Click **"Proceed to Checkout"** to select a delivery address and preferred delivery time slot (Morning, Afternoon, Evening, Night).
5. Choose payment method:
   - **Cash on Delivery (COD)**: Pay upon physical receipt of groceries.
   - **Online Payment (UPI, Card, Netbanking)**: Fast and secure payment via Razorpay.

### 1.4 Order Tracking & Cancellation
1. Navigate to `/orders` or open `/orders/[id]` via your email confirmation link.
2. Review the live 4-stage visual order timeline:
   $$\text{Confirmed} \longrightarrow \text{Processing at Hub} \longrightarrow \text{Packed} \longrightarrow \text{Out for Delivery} \longrightarrow \text{Delivered}$$
3. **Cancellation**: If your order is in `CONFIRMED` or `PENDING_PAYMENT` state, you may cancel directly from the order page by clicking "Cancel Order". Once fulfillment begins (`PROCESSING`), contact customer support for assistance.

---

## 2. Store Administrator & Operations Guide

Administrative features are restricted to staff accounts holding `OPS` or `ADMIN` roles. Access requires signing in at `/login` and opening `/admin`.

### 2.1 Inventory & Catalog Management (`/admin/products` & `/admin`)
- **Stock Adjustments (`OPS` & `ADMIN`)**:
  - View live inventory pack counts and reserved stock numbers.
  - Update stock quantities in real time; low-stock warnings highlight products at or below their restock threshold (default: 10 units).
- **Price Adjustments (`ADMIN` only)**:
  - Modify selling prices (`price`) or MRP (`originalPrice`). Changes take effect immediately across all client catalog views.
- **Promotional Coupons (`ADMIN` only)**:
  - Toggle active status on promotional codes (`FRESH50`, `ORGANIC10`, `WELCOME100`).

### 2.2 Order Fulfillment Console (`/admin/orders`)
- View global customer order stream sorted by creation date.
- Inspect delivery addresses, selected delivery slots, payment status, and snapshot line items.
- Advance orders along the valid state machine:
  $$\text{CONFIRMED} \longrightarrow \text{PROCESSING} \longrightarrow \text{PACKED} \longrightarrow \text{OUT\_FOR\_DELIVERY} \longrightarrow \text{DELIVERED}$$
- Add optional operational notes to the order timeline (e.g., "Dispatched via Express Van #4").
- Each state transition automatically triggers an order status update email to the customer.

### 2.3 Customer Account Directory (`/admin/users`)
- Inspect registered customer accounts, verification statuses (`verified: true/false`), email verification timestamps, and account status (`ACTIVE` / `SUSPENDED`).
- Passwords and sensitive session tokens are permanently excluded from administrative payloads.

### 2.4 Security Audit Trail (`/admin/audit-logs`)
- Filter and review real-time security events emitted by the platform:
  - Successful and failed login attempts with originating IP addresses.
  - User registrations and OTP verification attempts.
  - Password reset requests and completions.
  - Product stock and pricing modifications with staff actor correlation.
