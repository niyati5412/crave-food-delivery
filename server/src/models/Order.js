const mongoose = require('mongoose');
const { ORDER_STATUS, PAYMENT_MODES, PAYMENT_STATUS } = require('../config/constants');

const orderItemSchema = new mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  name: { type: String, required: true },
  price: { type: Number, required: true }, // Immutable snapshot at purchase
  quantity: { type: Number, required: true, min: 1 },
  selectedAddOns: [{
    name: { type: String, required: true },
    price: { type: Number, required: true }
  }],
  itemTotal: { type: Number, required: true }
}, { _id: true });

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: Object.values(ORDER_STATUS),
    required: true
  },
  actor: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, required: true },
    name: { type: String, default: 'System' }
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  note: { type: String, default: '' }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    index: true
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
  items: [orderItemSchema],
  amountBreakup: {
    itemSubtotal: { type: Number, required: true },
    deliveryFee: { type: Number, required: true, default: 0 },
    tax: { type: Number, required: true, default: 0 }, // 5% GST
    packagingFee: { type: Number, required: true, default: 20 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true }
  },
  offerCode: {
    type: String,
    default: null
  },
  deliveryAddress: {
    addressLine: { type: String, required: true },
    landmark: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, default: '' },
    pincode: { type: String, required: true },
    contactPhone: { type: String, required: true },
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
    }
  },
  status: {
    type: String,
    enum: Object.values(ORDER_STATUS),
    default: ORDER_STATUS.PLACED,
    index: true
  },
  statusHistory: [statusHistorySchema],
  paymentMode: {
    type: String,
    enum: Object.values(PAYMENT_MODES),
    default: PAYMENT_MODES.COD
  },
  paymentStatus: {
    type: String,
    enum: Object.values(PAYMENT_STATUS),
    default: PAYMENT_STATUS.PENDING
  },
  paymentReference: {
    transactionId: { type: String, default: '' },
    gateway: { type: String, default: 'MOCK_RAZORPAY' },
    verifiedAt: { type: Date }
  },
  deliveryOtp: {
    type: String,
    default: () => Math.floor(1000 + Math.random() * 9000).toString()
  },
  prepTimeMins: {
    type: Number,
    default: 25
  },
  estimatedDeliveryTime: {
    type: Date
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  cancelReason: { type: String, default: '' },
  rejectReason: { type: String, default: '' }
}, {
  timestamps: true
});

// Auto-generate orderNumber before saving
orderSchema.pre('validate', function(next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(100 + Math.random() * 900);
    this.orderNumber = `CRV-${timestamp}-${random}`;
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
