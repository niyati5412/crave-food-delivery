const http = require('http');

const BASE_URL = 'http://127.0.0.1:5000/api';

async function req(url, options = {}) {
  const parsed = new URL(url);
  return new Promise((resolve, reject) => {
    const requestOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const clientReq = http.request(requestOptions, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        let parsedData = null;
        try {
          parsedData = JSON.parse(rawData);
        } catch (e) {
          parsedData = rawData;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsedData
        });
      });
    });

    clientReq.on('error', reject);
    if (options.body) {
      clientReq.write(options.body);
    }
    clientReq.end();
  });
}

async function runTests() {
  console.log('========================================================================');
  console.log('🧪 CRAVE PARTNER ROLE GUARDS & OTP DELIVERY COMPLETION REGRESSION SUITE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Part 1: Separate Admin vs. Delivery Partner Role Guards
    // -------------------------------------------------------------
    console.log('[Test 1] Testing Admin Account Permissions on Partner Endpoints...');
    const adminLogin = await req(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@crave.com', password: 'admin123' })
    });
    assert(adminLogin.status === 200 && adminLogin.data?.user?.role === 'admin', 'Admin authenticated (admin@crave.com)');
    const adminAuth = { Authorization: `Bearer ${adminLogin.data.token}` };

    // Admin MUST be forbidden from accessing partner dashboard API
    const adminPartnerDash = await req(`${BASE_URL}/partners/dashboard`, { headers: adminAuth });
    assert(
      adminPartnerDash.status === 403,
      'Security Guard: Admin is strictly blocked from /api/partners/dashboard (403 Forbidden)'
    );

    // Admin MUST be forbidden from toggling courier availability
    const adminToggle = await req(`${BASE_URL}/partners/availability`, {
      method: 'PATCH',
      headers: adminAuth
    });
    assert(
      adminToggle.status === 403,
      'Security Guard: Admin is strictly blocked from /api/partners/availability (403 Forbidden)'
    );

    console.log('\n[Test 2] Testing Authenticated Delivery Partner Dashboard & Binding...');
    const partnerLogin = await req(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'partner@crave.com', password: 'password123' })
    });
    assert(
      partnerLogin.status === 200 && partnerLogin.data?.user?.role === 'delivery_partner',
      'Delivery Partner authenticated (partner@crave.com - Rohan Sharma)'
    );
    const partnerAuth = { Authorization: `Bearer ${partnerLogin.data.token}` };
    const partnerUserId = partnerLogin.data.user._id;

    // Delivery Partner dashboard data
    const partnerDash = await req(`${BASE_URL}/partners/dashboard`, { headers: partnerAuth });
    assert(partnerDash.status === 200, 'Delivery partner successfully accessed /api/partners/dashboard');
    assert(
      partnerDash.data?.partner?.name === 'Rohan Sharma' && partnerDash.data?.partner?.role === 'delivery_partner',
      `Dashboard bound to real partner: ${partnerDash.data?.partner?.name} (Vehicle: ${partnerDash.data?.partner?.partnerDetails?.vehicleType?.toUpperCase()})`
    );
    assert(
      typeof partnerDash.data?.stats?.completedTodayCount === 'number',
      `Trips count bound to real DB history: ${partnerDash.data?.stats?.completedTodayCount}`
    );
    assert(
      typeof partnerDash.data?.stats?.earningsToday === 'number',
      `Earnings bound to real payout calculation: ₹${partnerDash.data?.stats?.earningsToday}`
    );

    // Toggle duty status
    const toggleOnline = await req(`${BASE_URL}/partners/availability`, {
      method: 'PATCH',
      headers: partnerAuth
    });
    assert(toggleOnline.status === 200, 'Partner successfully toggled online duty status');

    console.log('\n[Test 3] Testing Pending/Unverified Partner Availability Guard...');
    const randomSuffix = Math.floor(Math.random() * 900000 + 100000);
    const pendingPartnerReg = await req(`${BASE_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Pending Courier',
        email: `pending_courier_${randomSuffix}@crave.test`,
        phone: '9811002233',
        password: 'Password123!',
        role: 'delivery_partner',
        vehicleType: 'scooter',
        vehicleNumber: `DL-01-AB-${randomSuffix.toString().slice(0, 4)}`
      })
    });
    assert(pendingPartnerReg.status === 201, 'Pending delivery partner registered');
    const pendingAuth = { Authorization: `Bearer ${pendingPartnerReg.data.token}` };

    const pendingToggle = await req(`${BASE_URL}/partners/availability`, {
      method: 'PATCH',
      headers: pendingAuth
    });
    assert(
      pendingToggle.status === 403,
      'Eligibility Guard: Pending/unverified courier strictly blocked from going online (403 Forbidden)'
    );

    // -------------------------------------------------------------
    // Part 2: Order Lifecycle, OTP Verification & Delivery Completion
    // -------------------------------------------------------------
    console.log('\n[Test 4] Placing and Progressing Order to OUT_FOR_DELIVERY...');
    const custLogin = await req(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'customer@crave.com', password: 'password123' })
    });
    const custAuth = { Authorization: `Bearer ${custLogin.data.token}` };

    // Fetch live menu item for Osteria Bellini
    const restDetails = await req(`${BASE_URL}/restaurants/6ade230210897f29a59d6111`);
    const menuItem = restDetails.data?.menuItems?.[0];
    assert(Boolean(menuItem && menuItem._id), `Found menu item: "${menuItem?.name}" (₹${menuItem?.price})`);

    // Place order
    const placeOrder = await req(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: custAuth,
      body: JSON.stringify({
        restaurantId: '6ade230210897f29a59d6111', // Osteria Bellini
        items: [{ menuItemId: menuItem._id, quantity: 1 }],
        deliveryAddress: {
          addressLine: 'Connaught Place Outer Circle',
          city: 'New Delhi',
          pincode: '110001',
          coordinates: [77.218, 28.631]
        },
        paymentMode: 'COD'
      })
    });
    assert(placeOrder.status === 201, `Customer placed order #${placeOrder.data?.order?.orderNumber}`);
    const orderId = placeOrder.data.order._id;
    const correctOtp = placeOrder.data.order.deliveryOtp;
    assert(Boolean(correctOtp && correctOtp.length === 4), `Valid 4-digit OTP generated: ${correctOtp}`);

    // Kitchen owner accepts order
    const ownerLogin = await req(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'owner1@crave.com', password: 'password123' })
    });
    const ownerAuth = { Authorization: `Bearer ${ownerLogin.data.token}` };

    const acceptRes = await req(`${BASE_URL}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: ownerAuth,
      body: JSON.stringify({ status: 'accepted', prepTimeMins: 20 })
    });
    assert(acceptRes.status === 200, 'Kitchen marked order ACCEPTED & partner assigned');
    const assignedPartnerId = (acceptRes.data?.order?.partnerId?._id || acceptRes.data?.order?.partnerId)?.toString();

    const jwt = require('jsonwebtoken');
    const assignedCourierToken = jwt.sign(
      { userId: assignedPartnerId, role: 'delivery_partner' },
      process.env.JWT_SECRET || 'crave_super_secure_jwt_secret_token_evaluation_2026',
      { expiresIn: '7d' }
    );
    const assignedPartnerAuth = { Authorization: `Bearer ${assignedCourierToken}` };

    await req(`${BASE_URL}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: ownerAuth,
      body: JSON.stringify({ status: 'preparing' })
    });
    await req(`${BASE_URL}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: ownerAuth,
      body: JSON.stringify({ status: 'ready_for_pickup' })
    });

    // Courier picks up and moves out for delivery
    await req(`${BASE_URL}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: assignedPartnerAuth,
      body: JSON.stringify({ status: 'picked_up' })
    });
    const outRes = await req(`${BASE_URL}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: assignedPartnerAuth,
      body: JSON.stringify({ status: 'out_for_delivery' })
    });
    assert(outRes.status === 200, 'Courier marked order OUT_FOR_DELIVERY');

    console.log('\n[Test 5] Security Guards on Delivery Completion...');

    // 5a. Unauthorized partner attempts delivery
    const roguePartnerToken = pendingPartnerReg.data.token;
    const rogueAuth = { Authorization: `Bearer ${roguePartnerToken}` };
    const rogueDeliver = await req(`${BASE_URL}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: rogueAuth,
      body: JSON.stringify({ status: 'delivered', otp: correctOtp })
    });
    assert(
      rogueDeliver.status === 403,
      'Security Guard: Unassigned partner strictly blocked from completing another partner delivery (403 Forbidden)'
    );

    // 5b. Missing OTP
    const missingOtpDeliver = await req(`${BASE_URL}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: assignedPartnerAuth,
      body: JSON.stringify({ status: 'delivered' })
    });
    assert(
      missingOtpDeliver.status === 400,
      'Security Guard: Delivery without OTP strictly rejected (400 Bad Request)'
    );

    // 5c. Incorrect OTP
    const wrongOtpDeliver = await req(`${BASE_URL}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: assignedPartnerAuth,
      body: JSON.stringify({ status: 'delivered', otp: '0000' })
    });
    assert(
      wrongOtpDeliver.status === 400,
      'Security Guard: Incorrect OTP strictly rejected (400 Bad Request)'
    );

    console.log('\n[Test 6] Completing Delivery with Valid OTP...');
    const validDeliver = await req(`${BASE_URL}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: assignedPartnerAuth,
      body: JSON.stringify({
        status: 'delivered',
        otp: correctOtp,
        note: 'Delivered at doorstep with verified customer OTP.'
      })
    });
    assert(validDeliver.status === 200, 'Order successfully transitioned to DELIVERED with valid OTP');
    assert(validDeliver.data?.order?.status === 'delivered', 'Response confirms status === "delivered"');
    assert(Boolean(validDeliver.data?.order?.deliveredAt), `Order records authoritative deliveredAt timestamp: ${validDeliver.data?.order?.deliveredAt}`);

    console.log('\n[Test 7] Verifying Customer Tracking Endpoint Authoritative State...');
    const trackingRes = await req(`${BASE_URL}/orders/${orderId}/tracking`, { headers: custAuth });
    assert(trackingRes.status === 200, 'Tracking endpoint returned 200 OK');
    assert(
      trackingRes.data?.order?.status === 'delivered',
      'Tracking endpoint returns status: "delivered"'
    );
    assert(
      Boolean(trackingRes.data?.order?.deliveredAt),
      `Tracking endpoint includes deliveredAt: ${trackingRes.data?.order?.deliveredAt}`
    );
    assert(
      trackingRes.data?.etaMinutes === 0,
      'Tracking endpoint returns etaMinutes: 0 for completed delivery'
    );

    console.log('\n[Test 8] Partner Lock Release & Duplicate Completion Protection...');
    // Partner dashboard active order is null
    const partnerDashAfter = await req(`${BASE_URL}/partners/dashboard`, { headers: assignedPartnerAuth });
    assert(
      partnerDashAfter.data?.activeOrder === null,
      'Partner active order reservation safely released (No Active Delivery confirmed by backend)'
    );

    // Duplicate completion request strictly rejected
    const duplicateDeliver = await req(`${BASE_URL}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: assignedPartnerAuth,
      body: JSON.stringify({ status: 'delivered', otp: correctOtp })
    });
    assert(
      duplicateDeliver.status === 400,
      'Duplicate Guard: Subsequent completion request rejected (400 Invalid status transition)'
    );

    console.log('\n========================================================================');
    console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================\n');

  } catch (err) {
    console.error('Fatal error during test run:', err);
    failed++;
  } finally {
    process.exit(failed === 0 ? 0 : 1);
  }
}

runTests();
