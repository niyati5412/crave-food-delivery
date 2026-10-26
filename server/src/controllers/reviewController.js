const Review = require('../models/Review');
const PartnerFeedback = require('../models/PartnerFeedback');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');

exports.createReview = async (req, res, next) => {
  try {
    const { orderId, rating, restaurantRating, deliveryRating, comment = '', deliveryComment = '', tags } = req.body;

    const finalRestRating = Number(restaurantRating || rating);
    if (!orderId || !finalRestRating || finalRestRating < 1 || finalRestRating > 5) {
      return res.status(400).json({ success: false, message: 'OrderId and a valid restaurant rating (1-5) are required.' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.customerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only review your own orders.' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ success: false, message: 'You can only review delivered orders.' });
    }

    const existingReview = await Review.findOne({ orderId });
    if (existingReview) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this culinary order.' });
    }

    let finalDeliveryRating = null;
    if (deliveryRating !== undefined && deliveryRating !== null) {
      const numDeliv = Number(deliveryRating);
      if (numDeliv < 1 || numDeliv > 5) {
        return res.status(400).json({ success: false, message: 'Delivery rating must be between 1 and 5.' });
      }
      if (!order.partnerId) {
        return res.status(400).json({ success: false, message: 'Cannot submit delivery rating for an unassigned partner.' });
      }
      finalDeliveryRating = numDeliv;
    }

    const review = await Review.create({
      orderId,
      customerId: req.user._id,
      restaurantId: order.restaurantId,
      partnerId: order.partnerId || null,
      restaurantRating: finalRestRating,
      deliveryRating: finalDeliveryRating,
      rating: finalRestRating,
      comment: String(comment).trim(),
      deliveryComment: String(deliveryComment).trim(),
      tags: Array.isArray(tags) ? tags : ['Culinary Excellence', 'Freshly Prepared']
    });

    // Recalculate Restaurant Rating
    const allReviews = await Review.find({ restaurantId: order.restaurantId });
    const avgRating = allReviews.reduce((sum, r) => sum + (r.restaurantRating || r.rating), 0) / allReviews.length;

    await Restaurant.findByIdAndUpdate(order.restaurantId, {
      rating: Math.round(avgRating * 10) / 10,
      totalRatings: allReviews.length
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully. Thank you for your feedback!',
      review
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/reviews/order/:orderId
exports.getOrderReview = async (req, res, next) => {
  try {
    const review = await Review.findOne({
      orderId: req.params.orderId,
      customerId: req.user._id
    });

    res.status(200).json({
      success: true,
      hasReviewed: !!review,
      review: review || null
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/reviews/partner-feedback
// Operational feedback from delivery partner
exports.createPartnerFeedback = async (req, res, next) => {
  try {
    const { orderId, pickupDelayMins = 0, packagingCondition = 'excellent', issueType = 'none', notes = '' } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'OrderId is required.' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (!order.partnerId || order.partnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only submit operational feedback for deliveries assigned to you.' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ success: false, message: 'Operational delivery feedback can only be submitted after delivery completion.' });
    }

    const existing = await PartnerFeedback.findOne({ orderId });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You have already submitted feedback for this delivery trip.' });
    }

    const feedback = await PartnerFeedback.create({
      orderId,
      partnerId: req.user._id,
      restaurantId: order.restaurantId,
      pickupDelayMins: Number(pickupDelayMins) || 0,
      packagingCondition,
      issueType,
      notes: String(notes).trim()
    });

    res.status(201).json({
      success: true,
      message: 'Operational delivery feedback recorded successfully.',
      feedback
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/reviews/partner-feedback
exports.getPartnerFeedbacks = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role === 'restaurant') {
      const owned = await Restaurant.find({ ownerId: req.user._id });
      query.restaurantId = { $in: owned.map(o => o._id) };
    }
    const feedbacks = await PartnerFeedback.find(query)
      .populate('orderId', 'orderNumber status')
      .populate('partnerId', 'name phone partnerDetails')
      .populate('restaurantId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: feedbacks.length,
      feedbacks
    });
  } catch (error) {
    next(error);
  }
};

exports.getRestaurantReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ restaurantId: req.params.restaurantId })
      .populate('customerId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews
    });
  } catch (error) {
    next(error);
  }
};
