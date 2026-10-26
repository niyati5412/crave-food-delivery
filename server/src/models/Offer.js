const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  discountPercentage: { type: Number, required: true, min: 1, max: 100 },
  maxDiscount: { type: Number, default: 200 },
  minOrderAmount: { type: Number, default: 299 },
  validFrom: { type: Date, default: Date.now },
  validUntil: { type: Date, required: true },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

const Offer = mongoose.model('Offer', offerSchema);
module.exports = Offer;
