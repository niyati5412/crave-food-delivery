const PartnerLocation = require('../models/PartnerLocation');
const Order = require('../models/Order');
const User = require('../models/User');
const { getIO } = require('../sockets/socketHandler');

const Review = require('../models/Review');

// In-memory throttling map to prevent overwhelming MongoDB & sockets
// key: partnerId, value: timestamp of last recorded update
const partnerLocationThrottleMap = new Map();

// PATCH /api/partners/availability
exports.toggleAvailability = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role !== 'delivery_partner') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only delivery partners can toggle availability.' });
    }

    // Verify eligibility: account must be active and verified by admin
    if (user.accountStatus !== 'active' || (user.partnerDetails && user.partnerDetails.isVerified === false)) {
      return res.status(403).json({
        success: false,
        message: 'Your partner account is pending admin verification. You cannot go online until approved.'
      });
    }

    user.isAvailable = !user.isAvailable;
    await user.save();

    await PartnerLocation.findOneAndUpdate(
      { partnerId: req.user._id },
      { $set: { isOnline: user.isAvailable, updatedAt: new Date() } },
      { upsert: true }
    );

    res.status(200).json({
      success: true,
      message: `You are now ${user.isAvailable ? 'Online & Ready for orders' : 'Offline / Off-Duty'}`,
      isAvailable: user.isAvailable
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/partners/location
// Accepts live GPS updates from partner mobile/web client with throttling and real-time room broadcast
exports.updateLocation = async (req, res, next) => {
  try {
    const { coordinates, heading = 0, speed = 20, activeOrderId, orderId } = req.body;
    const targetOrderId = activeOrderId || orderId;

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Valid GeoJSON coordinates [longitude, latitude] are required.'
      });
    }

    const [longitude, latitude] = [Number(coordinates[0]), Number(coordinates[1])];
    if (isNaN(longitude) || isNaN(latitude) || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      return res.status(400).json({ success: false, message: 'Invalid geographic coordinates.' });
    }

    const partnerIdStr = req.user._id.toString();
    const now = Date.now();
    const lastUpdate = partnerLocationThrottleMap.get(partnerIdStr) || 0;

    // Throttle location updates: only process if at least 2500ms has elapsed since last update
    const isThrottled = (now - lastUpdate) < 2500;
    if (!isThrottled) {
      partnerLocationThrottleMap.set(partnerIdStr, now);

      await PartnerLocation.findOneAndUpdate(
        { partnerId: req.user._id },
        {
          $set: {
            location: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            heading,
            speed,
            isOnline: true,
            activeOrderId: targetOrderId || null,
            updatedAt: new Date()
          }
        },
        { upsert: true, new: true }
      );
    }

    // Broadcast live location to active order room so customer tracking map moves smoothly
    if (targetOrderId) {
      try {
        const io = getIO();
        if (io) {
          io.to(`order:${targetOrderId}`).emit('partner:location_updated', {
            partnerId: req.user._id,
            partnerName: req.user.name,
            coordinates: [longitude, latitude],
            heading,
            speed,
            timestamp: new Date().toISOString()
          });
        }
      } catch (socketErr) {
        console.warn('[Socket] Location broadcast failed:', socketErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Location updated',
      coordinates: [longitude, latitude],
      throttled: isThrottled
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/partners/dashboard
exports.getPartnerDashboard = async (req, res, next) => {
  try {
    const partnerId = req.user._id;

    // Verify user role
    if (req.user.role !== 'delivery_partner') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only delivery partners can access the courier fleet dashboard.'
      });
    }

    // Partner location state
    let locationRecord = await PartnerLocation.findOne({ partnerId });

    let activeOrder = null;
    let activeOrders = [];

    if (locationRecord && locationRecord.activeOrderId) {
      activeOrder = await Order.findOne({
        _id: locationRecord.activeOrderId,
        partnerId,
        status: { $in: ['accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'out_for_delivery'] }
      })
        .populate('restaurantId', 'name address location phone images')
        .populate('customerId', 'name phone');

      if (activeOrder) {
        activeOrders = [activeOrder];
      } else {
        // Self-heal: the activeOrderId referenced an already terminal or non-existent order
        await PartnerLocation.findOneAndUpdate(
          { partnerId, activeOrderId: locationRecord.activeOrderId },
          { $set: { activeOrderId: null, updatedAt: new Date() } }
        );
      }
    }

    // Completed orders today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const completedToday = await Order.find({
      partnerId,
      status: 'delivered',
      updatedAt: { $gte: startOfDay }
    });

    const totalCompletedAllTime = await Order.countDocuments({
      partnerId,
      status: 'delivered'
    });

    const totalEarningsToday = completedToday.length * 65; // ₹65 per delivery payout

    // Fetch live ratings from Review collection
    const partnerReviews = await Review.find({ partnerId, deliveryRating: { $ne: null } });
    const averageRating = partnerReviews.length > 0
      ? Number((partnerReviews.reduce((sum, r) => sum + r.deliveryRating, 0) / partnerReviews.length).toFixed(1))
      : null;

    res.status(200).json({
      success: true,
      partner: req.user,
      location: locationRecord ? locationRecord.location.coordinates : [77.2090, 28.6139],
      isOnline: req.user.isAvailable,
      activeOrder,
      activeOrders,
      stats: {
        completedTodayCount: completedToday.length,
        completedAllTimeCount: totalCompletedAllTime,
        earningsToday: totalEarningsToday,
        averageRating,
        reviewCount: partnerReviews.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/partners/available
exports.getAvailablePartners = async (req, res, next) => {
  try {
    const { lat, lng, radius = 10 } = req.query;

    const query = {
      isOnline: true,
      activeOrderId: null
    };

    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseFloat(radius) * 1000
        }
      };
    }

    const available = await PartnerLocation.find(query).populate('partnerId', 'name phone partnerDetails');

    res.status(200).json({
      success: true,
      count: available.length,
      data: available
    });
  } catch (error) {
    next(error);
  }
};
