const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true
  },
  grossAmount: { type: Number, required: true },
  platformCommission: { type: Number, required: true }, // e.g. 15%
  taxDeducted: { type: Number, default: 0 },
  netSettlementAmount: { type: Number, required: true },
  settlementStatus: {
    type: String,
    enum: ['pending', 'processing', 'settled', 'failed'],
    default: 'pending'
  },
  settledAt: { type: Date }
}, {
  timestamps: true
});

const Settlement = mongoose.model('Settlement', settlementSchema);
module.exports = Settlement;
