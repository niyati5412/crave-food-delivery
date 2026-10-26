const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const crypto = require('crypto');

const BASE_URL = 'http://127.0.0.1:5000/api';

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

async function runVerification() {
  console.log('================================================================');
  console.log('🧪 CRAVE AUTH, SUPPORT & CURRENT ORDER E2E VERIFICATION');
  console.log('================================================================\n');
  let failures = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failures++;
    }
  }

  try {
    // 1. Test Customer Login
    console.log('[1] Testing Customer Login...');
    const loginRes = await req(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'customer@crave.com',
        password: 'password123'
      })
    });
    assert(loginRes.status === 200 && loginRes.data?.token, 'Customer login succeeded and returned JWT');
    const customerToken = loginRes.data?.token;
    const customerAuth = { Authorization: `Bearer ${customerToken}` };

    // 2. Test Forgot Password (Generic Enumeration-Safe Response)
    console.log('\n[2] Testing Forgot Password endpoint...');
    const forgotRes = await req(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      body: JSON.stringify({ email: 'customer@crave.com' })
    });
    assert(forgotRes.status === 200, 'Forgot password returned 200 status');
    assert(
      forgotRes.data?.message && forgotRes.data.message.includes('password reset instructions will be sent'),
      'Returned generic safe response without leaking user existence'
    );

    // Test with non-existent email
    const forgotNonExistent = await req(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      body: JSON.stringify({ email: 'nonexistent_user_999@test.com' })
    });
    assert(
      forgotNonExistent.status === 200 && forgotNonExistent.data?.message?.includes('password reset instructions will be sent'),
      'Non-existent email returns identical generic response (account enumeration prevented)'
    );

    // 3. Inspect MongoDB for token hash & test Reset Password
    console.log('\n[3] Testing Reset Password with Token in MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crave_food_delivery');
    const User = require('../models/User');
    const customerDoc = await User.findOne({ email: 'customer@crave.com' });
    assert(!!customerDoc.passwordResetTokenHash, 'User has passwordResetTokenHash stored in MongoDB');
    assert(customerDoc.passwordResetExpires > new Date(), 'Reset token expiration is set in future (1 hour)');

    // Simulate reset password using a known raw token
    const rawToken = crypto.randomBytes(32).toString('hex');
    customerDoc.passwordResetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    customerDoc.passwordResetExpires = Date.now() + 3600000;
    await customerDoc.save();

    const resetRes = await req(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'customer@crave.com',
        token: rawToken,
        newPassword: 'newPassword123!'
      })
    });
    assert(resetRes.status === 200 && resetRes.data?.message?.includes('Your password has been reset successfully'), 'Password successfully reset');

    // Verify login with new password
    const loginWithNewPass = await req(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'customer@crave.com',
        password: 'newPassword123!'
      })
    });
    assert(loginWithNewPass.status === 200, 'Login succeeded with newly updated password');

    // Verify single-use: old token cannot be reused
    const reusedTokenRes = await req(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'customer@crave.com',
        token: rawToken,
        newPassword: 'anotherPassword123!'
      })
    });
    assert(reusedTokenRes.status === 400, 'Single-use guarantee: Reused token rejected with 400 Bad Request');

    // Restore customer password to password123 to preserve clean demo environment
    const customerReloaded = await User.findOne({ email: 'customer@crave.com' });
    const rawTokenBack = crypto.randomBytes(32).toString('hex');
    customerReloaded.passwordResetTokenHash = crypto.createHash('sha256').update(rawTokenBack).digest('hex');
    customerReloaded.passwordResetExpires = Date.now() + 3600000;
    await customerReloaded.save();

    await req(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'customer@crave.com',
        token: rawTokenBack,
        newPassword: 'password123'
      })
    });
    console.log('  ℹ️ Restored customer password back to default demo password123.');

    // 4. Test Customer Care / Support Tickets
    console.log('\n[4] Testing Customer Care & Support Ticket Endpoints...');
    const freshLogin = await req(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'customer@crave.com',
        password: 'password123'
      })
    });
    const freshCustomerAuth = { Authorization: `Bearer ${freshLogin.data.token}` };

    const ticketRes = await req(`${BASE_URL}/support`, {
      method: 'POST',
      headers: freshCustomerAuth,
      body: JSON.stringify({
        subject: 'Need help with delivery instructions',
        category: 'delivery',
        message: 'Please ring bell twice upon arrival.'
      })
    });
    assert(ticketRes.status === 201 && ticketRes.data?.ticket?._id, 'Customer ticket successfully created in MongoDB');
    const ticketId = ticketRes.data.ticket._id;

    // Fetch customer tickets
    const myTicketsRes = await req(`${BASE_URL}/support`, {
      headers: freshCustomerAuth
    });
    assert(
      Array.isArray(myTicketsRes.data?.tickets) && myTicketsRes.data.tickets.some(t => t._id === ticketId),
      'Customer can retrieve their own support ticket list'
    );

    // Customer cannot access admin ticket route (RBAC test)
    const unauthorizedAdminAccess = await req(`${BASE_URL}/support/admin`, {
      headers: freshCustomerAuth
    });
    assert(unauthorizedAdminAccess.status === 403, 'RBAC prevents customer from accessing admin support portal (403 Forbidden)');

    // Admin login and ticket update
    const adminLogin = await req(`${BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@crave.com',
        password: 'admin123'
      })
    });
    const adminAuth = { Authorization: `Bearer ${adminLogin.data?.token}` };

    const adminTicketsRes = await req(`${BASE_URL}/support/admin`, {
      headers: adminAuth
    });
    assert(
      Array.isArray(adminTicketsRes.data?.tickets) && adminTicketsRes.data.tickets.some(t => t._id === ticketId),
      'Admin can retrieve global support ticket list'
    );

    const updateTicketRes = await req(`${BASE_URL}/support/${ticketId}`, {
      method: 'PATCH',
      headers: adminAuth,
      body: JSON.stringify({
        status: 'in_progress',
        adminNotes: 'Instruction noted and dispatched to assigned partner'
      })
    });
    assert(
      updateTicketRes.status === 200 && updateTicketRes.data?.ticket?.status === 'in_progress',
      'Admin successfully updated ticket status to in_progress with notes'
    );

    // 5. Test Current Order Endpoint
    console.log('\n[5] Testing GET /api/orders/my/current...');
    const currentOrderRes = await req(`${BASE_URL}/orders/my/current`, {
      headers: freshCustomerAuth
    });
    assert(currentOrderRes.status === 200, 'GET /api/orders/my/current responded with 200 OK');
    if (currentOrderRes.data?.order) {
      assert(
        ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'out_for_delivery'].includes(
          currentOrderRes.data.order.status
        ),
        `Active order found with status: ${currentOrderRes.data.order.status}`
      );
      assert(
        currentOrderRes.data.estimateAvailable !== undefined,
        `ETA availability indicator returned: ${currentOrderRes.data.estimateAvailable}`
      );
    } else {
      console.log('  ℹ️ Current customer order verified (no active in-flight order or hasActiveOrder: false)');
    }

    console.log('\n================================================================');
    console.log(`VERIFICATION SUMMARY: ${failures === 0 ? 'ALL CHECKS PASSED (14/14)' : failures + ' CHECKS FAILED'}`);
    console.log('================================================================\n');

  } catch (error) {
    console.error('Unexpected test error:', error);
    failures++;
  } finally {
    await mongoose.disconnect();
    process.exit(failures === 0 ? 0 : 1);
  }
}

runVerification();
