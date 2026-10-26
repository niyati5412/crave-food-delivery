const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const http = require('http');
const app = require('../app');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const { calculateAuthoritativeOrder } = require('../services/pricingService');
const { transitionOrder } = require('../services/orderStateMachine');
const { ORDER_STATUS, ROLES } = require('../config/constants');

let server;
let baseUrl;

test.before(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crave_food_delivery');
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}/api`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
});

test('1. API Health Check', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, 'healthy');
});

test('2. Auth: Login with valid seeded customer credentials', async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'customer@crave.com',
      password: 'password123'
    })
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.token);
  assert.strictEqual(data.user.role, 'customer');
});

test('3. Auth: Login fails with invalid password', async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'customer@crave.com',
      password: 'wrong_password_xyz'
    })
  });

  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.strictEqual(data.success, false);
});

test('4. Geospatial Search: 2dsphere index $near discovery returns sorted restaurants', async () => {
  // Query near Connaught Place (lat: 28.6328, lng: 77.2205)
  const res = await fetch(`${baseUrl}/restaurants/nearby?lat=28.6328&lng=77.2205&radius=10`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(data.data.length > 0);
  // First restaurant should be Osteria Bellini because it's right at this coordinate
  assert.strictEqual(data.data[0].name, 'Osteria Bellini');
  assert.ok(data.data[0].distanceKm !== undefined);
});

test('5. Single-Restaurant Cart Validation & Server-Side Pricing', async () => {
  const rBellini = await Restaurant.findOne({ name: 'Osteria Bellini' });
  const items = await MenuItem.find({ restaurantId: rBellini._id });
  assert.ok(items.length >= 2);

  const cartItems = [
    { menuItemId: items[0]._id, quantity: 2, selectedAddOns: items[0].addOns.slice(0, 1) },
    { menuItemId: items[1]._id, quantity: 1, selectedAddOns: [] }
  ];

  const pricing = await calculateAuthoritativeOrder({
    restaurantId: rBellini._id,
    items: cartItems,
    distanceKm: 2.5
  });

  assert.ok(pricing.amountBreakup.totalAmount > 0);
  assert.strictEqual(pricing.processedItems.length, 2);
  assert.strictEqual(pricing.amountBreakup.deliveryFee, 35); // <= 3km base fee
});

test('6. Single-Restaurant Cart Enforced: Items from different restaurant rejected', async () => {
  const rBellini = await Restaurant.findOne({ name: 'Osteria Bellini' });
  const rUmami = await Restaurant.findOne({ name: 'Umami Ramen & Robata' });
  const itemBellini = await MenuItem.findOne({ restaurantId: rBellini._id });
  const itemUmami = await MenuItem.findOne({ restaurantId: rUmami._id });

  const mixedCart = [
    { menuItemId: itemBellini._id, quantity: 1 },
    { menuItemId: itemUmami._id, quantity: 1 }
  ];

  await assert.rejects(
    async () => {
      await calculateAuthoritativeOrder({
        restaurantId: rBellini._id,
        items: mixedCart,
        distanceKm: 3
      });
    },
    (err) => {
      assert.strictEqual(err.statusCode, 400);
      assert.ok(err.message.includes('Single-restaurant cart enforced'));
      return true;
    }
  );
});

test('7. Order State Machine: Valid status transitions by authorized roles', async () => {
  const customer = await User.findOne({ email: 'customer@crave.com' });
  const owner = await User.findOne({ email: 'owner1@crave.com' });
  const partner = await User.findOne({ email: 'partner@crave.com' });
  const restaurant = await Restaurant.findOne({ ownerId: owner._id });
  const item = await MenuItem.findOne({ restaurantId: restaurant._id });

  // Create test order
  const testOrder = await Order.create({
    customerId: customer._id,
    restaurantId: restaurant._id,
    partnerId: partner._id,
    items: [{
      menuItemId: item._id,
      name: item.name,
      price: item.price,
      quantity: 1,
      selectedAddOns: [],
      itemTotal: item.price
    }],
    amountBreakup: {
      itemSubtotal: item.price,
      deliveryFee: 35,
      tax: 25,
      packagingFee: 20,
      discount: 0,
      totalAmount: item.price + 80
    },
    deliveryAddress: {
      addressLine: customer.addresses[0].addressLine,
      city: customer.addresses[0].city,
      pincode: customer.addresses[0].pincode,
      contactPhone: customer.phone,
      location: customer.addresses[0].location
    },
    status: ORDER_STATUS.PLACED,
    paymentMode: 'COD',
    paymentStatus: 'pending'
  });

  // Stage 1: Restaurant accepts order
  const acceptedOrder = await transitionOrder({
    order: testOrder,
    nextStatus: ORDER_STATUS.ACCEPTED,
    user: owner,
    note: 'Order accepted'
  });
  assert.strictEqual(acceptedOrder.status, ORDER_STATUS.ACCEPTED);

  // Stage 2: Restaurant starts preparing
  const prepOrder = await transitionOrder({
    order: testOrder,
    nextStatus: ORDER_STATUS.PREPARING,
    user: owner,
    prepTimeMins: 20
  });
  assert.strictEqual(prepOrder.status, ORDER_STATUS.PREPARING);

  // Stage 3: Restaurant marks ready for pickup
  const readyOrder = await transitionOrder({
    order: testOrder,
    nextStatus: ORDER_STATUS.READY_FOR_PICKUP,
    user: owner
  });
  assert.strictEqual(readyOrder.status, ORDER_STATUS.READY_FOR_PICKUP);

  // Stage 4: Partner picks up order
  const pickedOrder = await transitionOrder({
    order: testOrder,
    nextStatus: ORDER_STATUS.PICKED_UP,
    user: partner
  });
  assert.strictEqual(pickedOrder.status, ORDER_STATUS.PICKED_UP);

  // Stage 5: Partner sets out for delivery
  const outOrder = await transitionOrder({
    order: testOrder,
    nextStatus: ORDER_STATUS.OUT_FOR_DELIVERY,
    user: partner
  });
  assert.strictEqual(outOrder.status, ORDER_STATUS.OUT_FOR_DELIVERY);

  // Stage 6: Partner delivers order
  const deliveredOrder = await transitionOrder({
    order: testOrder,
    nextStatus: ORDER_STATUS.DELIVERED,
    user: partner
  });
  assert.strictEqual(deliveredOrder.status, ORDER_STATUS.DELIVERED);

  // Clean up
  await Order.findByIdAndDelete(testOrder._id);
});

test('8. Order State Machine: Unauthorized role transition is rejected', async () => {
  const customer = await User.findOne({ email: 'customer@crave.com' });
  const owner = await User.findOne({ email: 'owner1@crave.com' });
  const restaurant = await Restaurant.findOne({ ownerId: owner._id });
  const item = await MenuItem.findOne({ restaurantId: restaurant._id });

  const testOrder = await Order.create({
    customerId: customer._id,
    restaurantId: restaurant._id,
    items: [{
      menuItemId: item._id,
      name: item.name,
      price: item.price,
      quantity: 1,
      selectedAddOns: [],
      itemTotal: item.price
    }],
    amountBreakup: {
      itemSubtotal: item.price,
      deliveryFee: 35,
      tax: 25,
      packagingFee: 20,
      discount: 0,
      totalAmount: item.price + 80
    },
    deliveryAddress: {
      addressLine: customer.addresses[0].addressLine,
      city: customer.addresses[0].city,
      pincode: customer.addresses[0].pincode,
      contactPhone: customer.phone,
      location: customer.addresses[0].location
    },
    status: ORDER_STATUS.PLACED,
    paymentMode: 'COD'
  });

  // Customer cannot transition order to 'accepted' or 'delivered'
  await assert.rejects(
    async () => {
      await transitionOrder({
        order: testOrder,
        nextStatus: ORDER_STATUS.DELIVERED,
        user: customer
      });
    },
    (err) => {
      assert.strictEqual(err.statusCode, 400); // Invalid transition from placed to delivered
      return true;
    }
  );

  await Order.findByIdAndDelete(testOrder._id);
});
