const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Restaurant name is required'],
    trim: true,
    index: true
  },
  tagline: {
    type: String,
    default: 'Artisanal culinary experience'
  },
  description: {
    type: String,
    required: true
  },
  cuisines: {
    type: [String],
    required: true,
    index: true
  },
  images: {
    cover: {
      type: String,
      default: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
    },
    logo: {
      type: String,
      default: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80'
    },
    gallery: [{ type: String }]
  },
  address: {
    addressLine: { type: String, required: true },
    landmark: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, default: '' },
    pincode: { type: String, required: true }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  rating: {
    type: Number,
    default: 4.5,
    min: 1,
    max: 5,
    index: true
  },
  totalRatings: {
    type: Number,
    default: 120
  },
  isOpen: {
    type: Boolean,
    default: true,
    index: true
  },
  prepTimeMins: {
    type: Number,
    default: 25
  },
  priceForTwo: {
    type: Number,
    default: 600,
    index: true
  },
  deliveryRadiusKm: {
    type: Number,
    default: 12
  },
  serviceablePincodes: {
    type: [String],
    default: []
  },
  minimumOrderAmount: {
    type: Number,
    default: 150
  },
  featuredBadge: {
    type: String,
    default: 'Chef Curated'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'approved',
    index: true
  },
  applicationNotes: {
    type: String,
    default: ''
  },
  isPureVeg: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Explicit 2dsphere index on location field for geospatial queries ($near, $geoWithin)
restaurantSchema.index({ location: '2dsphere' });

const Restaurant = mongoose.model('Restaurant', restaurantSchema);
module.exports = Restaurant;
