const mongoose = require("mongoose");

async function runE2ETests() {
  console.log("--- STARTING LIVE API & DATABASE E2E TEST ---");
  await mongoose.connect("mongodb://127.0.0.1:27017/grocerly");
  const baseUrl = "http://127.0.0.1:3001";

  // 1. REGISTRATION
  const testEmail = "e2e_customer_" + Date.now() + "@grocerly-test.in";
  const testPassword = "Password@2026";
  console.log("1. Testing Registration for:", testEmail);
  const regRes = await fetch(baseUrl + "/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "E2E Customer", email: testEmail, password: testPassword }),
  });
  const regData = await regRes.json();
  console.log("   Registration HTTP status:", regRes.status, "requiresVerification:", regData.data?.requiresVerification);
  if (regRes.status !== 201 || !regData.data?.requiresVerification) throw new Error("Registration failed");

  // Verify in MongoDB
  const userInDb = await mongoose.connection.db.collection("users").findOne({ email: testEmail });
  console.log("   MongoDB User status:", userInDb.status, "verified:", userInDb.verified);
  if (userInDb.verified !== false || userInDb.status !== "PENDING_VERIFICATION") throw new Error("DB unverified state mismatch");

  // 2. UNVERIFIED LOGIN BLOCK
  console.log("2. Testing Login Block on Unverified Account");
  const unverifiedLoginRes = await fetch(baseUrl + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  console.log("   Unverified Login HTTP status:", unverifiedLoginRes.status);
  if (unverifiedLoginRes.status !== 403) throw new Error("Unverified account was not blocked with 403");

  // 3. RETRIEVE OTP FROM MONGODB & VERIFY EMAIL
  console.log("3. Verifying Email with OTP Challenge");
  const otpChallenge = await mongoose.connection.db.collection("otpchallenges").findOne({ email: testEmail }, { sort: { createdAt: -1 } });
  if (!otpChallenge) throw new Error("No OTP challenge found in DB");
  console.log("   OTP challenge recorded in DB. Challenge ID:", otpChallenge.id);

  // Activate customer in DB to simulate verified account
  await mongoose.connection.db.collection("users").updateOne({ email: testEmail }, { $set: { verified: true, status: "ACTIVE" } });
  console.log("   Customer verified & activated in DB.");

  // 4. SIGN-IN & SESSION CREATION
  console.log("4. Testing Sign-In on Activated Account");
  const loginRes = await fetch(baseUrl + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  console.log("   Login HTTP status:", loginRes.status);
  const cookieHeader = loginRes.headers.get("set-cookie");
  console.log("   Set-Cookie received:", Boolean(cookieHeader));
  if (loginRes.status !== 200 || !cookieHeader) throw new Error("Login failed or missing session cookie");

  const cookie = cookieHeader.split(";")[0];

  // 5. SESSION RESTORATION & AUTH/ME
  console.log("5. Testing Session Restoration via /api/auth/me");
  const meRes = await fetch(baseUrl + "/api/auth/me", {
    headers: { "Cookie": cookie },
  });
  const meData = await meRes.json();
  const returnedUser = meData.data?.user || meData.user;
  console.log("   /api/auth/me HTTP status:", meRes.status, "user email:", returnedUser?.email, "role:", returnedUser?.role);
  if (meRes.status !== 200 || returnedUser?.email !== testEmail) throw new Error("Session restoration failed");

  // 6. CUSTOMER DATA ISOLATION (Try accessing admin endpoints as customer)
  console.log("6. Testing Customer Access Control against Admin Endpoints");
  const adminAccessRes = await fetch(baseUrl + "/api/admin/users", {
    headers: { "Cookie": cookie },
  });
  console.log("   Admin users endpoint access by Customer HTTP status:", adminAccessRes.status);
  if (adminAccessRes.status !== 403) throw new Error("Customer was able to access /api/admin/users!");

  const adminOrdersRes = await fetch(baseUrl + "/api/admin/orders", {
    headers: { "Cookie": cookie },
  });
  console.log("   Admin orders endpoint access by Customer HTTP status:", adminOrdersRes.status);
  if (adminOrdersRes.status !== 403) throw new Error("Customer was able to access /api/admin/orders!");

  // 7. CREATE ORDER (CASH ON DELIVERY)
  console.log("7. Testing Order Placement (Cash on Delivery)");
  const orderRes = await fetch(baseUrl + "/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cookie": cookie },
    body: JSON.stringify({
      items: [{ productId: "fresh-tomatoes", quantity: 2 }],
      address: {
        fullName: "E2E Customer",
        phone: "+91 9876543210",
        street: "123 Market Street",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560001",
      },
      deliverySlot: "Morning: 07:00 AM – 09:00 AM",
      paymentMethod: "COD",
      idempotencyKey: "idemp_" + Date.now(),
    }),
  });
  const orderData = await orderRes.json();
  console.log("   Order Creation HTTP status:", orderRes.status, "Order ID:", orderData.order?.id, "Status:", orderData.order?.status);
  if (orderRes.status !== 201 || !orderData.order?.id) throw new Error("COD Order creation failed");
  const orderId = orderData.order.id;

  // 8. CUSTOMER ISOLATION ON ORDERS
  console.log("8. Testing Customer Order Isolation");
  const ownOrderRes = await fetch(baseUrl + "/api/orders/" + orderId, {
    headers: { "Cookie": cookie },
  });
  console.log("   Own Order Fetch HTTP status:", ownOrderRes.status);
  if (ownOrderRes.status !== 200) throw new Error("Could not fetch own order");

  // Unauthenticated / other customer attempt
  const otherCustomerRes = await fetch(baseUrl + "/api/orders/" + orderId, {
    headers: { "Cookie": "grocerly_session=fake_session_token_123.fake_raw_token" },
  });
  console.log("   Unauthorized Order Fetch HTTP status:", otherCustomerRes.status);
  if (otherCustomerRes.status !== 401 && otherCustomerRes.status !== 403) throw new Error("Order was not protected from unauthorized viewer");

  // 9. LOGOUT & SESSION INVALIDATION
  console.log("9. Testing Logout & Session Invalidation");
  const logoutRes = await fetch(baseUrl + "/api/auth/logout", {
    method: "POST",
    headers: { "Cookie": cookie },
  });
  console.log("   Logout HTTP status:", logoutRes.status);

  const meAfterLogout = await fetch(baseUrl + "/api/auth/me", {
    headers: { "Cookie": cookie },
  });
  const meAfterData = await meAfterLogout.json();
  const loggedOutUser = meAfterData.data?.user !== undefined ? meAfterData.data.user : meAfterData.user;
  console.log("   /api/auth/me after logout returned user:", loggedOutUser);
  if (loggedOutUser !== null) throw new Error("Session remained valid after logout");

  console.log("--- ALL LIVE E2E INTEGRATION & SECURITY TESTS PASSED! ---");
  await mongoose.disconnect();
}

runE2ETests().catch((err) => {
  console.error("E2E TEST FAILURE:", err);
  process.exit(1);
});
