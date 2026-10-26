const mongoose = require('mongoose');

const partnerFeedbackSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true
  },
  partnerId: {
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
  pickupDelayMins: {
    type: Number,
    default: 0
  },
  packagingCondition: {
    type: String,
    enum: ['excellent', 'acceptable', 'leaking_or_damaged', 'not_ready'],
    default: 'excellent'
  },
  issueType: {
    type: String,
    enum: ['none', 'kitchen_delay', 'packaging_defect', 'customer_unreachable', 'address_difficulty', 'other'],
    default: 'none'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PartnerFeedback', partnerFeedbackSchema);
