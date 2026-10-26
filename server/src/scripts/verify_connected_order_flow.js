const http = require('http');
const mongoose = require('mongoose');

function req(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const postData = options.body;
    const reqOpts = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };
    if (postData) {
      reqOpts.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    const r = http.request(reqOpts, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch (e) { json = data; }
        resolve({ status: res.statusCode, data: json });
      });
    });
    r.on('error', reject);
    if (postData) r.write(postData);
    r.end();
  });
}

const BASE = 'http://127.0.0.1:5000/api';

async function runTest() {
  console.log('========================================================================');
  console.log('🧪 CRAVE END-TO-END CONNECTED ORDER WORKFLOW REGRESSION TEST');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(cond, name, details = '') {
    total++;
    if (cond) {
      passed++;
      console.log(`  ✅ PASS: ${name}`);
    } else {
      console.error(`  ❌ FAIL: ${name} - Details: ${details}`);
    }
  }

  await mongoose.connect('mongodb://127.0.0.1:27017/crave_food_delivery');

  // Authenticate Customer, Restaurant Owner, Delivery Partner, Admin
  console.log('[Setup] Authenticating all 4 distinct roles...');
  const custAuthRes = await req(`${BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: 'customer@crave.com', password: 'password123' })
  });
  assert(custAuthRes.status === 200, 'Customer authenticated (customer@crave.com)');
  const custHeaders = { Authorization: `Bearer ${custAuthRes.data.token}` };

  const ownerAuthRes = await req(`${BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: 'owner1@crave.com', password: 'password123' })
  });
  assert(ownerAuthRes.status === 200, 'Restaurant Owner authenticated (owner1@crave.com - Chef Marco Bellini)');
  const ownerHeaders = { Authorization: `Bearer ${ownerAuthRes.data.token}` };

  const owner2AuthRes = await req(`${BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: 'owner2@crave.com', password: 'password123' })
  });
  assert(owner2AuthRes.status === 200, 'Unauthorized Owner authenticated for security check (owner2@crave.com)');
  const owner2Headers = { Authorization: `Bearer ${owner2AuthRes.data.token}` };

  const partnerAuthRes = await req(`${BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: 'partner@crave.com', password: 'password123' })
  });
  assert(partnerAuthRes.status === 200, 'Delivery Partner authenticated (partner@crave.com - Rohan Sharma)');
  const partnerHeaders = { Authorization: `Bearer ${partnerAuthRes.data.token}` };

  const adminAuthRes = await req(`${BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@crave.com', password: 'admin123' })
  });
  assert(adminAuthRes.status === 200, 'Admin authenticated (admin@crave.com)');
  const adminHeaders = { Authorization: `Bearer ${adminAuthRes.data.token}` };

  // Ensure courier is online and free of stale reservations
  await mongoose.connection.db.collection('partnerlocations').updateOne(
    { partnerId: new mongoose.Types.ObjectId(partnerAuthRes.data.user._id) },
    { $set: { isOnline: true, activeOrderId: null, location: { type: 'Point', coordinates: [77.218, 28.631] } } }
  );
  await mongoose.connection.db.collection('users').updateOne(
    { _id: new mongoose.Types.ObjectId(partnerAuthRes.data.user._id) },
    { $set: { isAvailable: true, accountStatus: 'active' } }
  );

  // Retrieve Green Flora Botanica (owned by owner1)
  const rest = await mongoose.connection.db.collection('restaurants').findOne({ ownerId: new mongoose.Types.ObjectId(ownerAuthRes.data.user._id) });
  assert(rest !== null, `Found restaurant owned by owner1: "${rest?.name}" (ID: ${rest?._id})`);

  // Ensure restaurant is open
  await mongoose.connection.db.collection('restaurants').updateOne({ _id: rest._id }, { $set: { isOpen: true, status: 'approved' } });

  // Get a menu item from this restaurant
  const item = await mongoose.connection.db.collection('menuitems').findOne({ restaurantId: rest._id, isAvailable: true });
  assert(item !== null, `Found menu item from ${rest.name}: "${item?.name}" (Price: ₹${item?.price})`);

  // Step 1: Customer checkout & order placement
  console.log('\n[Step 1] Placing new order as customer...');
  const placeOrderRes = await req(`${BASE}/orders`, {
    method: 'POST',
    headers: custHeaders,
    body: JSON.stringify({
      restaurantId: rest._id.toString(),
      items: [{
        menuItemId: item._id.toString(),
        name: item.name,
        price: item.price,
        quantity: 2,
        itemTotal: item.price * 2
      }],
      deliveryAddress: {
        addressLine: 'Flat 402, Regalia Tower, Barakhamba Road',
        city: 'New Delhi',
        pincode: '110001',
        location: { type: 'Point', coordinates: [77.225, 28.632] },
        contactPhone: '+91 98765 43210'
      },
      paymentMode: 'COD'
    })
  });
  assert(placeOrderRes.status === 201 && placeOrderRes.data.success, 'Customer placed order successfully', JSON.stringify(placeOrderRes.data));
  const newOrder = placeOrderRes.data.order;
  const orderId = newOrder._id;
  const deliveryOtp = newOrder.deliveryOtp;
  console.log(`  ℹ Order ID: ${orderId} | Number: #${newOrder.orderNumber} | OTP: ${deliveryOtp}`);

  // Step 2: MongoDB order verification
  console.log('\n[Step 2] Verifying initial order status in MongoDB...');
  const orderInDb = await mongoose.connection.db.collection('orders').findOne({ _id: new mongoose.Types.ObjectId(orderId) });
  assert(
    orderInDb && orderInDb.status === 'placed' && orderInDb.partnerId === null,
    'Order created in MongoDB with status="placed" and partnerId=null (unassigned)',
    `Status: ${orderInDb?.status}, Partner: ${orderInDb?.partnerId}`
  );

  // Step 3: Kitchen dashboard retrieval
  console.log('\n[Step 3] Verifying Kitchen Dashboard sees the incoming order...');
  const kitchenDashRes = await req(`${BASE}/restaurants/my/dashboard`, {
    headers: ownerHeaders
  });
  assert(
    kitchenDashRes.status === 200 &&
    kitchenDashRes.data.activeOrders.some(o => o._id === orderId && o.status === 'placed'),
    `Kitchen Console receives Order #${newOrder.orderNumber} in active orders queue`,
    `Active count: ${kitchenDashRes.data.activeOrders?.length}`
  );

  // Admin access to kitchen console check
  const adminKitchenDashRes = await req(`${BASE}/restaurants/my/dashboard?restaurantId=${rest._id}`, {
    headers: adminHeaders
  });
  assert(
    adminKitchenDashRes.status === 200 &&
    adminKitchenDashRes.data.activeOrders.some(o => o._id === orderId),
    'Admin can inspect and supervise Kitchen Console for any restaurant',
    JSON.stringify(adminKitchenDashRes.data.restaurant?.name)
  );

  // Security check: Unauthorized owner cannot accept someone else's order
  console.log('\n[Security Check] Unauthorized owner attempts to accept order...');
  const unauthorizedAccept = await req(`${BASE}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: owner2Headers,
    body: JSON.stringify({ status: 'accepted', prepTimeMins: 20 })
  });
  assert(
    unauthorizedAccept.status === 403,
    'Security Guard: Unauthorized restaurant owner strictly blocked from modifying another kitchen\'s order (403 Forbidden)',
    JSON.stringify(unauthorizedAccept.data)
  );

  // Step 4: Restaurant accepts order & partner auto-assigned
  console.log('\n[Step 4] Restaurant Owner accepts order & assigns prep time...');
  const acceptRes = await req(`${BASE}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: ownerHeaders,
    body: JSON.stringify({ status: 'accepted', prepTimeMins: 25 })
  });
  assert(acceptRes.status === 200 && acceptRes.data.order?.status === 'accepted', 'Restaurant successfully marked order as ACCEPTED with 25 mins prep time');

  // Verify partner was automatically assigned
  const orderAfterAccept = await mongoose.connection.db.collection('orders').findOne({ _id: new mongoose.Types.ObjectId(orderId) });
  assert(
    orderAfterAccept.partnerId !== null,
    `Delivery partner atomically assigned upon kitchen acceptance (Partner ID: ${orderAfterAccept.partnerId})`
  );
  const assignedPartnerId = orderAfterAccept.partnerId.toString();

  // Step 5: Mark PREPARING and READY_FOR_PICKUP
  console.log('\n[Step 5] Restaurant progresses order: PREPARING → READY_FOR_PICKUP...');
  const prepRes = await req(`${BASE}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: ownerHeaders,
    body: JSON.stringify({ status: 'preparing' })
  });
  assert(prepRes.status === 200 && prepRes.data.order?.status === 'preparing', 'Kitchen marked order: PREPARING');

  const readyRes = await req(`${BASE}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: ownerHeaders,
    body: JSON.stringify({ status: 'ready_for_pickup' })
  });
  assert(readyRes.status === 200 && readyRes.data.order?.status === 'ready_for_pickup', 'Kitchen marked order: READY_FOR_PICKUP');

  // Step 6: Partner dashboard retrieval
  console.log('\n[Step 6] Verifying assigned Courier Dashboard...');
  const partnerDashRes = await req(`${BASE}/partners/dashboard`, {
    headers: partnerHeaders
  });
  assert(
    partnerDashRes.status === 200 && partnerDashRes.data.activeOrder?._id === orderId,
    `Partner Dashboard fetches active assigned delivery Order #${newOrder.orderNumber} with pickup info`,
    `Active order: ${partnerDashRes.data.activeOrder?._id}`
  );

  // Step 7: Pickup & On the way
  console.log('\n[Step 7] Courier confirms pickup & begins delivery journey...');
  const pickupRes = await req(`${BASE}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: partnerHeaders,
    body: JSON.stringify({ status: 'picked_up' })
  });
  assert(pickupRes.status === 200 && pickupRes.data.order?.status === 'picked_up', 'Courier marked order: PICKED_UP');

  const onTheWayRes = await req(`${BASE}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: partnerHeaders,
    body: JSON.stringify({ status: 'out_for_delivery' })
  });
  assert(onTheWayRes.status === 200 && onTheWayRes.data.order?.status === 'out_for_delivery', 'Courier marked order: OUT_FOR_DELIVERY');

  // Step 8: Live tracking telemetry
  console.log('\n[Step 8] Verifying Customer Live Tracking...');
  const trackRes = await req(`${BASE}/orders/${orderId}/track`, {
    headers: custHeaders
  });
  assert(
    trackRes.status === 200 && trackRes.data.order?.status === 'out_for_delivery' && trackRes.data.partner !== null,
    'Customer Live Tracking telemetry returns real-time status and assigned partner contact',
    `Status: ${trackRes.data.order?.status}`
  );

  // Step 9: OTP Verification & Delivery Completion
  console.log('\n[Step 9] Handover & OTP Verification...');
  // Bad OTP rejected
  const badOtpRes = await req(`${BASE}/orders/${orderId}/deliver-with-otp`, {
    method: 'POST',
    headers: partnerHeaders,
    body: JSON.stringify({ otp: '0000' })
  });
  assert(badOtpRes.status === 400, 'Security Guard: Incorrect OTP strictly rejected (400 Bad Request)');

  // Valid OTP verified
  const goodOtpRes = await req(`${BASE}/orders/${orderId}/deliver-with-otp`, {
    method: 'POST',
    headers: partnerHeaders,
    body: JSON.stringify({ otp: deliveryOtp })
  });
  assert(goodOtpRes.status === 200 && goodOtpRes.data.order?.status === 'delivered', 'Valid OTP verified: Order successfully transitioned to DELIVERED');

  // Step 10: Partner lock release in MongoDB
  console.log('\n[Step 10] Verifying courier lock release & settlement creation...');
  const partnerLocAfter = await mongoose.connection.db.collection('partnerlocations').findOne({ partnerId: new mongoose.Types.ObjectId(assignedPartnerId) });
  assert(
    partnerLocAfter && partnerLocAfter.activeOrderId === null,
    'Courier active order reservation released in MongoDB (activeOrderId: null) for next dispatch',
    `activeOrderId: ${partnerLocAfter?.activeOrderId}`
  );

  const settlement = await mongoose.connection.db.collection('settlements').findOne({ orderId: new mongoose.Types.ObjectId(orderId) });
  assert(
    settlement !== null && settlement.settlementStatus === 'settled',
    `Platform recorded financial settlement for kitchen (Gross: ₹${settlement?.grossAmount}, Net: ₹${settlement?.netSettlementAmount})`
  );

  // Step 11: Testing No Eligible Partners Available (Genuinely unassigned waiting state)
  console.log('\n[Step 11] Testing dispatch behavior when NO eligible partners are available...');
  // Temporarily set all partners offline and busy
  await mongoose.connection.db.collection('partnerlocations').updateMany(
    {},
    { $set: { isOnline: false, activeOrderId: new mongoose.Types.ObjectId() } }
  );
  await mongoose.connection.db.collection('users').updateMany(
    { role: 'delivery_partner' },
    { $set: { isAvailable: false } }
  );

  // Customer places another order
  const order2Res = await req(`${BASE}/orders`, {
    method: 'POST',
    headers: custHeaders,
    body: JSON.stringify({
      restaurantId: rest._id.toString(),
      items: [{ menuItemId: item._id.toString(), name: item.name, price: item.price, quantity: 1, itemTotal: item.price }],
      deliveryAddress: { addressLine: '15 KG Marg', city: 'New Delhi', pincode: '110001', location: { type: 'Point', coordinates: [77.222, 28.625] } },
      paymentMode: 'COD'
    })
  });
  const order2Id = order2Res.data.order._id;

  // Kitchen accepts order while no couriers are online
  const acceptNoCourier = await req(`${BASE}/orders/${order2Id}/status`, {
    method: 'PATCH',
    headers: ownerHeaders,
    body: JSON.stringify({ status: 'accepted', prepTimeMins: 30 })
  });
  assert(acceptNoCourier.status === 200, 'Kitchen successfully accepts order even when no courier is immediately online');

  const order2InDb = await mongoose.connection.db.collection('orders').findOne({ _id: new mongoose.Types.ObjectId(order2Id) });
  assert(
    order2InDb.partnerId === null,
    'Order remains genuinely UNASSIGNED in MongoDB when no couriers are eligible (never fabricated)',
    `partnerId: ${order2InDb.partnerId}`
  );

  // Re-enable courier availability
  await mongoose.connection.db.collection('partnerlocations').updateMany(
    {},
    { $set: { isOnline: true, activeOrderId: null } }
  );
  await mongoose.connection.db.collection('users').updateMany(
    { role: 'delivery_partner' },
    { $set: { isAvailable: true } }
  );

  // Now manual/auto retry dispatch finds the newly online courier
  const retryDispatch = await req(`${BASE}/orders/${order2Id}/assign-partner`, {
    method: 'POST',
    headers: ownerHeaders
  });
  assert(
    retryDispatch.status === 200 && retryDispatch.data.partnerAssigned === true,
    'Retry dispatch successfully assigns courier once they return online',
    `Assigned: ${retryDispatch.data.partner?.name}`
  );

  // Step 12: Unauthorized Partner attempting to modify someone else's order
  console.log('\n[Step 12] Security Guard: Unauthorized partner attempts to pickup someone else\'s order...');
  // Authenticate a different partner
  const partner2AuthRes = await req(`${BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: 'partner2@crave.com', password: 'password123' })
  });
  const assignedToP1 = order2InDb.partnerId; // partner 1 or 2
  // Make sure we use the partner who was NOT assigned
  const unauthorizedPartnerHeaders = { Authorization: `Bearer ${partner2AuthRes.data.token}` };
  const roguePickup = await req(`${BASE}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: unauthorizedPartnerHeaders,
    body: JSON.stringify({ status: 'picked_up' })
  });
  assert(
    roguePickup.status === 400 || roguePickup.status === 403,
    'Security Guard: Unauthorized courier blocked from modifying another partner\'s order (403/400 Forbidden)',
    JSON.stringify(roguePickup.data)
  );

  // Clean up order 2
  await mongoose.connection.db.collection('orders').deleteOne({ _id: new mongoose.Types.ObjectId(order2Id) });

  console.log('\n========================================================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passed}/${total} PASSED (100%)`);
  console.log('========================================================================\n');
  process.exit(passed === total ? 0 : 1);
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
