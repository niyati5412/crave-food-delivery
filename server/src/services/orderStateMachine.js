const { ORDER_STATUS, ALLOWED_TRANSITIONS, ROLES } = require('../config/constants');
const Restaurant = require('../models/Restaurant');
const Settlement = require('../models/Settlement');
const { releasePartner } = require('./partnerAssignmentService');

/**
 * Validates whether the user is authorized to perform the requested status transition on this order.
 */
async function validateTransition({ order, nextStatus, user, note = '', otp = null }) {
  const normalizedNext = nextStatus === 'on_the_way' ? ORDER_STATUS.OUT_FOR_DELIVERY : nextStatus;
  const currentStatus = order.status;

  // 1. Check if the transition is defined in the state machine
  const allowedNext = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowedNext || !allowedNext[normalizedNext]) {
    const error = new Error(`Invalid status transition from "${currentStatus}" to "${nextStatus}".`);
    error.statusCode = 400;
    throw error;
  }

  // 2. Check if the user's role is allowed for this transition
  const allowedRoles = allowedNext[normalizedNext];
  if (!allowedRoles.includes(user.role)) {
    const error = new Error(`Role "${user.role}" is not permitted to transition order from "${currentStatus}" to "${nextStatus}".`);
    error.statusCode = 403;
    throw error;
  }

  // 3. Resource ownership checks
  if (user.role === ROLES.RESTAURANT) {
    const restaurant = await Restaurant.findById(order.restaurantId);
    if (!restaurant || restaurant.ownerId.toString() !== user._id.toString()) {
      const error = new Error('Unauthorized: You do not own the restaurant associated with this order.');
      error.statusCode = 403;
      throw error;
    }
  } else if (user.role === ROLES.DELIVERY_PARTNER) {
    const assignedPartnerId = (order.partnerId?._id || order.partnerId)?.toString();
    if (!assignedPartnerId || assignedPartnerId !== user._id.toString()) {
      const error = new Error('Unauthorized: You are not the assigned delivery partner for this order.');
      error.statusCode = 403;
      throw error;
    }
  } else if (user.role === ROLES.CUSTOMER) {
    const customerIdStr = (order.customerId?._id || order.customerId)?.toString();
    if (customerIdStr !== user._id.toString()) {
      const error = new Error('Unauthorized: You can only update your own orders.');
      error.statusCode = 403;
      throw error;
    }
    if (nextStatus === ORDER_STATUS.CANCELLED && currentStatus !== ORDER_STATUS.PLACED) {
      const error = new Error('Orders cannot be cancelled once accepted by the kitchen.');
      error.statusCode = 400;
      throw error;
    }
  }

  // 4. Delivery OTP verification
  if (normalizedNext === ORDER_STATUS.DELIVERED) {
    if (user.role === ROLES.DELIVERY_PARTNER) {
      if (!otp || String(otp).trim() !== String(order.deliveryOtp).trim()) {
        const error = new Error(`Invalid delivery verification OTP. The customer's 4-digit code is required.`);
        error.statusCode = 400;
        throw error;
      }
    } else if (user.role === ROLES.ADMIN) {
      if (otp !== undefined && otp !== null && String(otp).trim() !== String(order.deliveryOtp).trim()) {
        const error = new Error(`Invalid delivery verification OTP.`);
        error.statusCode = 400;
        throw error;
      }
    }
  }

  return true;
}

/**
 * Executes the state transition and updates the order status history.
 */
async function transitionOrder({ order, nextStatus, user, note = '', prepTimeMins = null, otp = null }) {
  const normalizedNext = nextStatus === 'on_the_way' ? ORDER_STATUS.OUT_FOR_DELIVERY : nextStatus;
  await validateTransition({ order, nextStatus: normalizedNext, user, note, otp });

  const previousStatus = order.status;
  order.status = normalizedNext;

  if (prepTimeMins && user.role === ROLES.RESTAURANT) {
    order.prepTimeMins = Number(prepTimeMins);
    order.estimatedDeliveryTime = new Date(Date.now() + (Number(prepTimeMins) + 20) * 60000);
  }

  // Add to status history
  order.statusHistory.push({
    status: normalizedNext,
    actor: {
      userId: user._id,
      role: user.role,
      name: user.name
    },
    timestamp: new Date(),
    note: note || `Order transition from ${previousStatus} to ${nextStatus}`
  });

  // Release partner if order terminated
  if (nextStatus === ORDER_STATUS.DELIVERED || nextStatus === ORDER_STATUS.CANCELLED || nextStatus === ORDER_STATUS.REJECTED) {
    if (order.partnerId) {
      const partnerIdToRelease = order.partnerId._id || order.partnerId;
      await releasePartner(partnerIdToRelease);
    }
  }

  // Create settlement record when delivered
  if (nextStatus === ORDER_STATUS.DELIVERED) {
    order.deliveredAt = new Date();
    try {
      const gross = order.amountBreakup.totalAmount;
      const commission = Math.round(order.amountBreakup.itemSubtotal * 0.15 * 100) / 100; // 15% platform commission on food
      const net = Math.round((order.amountBreakup.itemSubtotal - commission) * 100) / 100;

      await Settlement.findOneAndUpdate(
        { orderId: order._id },
        {
          restaurantId: order.restaurantId,
          orderId: order._id,
          grossAmount: gross,
          platformCommission: commission,
          netSettlementAmount: net,
          settlementStatus: 'settled',
          settledAt: new Date()
        },
        { upsert: true, new: true }
      );
    } catch (settleErr) {
      console.error('[Settlement] Failed to record settlement:', settleErr.message);
    }
  }

  await order.save();
  return order;
}

module.exports = {
  validateTransition,
  transitionOrder
};
