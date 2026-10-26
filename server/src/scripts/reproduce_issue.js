const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const { io: ioClient } = require(path.resolve(__dirname, '../../../client/node_modules/socket.io-client'));

const BASE_URL = 'http://127.0.0.1:5000/api';
const SOCKET_URL = 'http://127.0.0.1:5000';

async function req(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function reproduce() {
  console.log('--- REPRODUCING NEW CUSTOMER ORDER WORKFLOW ---');

  // 1. Register a NEW customer
  const randomSuffix = Math.floor(Math.random() * 100000);
  const newEmail = `freshcust_${randomSuffix}@test.com`;
  console.log(`\n[1] Registering new customer: ${newEmail}`);

  const regRes = await req(`${BASE_URL}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Fresh Customer',
      email: newEmail,
      phone: '9876543210',
      password: 'password123'
    })
  });
  console.log('Register response:', regRes.status, regRes.data?.success);
  const customerToken = regRes.data?.token;
  const newCustomerId = regRes.data?.user?._id;

  // 2. Login as Restaurant Owner to get restaurant details & connect socket
  console.log('\n[2] Logging in as Restaurant Owner (owner1@crave.com)...');
  const ownerLogin = await req(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: 'owner1@crave.com',
      password: 'password123'
    })
  });
  const ownerToken = ownerLogin.data?.token;

  // Fetch restaurant dashboard
  const ownerDashBefore = await req(`${BASE_URL}/restaurants/my/dashboard`, {
    headers: { Authorization: `Bearer ${ownerToken}` }
  });
  const restaurantId = ownerDashBefore.data?.restaurant?._id;
  console.log(`Restaurant ID: ${restaurantId}, Owner Restaurant Name: ${ownerDashBefore.data?.restaurant?.name}`);
  console.log(`Active orders before new order: ${ownerDashBefore.data?.activeOrders?.length}`);

  // Connect owner socket and join restaurant room
  const ownerSocket = ioClient(SOCKET_URL, {
    auth: { token: ownerToken },
    transports: ['websocket']
  });

  let ownerReceivedNewOrder = null;
  ownerSocket.on('connect', () => {
    console.log('[Owner Socket] Connected, joining restaurant room:', restaurantId);
    ownerSocket.emit('join:restaurant', { restaurantId });
  });

  ownerSocket.on('order:new', (data) => {
    console.log('🔥 [Owner Socket] RECEIVED order:new!', data.order?._id, data.message);
    ownerReceivedNewOrder = data;
  });

  ownerSocket.on('error:unauthorized', (err) => {
    console.error('❌ [Owner Socket] UNAUTHORIZED to join restaurant room!', err);
  });

  // 3. Connect Partner socket
  console.log('\n[3] Logging in as Partner (partner@crave.com)...');
  const partnerLogin = await req(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: 'partner@crave.com',
      password: 'password123'
    })
  });
  const partnerToken = partnerLogin.data?.token;
  const partnerUser = partnerLogin.data?.user;
  console.log(`Partner role in token user: ${partnerUser?.role}`);

  const partnerDashBefore = await req(`${BASE_URL}/partners/dashboard`, {
    headers: { Authorization: `Bearer ${partnerToken}` }
  });
  console.log('Partner activeOrder before:', partnerDashBefore.data?.activeOrder?._id || 'None');

  const partnerSocket = ioClient(SOCKET_URL, {
    auth: { token: partnerToken },
    transports: ['websocket']
  });

  let partnerReceivedAssigned = null;
  partnerSocket.on('connect', () => {
    console.log('[Partner Socket] Connected. User role:', partnerUser?.role);
  });

  partnerSocket.on('order:assigned', (data) => {
    console.log('🔥 [Partner Socket] RECEIVED order:assigned!', data.order?._id);
    partnerReceivedAssigned = data;
  });

  // 4. Connect Admin socket
  console.log('\n[4] Logging in as Admin (admin@crave.com)...');
  const adminLogin = await req(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@crave.com',
      password: 'admin123'
    })
  });
  const adminToken = adminLogin.data?.token;
  const adminDashBefore = await req(`${BASE_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log(`Admin stats before: totalOrders=${adminDashBefore.data?.stats?.totalOrders}, recentOrders=${adminDashBefore.data?.recentOrders?.length}`);

  // Wait 1 second for sockets to connect & join rooms
  await new Promise(r => setTimeout(r, 1000));

  // 5. Get menu item for restaurant
  const restDetails = await req(`${BASE_URL}/restaurants/${restaurantId}`);
  const menuItem = restDetails.data?.menuItems?.[0];
  console.log(`Menu item to order: ${menuItem?.name} (₹${menuItem?.price})`);

  // 6. Customer places order
  console.log('\n[5] Customer placing order with POST /api/orders...');
  const orderRes = await req(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      restaurantId,
      items: [{
        menuItemId: menuItem._id,
        quantity: 2
      }],
      deliveryAddress: {
        addressLine: 'Flat 402, High View Apartments',
        city: 'New Delhi',
        pincode: '110001',
        contactPhone: '9876543210',
        location: {
          type: 'Point',
          coordinates: [77.2167, 28.6315]
        }
      },
      paymentMode: 'COD'
    })
  });

  console.log('Order creation status:', orderRes.status, orderRes.data?.success);
  const createdOrder = orderRes.data?.order;
  if (!createdOrder) {
    console.error('Failed to create order:', orderRes.data);
    ownerSocket.close();
    partnerSocket.close();
    process.exit(1);
  }
  console.log(`Created Order #${createdOrder.orderNumber} (ID: ${createdOrder._id})`);

  // Wait 1.5 seconds for socket event propagation
  await new Promise(r => setTimeout(r, 1500));

  console.log('\n[6] Checking Restaurant Dashboard & Socket:');
  console.log(` - Did owner socket receive order:new? ${ownerReceivedNewOrder ? 'YES' : 'NO'}`);
  const ownerDashAfter = await req(`${BASE_URL}/restaurants/my/dashboard`, {
    headers: { Authorization: `Bearer ${ownerToken}` }
  });
  const orderInOwnerDash = ownerDashAfter.data?.activeOrders?.some(o => o._id === createdOrder._id);
  console.log(` - Is new order in GET /restaurants/my/dashboard activeOrders? ${orderInOwnerDash ? 'YES' : 'NO'}`);

  console.log('\n[7] Checking Admin Dashboard:');
  const adminDashAfter = await req(`${BASE_URL}/admin/stats`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const orderInAdminDash = adminDashAfter.data?.recentOrders?.some(o => o._id === createdOrder._id);
  console.log(` - Is new order in GET /admin/stats recentOrders? ${orderInAdminDash ? 'YES' : 'NO'}`);
  console.log(` - Admin total orders: ${adminDashAfter.data?.stats?.totalOrders}`);

  console.log('\n[8] Restaurant accepts order...');
  const acceptRes = await req(`${BASE_URL}/orders/${createdOrder._id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      status: 'accepted',
      prepTimeMins: 20
    })
  });
  console.log('Order accept status:', acceptRes.status, acceptRes.data?.message);
  console.log('Partner assigned in response:', acceptRes.data?.partnerAssigned);
  console.log('Partner ID on accepted order:', acceptRes.data?.order?.partnerId);

  // Wait 1.5s for partner socket event
  await new Promise(r => setTimeout(r, 1500));

  console.log('\n[9] Checking Delivery Partner Dashboard & Socket:');
  console.log(` - Did partner socket receive order:assigned? ${partnerReceivedAssigned ? 'YES' : 'NO'}`);
  const partnerDashAfter = await req(`${BASE_URL}/partners/dashboard`, {
    headers: { Authorization: `Bearer ${partnerToken}` }
  });
  console.log(` - Is order in GET /partners/dashboard activeOrder? ${partnerDashAfter.data?.activeOrder?._id === createdOrder._id ? 'YES' : 'NO'}`);
  console.log(` - Partner activeOrder ID: ${partnerDashAfter.data?.activeOrder?._id}`);

  ownerSocket.close();
  partnerSocket.close();
  process.exit(0);
}

reproduce().catch(err => {
  console.error('Reproduction failed with error:', err);
  process.exit(1);
});
