const API_BASE = 'http://localhost:5000/api';

async function req(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runRegressionSuite() {
  console.log('====================================================');
  console.log('🧪 STARTING CRAVE COMPREHENSIVE REGRESSION TEST SUITE');
  console.log('====================================================\n');

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
    // 1. Authenticate Customer & Restaurant Owner
    console.log('[1] Testing Authentication for Customer & Restaurant Owner...');
    const custLogin = await req(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'customer@crave.com', password: 'password123' })
    });
    const customerToken = custLogin.data?.token;
    assert(customerToken && custLogin.data?.user?.role === 'customer', 'Customer login successful');

    const ownerLogin = await req(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'owner1@crave.com', password: 'password123' })
    });
    const ownerToken = ownerLogin.data?.token;
    assert(ownerToken && ownerLogin.data?.user?.role === 'restaurant', 'Restaurant Owner login successful');

    // 2. Fetch Restaurants & Inspect Menu
    console.log('\n[2] Testing Restaurant & Menu Retrieval...');
    const restRes = await req(`${API_BASE}/restaurants`);
    const restaurants = restRes.data?.data || [];
    assert(restaurants.length >= 10, `Retrieved ${restaurants.length} kitchens (>= 10 expected)`);

    const sampleKitchen = restaurants[0];
    console.log(`    Inspecting menu for "${sampleKitchen.name}" (${sampleKitchen._id})...`);
    const detailRes = await req(`${API_BASE}/restaurants/${sampleKitchen._id}`);
    const menuItems = detailRes.data?.menuItems || [];
    assert(menuItems.length >= 7, `Kitchen has ${menuItems.length} menu items (>= 7 expected)`);

    const categories = Object.keys(detailRes.data?.categories || {});
    assert(categories.length >= 3, `Menu spans ${categories.length} categories: [${categories.join(', ')}]`);

    // 3. Test Location-Aware Nearby Discovery
    console.log('\n[3] Testing Location-Aware Discovery Filtering...');
    // Query near Connaught Place (Delhi cluster)
    const delhiQuery = await req(`${API_BASE}/restaurants/nearby?lat=28.6315&lng=77.2167&radius=10`);
    assert(delhiQuery.data?.count > 0, `Discovery near Central Delhi (28.6315, 77.2167) returned ${delhiQuery.data?.count} kitchens`);

    // Query far away (e.g., Mumbai coords)
    const mumbaiQuery = await req(`${API_BASE}/restaurants/nearby?lat=19.0760&lng=72.8777&radius=5`);
    assert(mumbaiQuery.data?.count === 0, `Discovery in unserved area (Mumbai coords) correctly returned 0 kitchens`);

    // 4. Test Serviceability Verification Endpoint
    console.log('\n[4] Testing Authoritative Delivery Serviceability Check...');
    const serviceablePin = sampleKitchen.serviceablePincodes[0];
    const unserviceablePin = '400050'; // Bandra, Mumbai

    // 4a. Valid PIN inside service area
    const checkValid = await req(`${API_BASE}/restaurants/${sampleKitchen._id}/check-serviceability`, {
      method: 'POST',
      body: JSON.stringify({
        pincode: serviceablePin,
        coordinates: sampleKitchen.location.coordinates
      })
    });
    assert(checkValid.data?.serviceable === true, `Address with PIN ${serviceablePin} is marked serviceable (ETA: ${checkValid.data?.estimatedDeliveryMins}m, Fee: ₹${checkValid.data?.deliveryFee})`);

    // 4b. Valid PIN outside service area
    const checkInvalid = await req(`${API_BASE}/restaurants/${sampleKitchen._id}/check-serviceability`, {
      method: 'POST',
      body: JSON.stringify({
        pincode: unserviceablePin,
        coordinates: [72.8777, 19.0760] // Mumbai
      })
    });
    assert(
      checkInvalid.data?.serviceable === false &&
      checkInvalid.data?.message?.includes('does not deliver to your selected address yet'),
      `Out-of-zone PIN ${unserviceablePin} correctly blocked with exact message: "${checkInvalid.data?.message}"`
    );

    // 4c. Invalid PIN format (malformed)
    const checkMalformed = await req(`${API_BASE}/restaurants/${sampleKitchen._id}/check-serviceability`, {
      method: 'POST',
      body: JSON.stringify({
        pincode: '123'
      })
    });
    assert(
      checkMalformed.data?.serviceable === false &&
      (checkMalformed.data?.code === 'INVALID_PINCODE_FORMAT' || checkMalformed.data?.message?.includes('Invalid postal PIN code')),
      `Malformed PIN '123' correctly rejected with message: "${checkMalformed.data?.message}"`
    );

    // 5. Test Payment Safety and Order Creation Safeguards
    console.log('\n[5] Testing Payment Safety & Order Placement Safeguards...');
    const targetItem = menuItems[0];
    const orderItems = [{
      menuItemId: targetItem._id,
      name: targetItem.name,
      price: targetItem.price,
      quantity: 2
    }];

    // 5a. Block order creation to unserviceable address
    const blockedOrder = await req(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        restaurantId: sampleKitchen._id,
        items: orderItems,
        deliveryAddress: {
          addressLine: 'Bandra West Promenade',
          city: 'Mumbai',
          pincode: unserviceablePin,
          coordinates: [72.8777, 19.0760]
        },
        paymentMode: 'COD'
      })
    });
    assert(
      blockedOrder.status === 400 && blockedOrder.data?.message?.includes('does not deliver to your selected address yet'),
      `Backend authoritatively blocked order creation to unserviceable PIN (${blockedOrder.data?.message})`
    );

    // 5b. Block ONLINE order marked as paid without payment verification
    const fraudulentOnline = await req(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        restaurantId: sampleKitchen._id,
        items: orderItems,
        deliveryAddress: {
          addressLine: 'Barakhamba Road',
          city: 'New Delhi',
          pincode: serviceablePin,
          coordinates: sampleKitchen.location.coordinates
        },
        paymentMode: 'ONLINE',
        paymentStatus: 'paid' // Client claiming paid without token
      })
    });
    assert(
      fraudulentOnline.status === 400 || fraudulentOnline.status === 402,
      `Backend rejected unauthorized ONLINE order without valid payment verification token (Status: ${fraudulentOnline.status})`
    );

    // 5c. Place valid ONLINE order with sandbox simulated payment verification token
    const onlineOrderRes = await req(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        restaurantId: sampleKitchen._id,
        items: orderItems,
        deliveryAddress: {
          addressLine: 'Barakhamba Road, Connaught Place',
          city: 'New Delhi',
          pincode: serviceablePin,
          coordinates: sampleKitchen.location.coordinates
        },
        paymentMode: 'ONLINE',
        paymentReference: {
          transactionId: 'pay_sim_' + Date.now(),
          razorpayOrderId: 'order_sim_' + Date.now(),
          isSimulated: true
        }
      })
    });
    const createdOnlineOrder = onlineOrderRes.data?.order || onlineOrderRes.data?.data;
    assert(
      onlineOrderRes.ok && createdOnlineOrder?._id && createdOnlineOrder?.paymentStatus === 'paid' && createdOnlineOrder?.paymentMode === 'ONLINE',
      `Valid ONLINE order with sandbox simulation verified and created: Order ID ${createdOnlineOrder?._id} (Payment: ${createdOnlineOrder?.paymentStatus})`
    );

    // 5d. Place valid COD order
    const codOrderRes = await req(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        restaurantId: sampleKitchen._id,
        items: orderItems,
        deliveryAddress: {
          addressLine: 'Regal Building, Connaught Place',
          city: 'New Delhi',
          pincode: serviceablePin,
          coordinates: sampleKitchen.location.coordinates
        },
        paymentMode: 'COD'
      })
    });
    const createdCodOrder = codOrderRes.data?.order || codOrderRes.data?.data;
    assert(
      codOrderRes.ok && createdCodOrder?._id && createdCodOrder?.paymentStatus === 'pending' && createdCodOrder?.paymentMode === 'COD',
      `Valid COD order created with paymentStatus='pending': Order ID ${createdCodOrder?._id}`
    );

    // 6. Test Restaurant Service-Area Management API
    console.log('\n[6] Testing Restaurant Service-Area Management API...');
    const newRadius = 8.5;
    const newPincodes = ['110001', '110002', '110003', '110005'];
    const updateRes = await req(`${API_BASE}/restaurants/my/service-area`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        deliveryRadiusKm: newRadius,
        serviceablePincodes: newPincodes
      })
    });
    const updatedRadius = updateRes.data?.deliveryRadiusKm || updateRes.data?.data?.deliveryRadiusKm;
    const updatedPins = updateRes.data?.serviceablePincodes || updateRes.data?.data?.serviceablePincodes;
    assert(
      updateRes.ok && updatedRadius === newRadius && updatedPins?.includes('110005'),
      `Owner successfully updated service area: radius ${updatedRadius}km, PIN codes [${updatedPins?.join(', ')}]`
    );

    console.log('\n====================================================');
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('Test suite encountered an unhandled error:', error);
    process.exit(1);
  }
}

runRegressionSuite();
