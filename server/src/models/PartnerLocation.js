const mongoose = require('mongoose');

const partnerLocationSchema = new mongoose.Schema({
  partnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  heading: {
    type: Number,
    default: 0
  },
  speed: {
    type: Number,
    default: 20
  },
  isOnline: {
    type: Boolean,
    default: true,
    index: true
  },
  activeOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Explicit 2dsphere index on location field for finding nearest partners
partnerLocationSchema.index({ location: '2dsphere' });

const PartnerLocation = mongoose.model('PartnerLocation', partnerLocationSchema);
module.exports = PartnerLocation;
