const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  // Distinct ratings for culinary & delivery experiences
  restaurantRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  deliveryRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  // Backward compatibility alias
  rating: {
    type: Number,
    default: 5
  },
  comment: {
    type: String,
    trim: true,
    default: ''
  },
  deliveryComment: {
    type: String,
    trim: true,
    default: ''
  },
  tags: [{ type: String }]
}, {
  timestamps: true
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
