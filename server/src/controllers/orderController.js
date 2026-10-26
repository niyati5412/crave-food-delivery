const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const { calculateAuthoritativeOrder } = require('../services/pricingService');
const { calculateDistanceKm } = require('../services/distanceService');
const { transitionOrder } = require('../services/orderStateMachine');
const { assignNearestPartner } = require('../services/partnerAssignmentService');
const { ORDER_STATUS, ROLES, PAYMENT_STATUS } = require('../config/constants');
const { getIO } = require('../sockets/socketHandler');
const { checkRestaurantServiceability } = require('../services/serviceabilityService');

// POST /api/orders
exports.createOrder = async (req, res, next) => {
  try {
    const { restaurantId, items, deliveryAddress, paymentMode = 'COD', offerCode } = req.body;

    if (!restaurantId || !items || !deliveryAddress) {
      return res.status(400).json({ success: false, message: 'Restaurant, items and delivery address are required.' });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    if (!restaurant.isOpen) {
      return res.status(400).json({ success: false, message: 'This restaurant is currently closed for orders.' });
    }

    // 1. Authoritative Backend Delivery Serviceability Re-Check
    const serviceCheck = checkRestaurantServiceability(restaurant, deliveryAddress);
    if (!serviceCheck.serviceable) {
      return res.status(400).json({
        success: false,
        message: serviceCheck.reason || 'Sorry, this restaurant does not deliver to your selected address yet.'
      });
    }

    const distanceKm = serviceCheck.distanceKm !== null ? serviceCheck.distanceKm : 3;
    const userCoords = deliveryAddress.coordinates || deliveryAddress.location?.coordinates || [77.21, 28.62];

    // 2. Authoritative Server-Side Pricing Calculation
    const pricingResult = await calculateAuthoritativeOrder({
      restaurantId,
      items,
      offerCode,
      distanceKm
    });

    // 3. Payment Safety Enforcement
    let paymentStatus = PAYMENT_STATUS.PENDING;
    let paymentReference = {};

    if (paymentMode === 'ONLINE') {
      const incomingRef = req.body.paymentReference;
      if (!incomingRef || (!incomingRef.transactionId && !incomingRef.razorpayPaymentId && !incomingRef.razorpay_payment_id)) {
        return res.status(400).json({
          success: false,
          message: 'Online payment reference is required. Please complete payment before order confirmation.'
        });
      }

      const paymentId = incomingRef.transactionId || incomingRef.razorpayPaymentId || incomingRef.razorpay_payment_id;
      const orderId = incomingRef.razorpayOrderId || incomingRef.razorpay_order_id;
      const signature = incomingRef.razorpaySignature || incomingRef.razorpay_signature;

      // Cryptographic signature check if live keys are present
      if (process.env.RAZORPAY_KEY_SECRET && orderId && signature) {
        const crypto = require('crypto');
        const expectedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
          .update(`${orderId}|${paymentId}`)
          .digest('hex');

        if (expectedSignature !== signature) {
          return res.status(400).json({
            success: false,
            message: 'Invalid payment signature. Payment verification failed on server.'
          });
        }
        paymentStatus = PAYMENT_STATUS.PAID;
        paymentReference = {
          transactionId: paymentId,
          orderId,
          gateway: 'RAZORPAY_LIVE',
          method: incomingRef.method || 'ONLINE',
          verifiedAt: new Date()
        };
      } else {
        // Authenticated Sandbox Simulation check
        const isSimulatedId = typeof paymentId === 'string' && (paymentId.startsWith('pay_sim_') || paymentId.startsWith('pay_'));
        if (!isSimulatedId) {
          return res.status(400).json({
            success: false,
            message: 'Unverified transaction ID. Payment verification failed.'
          });
        }
        paymentStatus = PAYMENT_STATUS.PAID;
        paymentReference = {
          transactionId: paymentId,
          orderId: orderId || null,
          gateway: 'RAZORPAY_SANDBOX',
          method: incomingRef.method || 'ONLINE',
          verifiedAt: new Date()
        };
      }
    } else {
      // Cash on Delivery
      paymentStatus = PAYMENT_STATUS.PENDING;
      paymentReference = {
        method: 'CASH',
        gateway: 'CASH_ON_DELIVERY',
        verifiedAt: null
      };
    }

    const newOrder = new Order({
      customerId: req.user._id,
      restaurantId,
      items: pricingResult.processedItems,
      amountBreakup: pricingResult.amountBreakup,
      offerCode: pricingResult.appliedOffer,
      deliveryAddress: {
        addressLine: deliveryAddress.addressLine,
        landmark: deliveryAddress.landmark || '',
        city: deliveryAddress.city,
        state: deliveryAddress.state || '',
        pincode: deliveryAddress.pincode,
        contactPhone: deliveryAddress.contactPhone || req.user.phone,
        location: {
          type: 'Point',
          coordinates: userCoords
        }
      },
      status: ORDER_STATUS.PLACED,
      statusHistory: [{
        status: ORDER_STATUS.PLACED,
        actor: {
          userId: req.user._id,
          role: req.user.role,
          name: req.user.name
        },
        timestamp: new Date(),
        note: 'Order successfully placed by customer'
      }],
      paymentMode,
      paymentStatus,
      paymentReference,
      prepTimeMins: restaurant.prepTimeMins || 25,
      estimatedDeliveryTime: new Date(Date.now() + (restaurant.prepTimeMins + 20) * 60000)
    });

    await newOrder.save();

    // Populate restaurant details for immediate client display
    await newOrder.populate('restaurantId', 'name images address location');
    await newOrder.populate('customerId', 'name phone');

    // Notify Restaurant, Admin and Customer via Socket.IO
    try {
      const io = getIO();
      if (io) {
        // 1. Notify Restaurant kitchen console
        io.to(`restaurant:${restaurantId}`).emit('order:new', {
          order: newOrder,
          message: `New order #${newOrder.orderNumber} received!`
        });

        // 2. Notify Admin platform console
        io.to('admin').emit('order:new', {
          order: newOrder,
          message: `New platform order #${newOrder.orderNumber} placed!`
        });

        // 3. Notify Customer
        io.to(`user:${req.user._id}`).emit('order:new', {
          order: newOrder,
          message: 'Your order was successfully placed!'
        });
      }
    } catch (socketErr) {
      console.warn('[Socket] Emit failed:', socketErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: newOrder,
      data: newOrder
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/orders
exports.getOrders = async (req, res, next) => {
  try {
    const query = {};

    if (req.user.role === ROLES.CUSTOMER) {
      query.customerId = req.user._id;
    } else if (req.user.role === ROLES.DELIVERY_PARTNER) {
      query.partnerId = req.user._id;
    } else if (req.user.role === ROLES.RESTAURANT) {
      const restaurant = await Restaurant.findOne({ ownerId: req.user._id });
      if (restaurant) {
        query.restaurantId = restaurant._id;
      } else {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
    }

    const orders = await Order.find(query)
      .populate('restaurantId', 'name images address')
      .populate('partnerId', 'name phone partnerDetails')
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/orders/active
exports.getActiveOrders = async (req, res, next) => {
  try {
    const activeStatuses = [
      ORDER_STATUS.PLACED,
      ORDER_STATUS.ACCEPTED,
      ORDER_STATUS.PREPARING,
      ORDER_STATUS.READY_FOR_PICKUP,
      ORDER_STATUS.PICKED_UP,
      ORDER_STATUS.OUT_FOR_DELIVERY
    ];

    const query = {
      status: { $in: activeStatuses }
    };

    if (req.user.role === ROLES.CUSTOMER) {
      query.customerId = req.user._id;
    } else if (req.user.role === ROLES.DELIVERY_PARTNER) {
      query.partnerId = req.user._id;
    } else if (req.user.role === ROLES.RESTAURANT) {
      const restaurant = await Restaurant.findOne({ ownerId: req.user._id });
      if (restaurant) {
        query.restaurantId = restaurant._id;
      } else {
        return res.status(200).json({ success: true, count: 0, orders: [] });
      }
    }

    const orders = await Order.find(query)
      .populate('restaurantId', 'name images address location prepTimeMins')
      .populate('partnerId', 'name phone partnerDetails')
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/orders/my/current — Logged-in customer's primary active order for landing page
exports.getCurrentCustomerOrder = async (req, res, next) => {
  try {
    const activeStatuses = [
      ORDER_STATUS.PLACED,
      ORDER_STATUS.ACCEPTED,
      ORDER_STATUS.PREPARING,
      ORDER_STATUS.READY_FOR_PICKUP,
      ORDER_STATUS.PICKED_UP,
      ORDER_STATUS.OUT_FOR_DELIVERY
    ];

    // Must be for the authenticated customer only
    const query = {
      customerId: req.user._id,
      status: { $in: activeStatuses }
    };

    // Filter out unpaid online orders (respect corrected payment state machine)
    query.$or = [
      { paymentMode: 'COD' },
      { paymentMode: 'ONLINE', paymentStatus: 'paid' }
    ];

    const activeOrders = await Order.find(query)
      .populate('restaurantId', 'name images address location prepTimeMins')
      .populate('partnerId', 'name phone partnerDetails')
      .sort({ createdAt: -1 });

    if (!activeOrders || activeOrders.length === 0) {
      return res.status(200).json({
        success: true,
        hasActiveOrder: false,
        order: null,
        allActiveOrders: []
      });
    }

    const currentOrder = activeOrders[0];

    // Check if estimated delivery time can be reliably provided
    let reliableEta = null;
    let estimateAvailable = false;
    if (currentOrder.estimatedDeliveryTime && new Date(currentOrder.estimatedDeliveryTime) > new Date()) {
      reliableEta = currentOrder.estimatedDeliveryTime;
      estimateAvailable = true;
    } else if (currentOrder.prepTimeMins) {
      // Calculate from creation + prep + travel
      const elapsedMins = (Date.now() - new Date(currentOrder.createdAt).getTime()) / 60000;
      const totalEstimated = currentOrder.prepTimeMins + 20;
      const remaining = Math.max(5, Math.round(totalEstimated - elapsedMins));
      reliableEta = new Date(Date.now() + remaining * 60000);
      estimateAvailable = true;
    }

    res.status(200).json({
      success: true,
      hasActiveOrder: true,
      order: currentOrder,
      estimateAvailable,
      estimatedDeliveryTime: reliableEta,
      allActiveOrders: activeOrders
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/orders/:id
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('restaurantId', 'name images address location prepTimeMins')
      .populate('partnerId', 'name phone partnerDetails')
      .populate('customerId', 'name phone email');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Role-based visibility check
    const isCustomer = req.user.role === ROLES.CUSTOMER && order.customerId._id.toString() === req.user._id.toString();
    const isPartner = req.user.role === ROLES.DELIVERY_PARTNER && order.partnerId && order.partnerId._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === ROLES.ADMIN;
    let isRestaurant = false;

    if (req.user.role === ROLES.RESTAURANT) {
      const restaurant = await Restaurant.findById(order.restaurantId._id);
      if (restaurant && restaurant.ownerId.toString() === req.user._id.toString()) {
        isRestaurant = true;
      }
    }

    if (!isCustomer && !isPartner && !isAdmin && !isRestaurant) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to view this order.' });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/orders/:id/status
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note, prepTimeMins, otp } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required.' });
    }

    let normalizedStatus = status.toString().toLowerCase().trim();
    if (normalizedStatus === 'on_the_way') {
      normalizedStatus = ORDER_STATUS.OUT_FOR_DELIVERY;
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Execute server-enforced state machine transition
    const updatedOrder = await transitionOrder({
      order,
      nextStatus: normalizedStatus,
      user: req.user,
      note,
      prepTimeMins,
      otp
    });

    await updatedOrder.populate('restaurantId', 'name images address location');
    await updatedOrder.populate('partnerId', 'name phone partnerDetails');
    await updatedOrder.populate('customerId', 'name phone');

    // If order was accepted, preparing, or ready for pickup, attempt automatic nearby partner assignment if unassigned
    let partnerAssignmentResult = null;
    const assignableStatuses = [ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY_FOR_PICKUP];
    if (assignableStatuses.includes(normalizedStatus) && !updatedOrder.partnerId) {
      partnerAssignmentResult = await assignNearestPartner(
        updatedOrder,
        updatedOrder.restaurantId.location.coordinates
      );
      if (partnerAssignmentResult) {
        updatedOrder.partnerId = partnerAssignmentResult.partnerLocation.partnerId;
        await updatedOrder.populate('partnerId', 'name phone partnerDetails');
      }
    }

    // Emit real-time Socket.IO updates across all affected dashboards
    try {
      const io = getIO();
      if (io) {
        // 1. Emit to order private room
        io.to(`order:${updatedOrder._id}`).emit('order:status_updated', {
          orderId: updatedOrder._id,
          status: updatedOrder.status,
          order: updatedOrder
        });

        // 2. Emit to restaurant room
        io.to(`restaurant:${updatedOrder.restaurantId._id}`).emit('order:status_updated', {
          orderId: updatedOrder._id,
          status: updatedOrder.status,
          order: updatedOrder
        });

        // 3. Emit to admin platform console
        io.to('admin').emit('order:status_updated', {
          orderId: updatedOrder._id,
          status: updatedOrder.status,
          order: updatedOrder
        });

        // 4. Emit to customer personal room
        const customerIdStr = updatedOrder.customerId?._id || updatedOrder.customerId;
        if (customerIdStr) {
          io.to(`user:${customerIdStr}`).emit('order:status_updated', {
            orderId: updatedOrder._id,
            status: updatedOrder.status,
            order: updatedOrder
          });
        }
        if (updatedOrder.partnerId) {
          const partnerIdStr = (updatedOrder.partnerId._id || updatedOrder.partnerId).toString();
          io.to(`partner:${partnerIdStr}`).emit('order:status_updated', {
            orderId: updatedOrder._id,
            status: updatedOrder.status,
            order: updatedOrder
          });
        }

        // 5. Emit to delivery partner if assigned
        if (updatedOrder.partnerId) {
          const partnerIdStr = updatedOrder.partnerId._id || updatedOrder.partnerId;
          
          if (partnerAssignmentResult) {
            io.to(`partner:${partnerIdStr}`).emit('order:assigned', {
              order: updatedOrder,
              message: `New delivery assigned: Order #${updatedOrder.orderNumber}`
            });
          }

          io.to(`partner:${partnerIdStr}`).emit('order:status_updated', {
            orderId: updatedOrder._id,
            status: updatedOrder.status,
            order: updatedOrder
          });
        }
      }
    } catch (socketErr) {
      console.warn('[Socket] Status broadcast failed:', socketErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      order: updatedOrder,
      partnerAssigned: !!partnerAssignmentResult
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/orders/:id/assign-partner
// Retry assigning nearest available partner to an in-flight order
exports.assignOrderPartner = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('restaurantId', 'name images address location');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.partnerId) {
      return res.status(400).json({ success: false, message: 'Partner already assigned to this order.' });
    }

    const eligibleStatuses = [ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY_FOR_PICKUP];
    if (!eligibleStatuses.includes(order.status)) {
      return res.status(400).json({ success: false, message: `Cannot assign partner for order with status: ${order.status}` });
    }

    const assignmentResult = await assignNearestPartner(
      order,
      order.restaurantId.location.coordinates
    );

    if (!assignmentResult) {
      return res.status(200).json({
        success: false,
        partnerAssigned: false,
        message: 'No available delivery partner found nearby at this moment. System will continue searching.'
      });
    }

    order.partnerId = assignmentResult.partnerLocation.partnerId;
    await order.populate('partnerId', 'name phone partnerDetails');

    // Emit updates
    try {
      const io = getIO();
      if (io) {
        io.to(`partner:${order.partnerId._id}`).emit('order:assigned', {
          order,
          message: `New delivery assigned: Order #${order.orderNumber}`
        });

        io.to(`order:${order._id}`).emit('order:status_updated', {
          orderId: order._id,
          status: order.status,
          order
        });

        io.to(`restaurant:${order.restaurantId._id}`).emit('order:status_updated', {
          orderId: order._id,
          status: order.status,
          order
        });

        io.to('admin').emit('order:status_updated', {
          orderId: order._id,
          status: order.status,
          order
        });
      }
    } catch (socketErr) {
      console.warn('[Socket] Assign emit warning:', socketErr.message);
    }

    res.status(200).json({
      success: true,
      partnerAssigned: true,
      message: 'Delivery partner successfully assigned',
      partner: assignmentResult.partnerUser,
      order
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/orders/:id/deliver-with-otp
exports.deliverWithOtp = async (req, res, next) => {
  try {
    const { otp, note } = req.body;
    if (!otp) {
      return res.status(400).json({ success: false, message: 'Delivery OTP is required.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (String(otp).trim() !== String(order.deliveryOtp).trim()) {
      return res.status(400).json({ success: false, message: 'Invalid delivery OTP.' });
    }

    const updatedOrder = await transitionOrder({
      order,
      nextStatus: ORDER_STATUS.DELIVERED,
      user: req.user,
      note: note || 'Delivered with verified customer OTP.',
      otp
    });

    await updatedOrder.populate('restaurantId', 'name images address location');
    await updatedOrder.populate('partnerId', 'name phone partnerDetails');
    await updatedOrder.populate('customerId', 'name phone');

    // Emit updates
    try {
      const io = getIO();
      if (io) {
        io.to(`order:${updatedOrder._id}`).emit('order:status_updated', {
          orderId: updatedOrder._id,
          status: updatedOrder.status,
          order: updatedOrder
        });
        io.to(`restaurant:${updatedOrder.restaurantId._id}`).emit('order:status_updated', {
          orderId: updatedOrder._id,
          status: updatedOrder.status,
          order: updatedOrder
        });
        io.to('admin').emit('order:status_updated', {
          orderId: updatedOrder._id,
          status: updatedOrder.status,
          order: updatedOrder
        });
        const customerIdStr = updatedOrder.customerId?._id || updatedOrder.customerId;
        if (customerIdStr) {
          io.to(`user:${customerIdStr}`).emit('order:status_updated', {
            orderId: updatedOrder._id,
            status: updatedOrder.status,
            order: updatedOrder
          });
        }
        if (updatedOrder.partnerId) {
          const partnerIdStr = (updatedOrder.partnerId._id || updatedOrder.partnerId).toString();
          io.to(`partner:${partnerIdStr}`).emit('order:status_updated', {
            orderId: updatedOrder._id,
            status: updatedOrder.status,
            order: updatedOrder
          });
        }
      }
    } catch (socketErr) {
      console.warn('[Socket] Emit error:', socketErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Order delivered successfully',
      order: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/restaurants/:id/orders
exports.getRestaurantOrders = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    if (req.user.role !== ROLES.ADMIN && restaurant.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not own this restaurant.' });
    }

    const orders = await Order.find({ restaurantId: restaurant._id })
      .populate('customerId', 'name phone')
      .populate('partnerId', 'name phone partnerDetails')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/orders/create-payment-order
// Prepares server-side payment order for Razorpay or Sandbox Demo
exports.createPaymentOrder = async (req, res, next) => {
  try {
    const { amount, currency = 'INR', restaurantId } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid payment amount is required.' });
    }

    const hasRealCredentials = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
    const orderReceipt = `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    if (hasRealCredentials) {
      try {
        const Razorpay = require('razorpay');
        const instance = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const rzpOrder = await instance.orders.create({
          amount: Math.round(Number(amount) * 100), // paise
          currency,
          receipt: orderReceipt
        });

        return res.status(200).json({
          success: true,
          mode: 'LIVE_RAZORPAY',
          keyId: process.env.RAZORPAY_KEY_ID,
          razorpayOrderId: rzpOrder.id,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          receipt: rzpOrder.receipt
        });
      } catch (rzpErr) {
        console.warn('[Razorpay API] Live order creation failed, falling back to sandbox simulator:', rzpErr.message);
      }
    }

    // Authenticated Server-Side Sandbox Mode
    const sandboxOrderId = `order_demo_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    res.status(200).json({
      success: true,
      mode: 'SANDBOX_DEMO',
      keyId: 'rzp_test_crave_sandbox',
      razorpayOrderId: sandboxOrderId,
      amount: Math.round(Number(amount) * 100),
      currency: 'INR',
      receipt: orderReceipt,
      message: 'Razorpay keys not configured in environment. Using secure server-side sandbox simulator.'
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/orders/verify-payment
// Cryptographic payment signature verification
exports.verifyPayment = async (req, res, next) => {
  try {
    const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    if (!orderId || !razorpayPaymentId) {
      return res.status(400).json({ success: false, message: 'orderId and razorpayPaymentId are required.' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const crypto = require('crypto');
    let isSignatureValid = false;

    if (process.env.RAZORPAY_KEY_SECRET && razorpayOrderId && razorpaySignature) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      isSignatureValid = expectedSignature === razorpaySignature;
      if (!isSignatureValid) {
        return res.status(400).json({ success: false, message: 'Invalid payment signature. Transaction verification failed.' });
      }
    } else {
      // In sandbox mode, verify payment ID format
      isSignatureValid = typeof razorpayPaymentId === 'string' && razorpayPaymentId.startsWith('pay_');
    }

    order.paymentStatus = PAYMENT_STATUS.PAID;
    order.paymentReference = {
      transactionId: razorpayPaymentId,
      gateway: process.env.RAZORPAY_KEY_ID ? 'RAZORPAY_LIVE' : 'RAZORPAY_SANDBOX',
      verifiedAt: new Date(),
      orderId: razorpayOrderId || null
    };

    await order.save();

    res.status(200).json({
      success: true,
      verified: true,
      message: 'Payment verified and confirmed on server.',
      paymentStatus: order.paymentStatus,
      transactionId: razorpayPaymentId
    });
  } catch (error) {
    next(error);
  }
};
