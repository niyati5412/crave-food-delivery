require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const PartnerLocation = require('../models/PartnerLocation');
const Offer = require('../models/Offer');
const Settlement = require('../models/Settlement');
const Review = require('../models/Review');
const ChatMessage = require('../models/ChatMessage');
const { ROLES, ORDER_STATUS, PAYMENT_MODES, PAYMENT_STATUS } = require('../config/constants');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crave_food_delivery';

async function seedDatabase() {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('[Seed] Connected. Running safe, idempotent seeding...');

    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('password123', salt);
    const adminPasswordHash = await bcrypt.hash('admin123', salt);

    console.log('[Seed] Ensuring demo accounts for all 4 roles...');

    // Helper: idempotent user upsert
    async function upsertUser(query, data) {
      let u = await User.findOne(query);
      if (u) {
        Object.assign(u, data);
        return await u.save();
      }
      return await User.create(data);
    }

    // 1. Customer Demo User
    const customer = await upsertUser({ email: 'customer@crave.com' }, {
      name: 'Sarah Jenkins',
      email: 'customer@crave.com',
      phone: '+91 98765 43210',
      passwordHash: defaultPasswordHash,
      role: ROLES.CUSTOMER,
      accountStatus: 'active',
      addresses: [
        {
          label: 'Home',
          addressLine: 'Apt 8B, Ivory Heights, Barakhamba Road',
          landmark: 'Near Statesman House',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110001',
          location: {
            type: 'Point',
            coordinates: [77.2245, 28.6295]
          },
          isDefault: true
        },
        {
          label: 'Work',
          addressLine: '6th Floor, Horizon Media Center, Kasturba Gandhi Marg',
          landmark: 'Near British Council',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110001',
          location: {
            type: 'Point',
            coordinates: [77.2215, 28.6225]
          },
          isDefault: false
        }
      ]
    });

    // 2. Restaurant Owners
    const owner1 = await upsertUser({ email: 'owner1@crave.com' }, {
      name: 'Chef Marco Bellini',
      email: 'owner1@crave.com',
      phone: '+91 98111 22334',
      passwordHash: defaultPasswordHash,
      role: ROLES.RESTAURANT,
      accountStatus: 'active'
    });

    const owner2 = await upsertUser({ email: 'owner2@crave.com' }, {
      name: 'Chef Kenji Sato',
      email: 'owner2@crave.com',
      phone: '+91 98222 33445',
      passwordHash: defaultPasswordHash,
      role: ROLES.RESTAURANT,
      accountStatus: 'active'
    });

    const owner3 = await upsertUser({ email: 'owner3@crave.com' }, {
      name: 'Ustad Tariq Qureshi',
      email: 'owner3@crave.com',
      phone: '+91 98333 44556',
      passwordHash: defaultPasswordHash,
      role: ROLES.RESTAURANT,
      accountStatus: 'active'
    });

    // 3. Delivery Couriers
    const partner1 = await upsertUser({ email: 'partner@crave.com' }, {
      name: 'Rohan Sharma',
      email: 'partner@crave.com',
      phone: '+91 99887 76655',
      passwordHash: defaultPasswordHash,
      role: ROLES.DELIVERY_PARTNER,
      isAvailable: true,
      accountStatus: 'active',
      partnerDetails: {
        vehicleType: 'bike',
        vehicleNumber: 'DL-03-AB-7744',
        isVerified: true
      }
    });

    const partner2 = await upsertUser({ email: 'partner2@crave.com' }, {
      name: 'Vikram Singh',
      email: 'partner2@crave.com',
      phone: '+91 99776 65544',
      passwordHash: defaultPasswordHash,
      role: ROLES.DELIVERY_PARTNER,
      isAvailable: true,
      accountStatus: 'active',
      partnerDetails: {
        vehicleType: 'scooter',
        vehicleNumber: 'DL-07-EF-2109',
        isVerified: true
      }
    });

    // 4. Admin User
    await upsertUser({ email: 'admin@crave.com' }, {
      name: 'Niyati Admin',
      email: 'admin@crave.com',
      phone: '+91 90000 00001',
      passwordHash: adminPasswordHash,
      role: ROLES.ADMIN,
      accountStatus: 'active'
    });

    console.log('[Seed] Upserting delivery partner live locations with 2dsphere indexing...');
    await PartnerLocation.findOneAndUpdate(
      { partnerId: partner1._id },
      {
        $set: {
          location: { type: 'Point', coordinates: [77.2180, 28.6310] },
          heading: 45,
          speed: 24,
          isOnline: true,
          activeOrderId: null,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    await PartnerLocation.findOneAndUpdate(
      { partnerId: partner2._id },
      {
        $set: {
          location: { type: 'Point', coordinates: [77.2220, 28.6280] },
          heading: 90,
          speed: 18,
          isOnline: true,
          activeOrderId: null,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    console.log('[Seed] Seeding 10 Artisanal Gourmet Kitchens with explicit serviceable PIN codes...');
    const restaurantsData = [
      {
        ownerId: owner1._id,
        name: 'Osteria Bellini',
        tagline: 'Artisanal Woodfired Pizza & Handcrafted Venetian Pastas',
        description: 'Immerse yourself in authentic Italian soul food. Fermented sourdough bases, San Marzano tomatoes, and burrata imported fresh from Puglia.',
        cuisines: ['Italian', 'Artisanal Pizza', 'Mediterranean', 'Pasta'],
        images: {
          cover: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
          logo: 'https://images.unsplash.com/photo-1579684947550-22e945225d9a?auto=format&fit=crop&w=300&q=80',
          gallery: [
            'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1621996346565-e3d5d628169e?auto=format&fit=crop&w=800&q=80'
          ]
        },
        address: {
          addressLine: 'Block M-42, Inner Circle, Connaught Place',
          landmark: 'Near Shankar Market',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110001'
        },
        location: {
          type: 'Point',
          coordinates: [77.2205, 28.6328]
        },
        serviceablePincodes: ['110001', '110002', '110003', '110008', '110011'],
        rating: 4.8,
        totalRatings: 420,
        isOpen: true,
        prepTimeMins: 25,
        priceForTwo: 950,
        deliveryRadiusKm: 12,
        minimumOrderAmount: 250,
        featuredBadge: 'Michelin Guide Selection',
        isPureVeg: false
      },
      {
        ownerId: owner2._id,
        name: 'Umami Ramen & Robata',
        tagline: '24-Hour Rich Tonkotsu & Charred Robata Skewers',
        description: 'A cozy Tokyo-style dining experience. Slow-simmered rich broths, handmade alkaline noodles, chashu pork, and smoking binchotan grill specialties.',
        cuisines: ['Japanese', 'Ramen', 'Asian', 'Sushi'],
        images: {
          cover: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80',
          logo: 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=300&q=80',
          gallery: [
            'https://images.unsplash.com/photo-1557872943-16a5ac26437e?auto=format&fit=crop&w=800&q=80'
          ]
        },
        address: {
          addressLine: 'Shop 18, Khan Market Middle Lane',
          landmark: 'Above Coffee Roasters',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110003'
        },
        location: {
          type: 'Point',
          coordinates: [77.2274, 28.6002]
        },
        serviceablePincodes: ['110003', '110011', '110021', '110024', '110048'],
        rating: 4.9,
        totalRatings: 580,
        isOpen: true,
        prepTimeMins: 30,
        priceForTwo: 1100,
        deliveryRadiusKm: 15,
        minimumOrderAmount: 300,
        featuredBadge: 'Trending Hotspot',
        isPureVeg: false
      },
      {
        ownerId: owner3._id,
        name: 'The Awadh Dastarkhwan',
        tagline: 'Dum Pukht Biryanis & Melt-in-Mouth Galouti Kebabs',
        description: 'Centuries-old royal recipes preserved across generations. Slow-cooked aromatic basmati biryanis, saffron-infused korma, and delicate warqi parathas.',
        cuisines: ['Mughlai', 'Biryani', 'North Indian', 'Kebabs'],
        images: {
          cover: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1200&q=80',
          logo: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=300&q=80',
          gallery: [
            'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=800&q=80'
          ]
        },
        address: {
          addressLine: 'Heritage Wing, Asaf Ali Road, Daryaganj',
          landmark: 'Opposite Delite Cinema',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110002'
        },
        location: {
          type: 'Point',
          coordinates: [77.2388, 28.6439]
        },
        serviceablePincodes: ['110001', '110002', '110006', '110007', '110054'],
        rating: 4.7,
        totalRatings: 340,
        isOpen: true,
        prepTimeMins: 35,
        priceForTwo: 850,
        deliveryRadiusKm: 10,
        minimumOrderAmount: 200,
        featuredBadge: 'Heritage Legacy',
        isPureVeg: false
      },
      {
        ownerId: owner1._id,
        name: 'Green Flora Botanica',
        tagline: 'Plant-Forward Superfood Bowls & Cold-Pressed Elixirs',
        description: 'Nourishing botanical cuisine designed for elevated wellness. Organic microgreens, activated nuts, house-made fermented kombucha, and raw vegan treats.',
        cuisines: ['Healthy', 'Vegan', 'Salads', 'Organic'],
        images: {
          cover: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80',
          logo: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=300&q=80',
          gallery: [
            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
          ]
        },
        address: {
          addressLine: 'M-Block Market, Greater Kailash II',
          landmark: 'Next to Botanical Nursery',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110048'
        },
        location: {
          type: 'Point',
          coordinates: [77.2415, 28.5355]
        },
        serviceablePincodes: ['110048', '110049', '110024', '110019', '110065', '110001', '110002', '110003'],
        rating: 4.6,
        totalRatings: 290,
        isOpen: true,
        prepTimeMins: 20,
        priceForTwo: 750,
        deliveryRadiusKm: 12,
        minimumOrderAmount: 200,
        featuredBadge: '100% Organic',
        isPureVeg: true
      },
      {
        ownerId: owner2._id,
        name: 'Bukhara & Dera',
        tagline: 'Clay-Tandoor Dal Bukhara & Succulent Sikandari Raan',
        description: 'North-West frontier culinary royalty. Rich slow-cooked black lentils, succulent tandoor-charred kebabs, and flaky giant naans straight from earthen ovens.',
        cuisines: ['North Indian', 'Mughlai', 'Tandoor', 'Kebabs'],
        images: {
          cover: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1200&q=80',
          logo: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=300&q=80',
          gallery: []
        },
        address: {
          addressLine: 'Diplomatic Enclave, Chanakyapuri',
          landmark: 'Adjacent to Nehru Park',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110021'
        },
        location: {
          type: 'Point',
          coordinates: [77.1901, 28.5925]
        },
        serviceablePincodes: ['110021', '110003', '110011', '110023', '110001'],
        rating: 4.9,
        totalRatings: 890,
        isOpen: true,
        prepTimeMins: 40,
        priceForTwo: 1800,
        deliveryRadiusKm: 15,
        minimumOrderAmount: 500,
        featuredBadge: 'Iconic Masterpiece',
        isPureVeg: false
      },
      {
        ownerId: owner3._id,
        name: 'Maison Bleue Bistro',
        tagline: 'Parisian Bistro Classics & Flaky French Viennoiserie',
        description: 'An intimate slice of Saint-Germain in Delhi. Slow-cooked duck confit, truffled croque monsieurs, and buttery laminated pastries crafted fresh daily.',
        cuisines: ['French', 'European', 'Bakery', 'Breakfast'],
        images: {
          cover: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1200&q=80',
          logo: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80',
          gallery: []
        },
        address: {
          addressLine: 'Central Market, Defence Colony',
          landmark: 'Under the Flyover Arcade',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110024'
        },
        location: {
          type: 'Point',
          coordinates: [77.2310, 28.5740]
        },
        serviceablePincodes: ['110024', '110003', '110011', '110048', '110049'],
        rating: 4.7,
        totalRatings: 310,
        isOpen: true,
        prepTimeMins: 25,
        priceForTwo: 1200,
        deliveryRadiusKm: 12,
        minimumOrderAmount: 300,
        featuredBadge: 'Artisan Boulangerie',
        isPureVeg: false
      },
      {
        ownerId: owner1._id,
        name: 'Dragonfly Pan-Asian Lounge',
        tagline: 'Handcrafted Truffle Dim Sum & Crispy Aromatic Duck',
        description: 'Contemporary Far East culinary theatre. Translucent dim sum crystal parcels, fiery Sichuan wok creations, and fragrant Thai curries.',
        cuisines: ['Pan-Asian', 'Dim Sum', 'Chinese', 'Thai'],
        images: {
          cover: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=1200&q=80',
          logo: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=300&q=80',
          gallery: []
        },
        address: {
          addressLine: 'Aerocity Hospitality District, Worldmark 1',
          landmark: 'Opposite Central Plaza',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110037'
        },
        location: {
          type: 'Point',
          coordinates: [77.1215, 28.5485]
        },
        serviceablePincodes: ['110037', '110070', '110016', '110067', '122002', '110001', '110002', '110003'],
        rating: 4.8,
        totalRatings: 460,
        isOpen: true,
        prepTimeMins: 30,
        priceForTwo: 1400,
        deliveryRadiusKm: 18,
        minimumOrderAmount: 400,
        featuredBadge: 'Haute Mixology & Dim Sum',
        isPureVeg: false
      },
      {
        ownerId: owner2._id,
        name: 'La Taquería Oaxaqueña',
        tagline: 'Slow-Braised Birria Tacos & Stone-Ground Mole Negro',
        description: 'Vibrant street-food gastronomy from Oaxaca. Crisp griddled corn tortillas, slow-simmered birria beef with rich dipping consomé, and fresh churros.',
        cuisines: ['Mexican', 'Tacos', 'Latin American'],
        images: {
          cover: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1200&q=80',
          logo: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=300&q=80',
          gallery: []
        },
        address: {
          addressLine: 'Hauz Khas Village, Lakeside Lane',
          landmark: 'Facing Deer Park Monument',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110016'
        },
        location: {
          type: 'Point',
          coordinates: [77.1950, 28.5535]
        },
        serviceablePincodes: ['110016', '110017', '110024', '110049', '110070', '110001', '110002', '110003'],
        rating: 4.6,
        totalRatings: 375,
        isOpen: true,
        prepTimeMins: 20,
        priceForTwo: 800,
        deliveryRadiusKm: 12,
        minimumOrderAmount: 200,
        featuredBadge: 'Street Food Elevated',
        isPureVeg: false
      },
      {
        ownerId: owner3._id,
        name: 'Sweet Cacao Haute Patisserie',
        tagline: 'Valrhona Chocolate Sculptures & Basque Burnt Cheesecakes',
        description: 'Decadent French dessert laboratory. Multi-layered entremets, molten dark chocolate domes, and airy fruit macarons designed by master chocolatiers.',
        cuisines: ['Bakery', 'Desserts', 'Chocolates', 'Cakes'],
        images: {
          cover: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80',
          logo: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=300&q=80',
          gallery: []
        },
        address: {
          addressLine: 'Ambience Mall, Vasant Kunj Ground Floor',
          landmark: 'Near Central Atrium Fountain',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110070'
        },
        location: {
          type: 'Point',
          coordinates: [77.1550, 28.5410]
        },
        serviceablePincodes: ['110070', '110016', '110037', '110067', '110030', '110001', '110002', '110003'],
        rating: 4.9,
        totalRatings: 610,
        isOpen: true,
        prepTimeMins: 15,
        priceForTwo: 600,
        deliveryRadiusKm: 15,
        minimumOrderAmount: 250,
        featuredBadge: 'Master Chocolatier',
        isPureVeg: true
      },
      {
        ownerId: owner1._id,
        name: 'Koshur Saal — Royal Wazwan',
        tagline: 'Authentic 36-Course Kashmiri Banquet Delicacies',
        description: 'The pinnacle of valley hospitality. Tender Rogan Josh simmered with mawal flower, silken pounded Gushtaba, and fragrant saffron kahwa.',
        cuisines: ['Kashmiri', 'North Indian', 'Slow Cooked', 'Meat Specialties'],
        images: {
          cover: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1200&q=80',
          logo: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=300&q=80',
          gallery: []
        },
        address: {
          addressLine: 'Santushti Shopping Arcade, Chanakyapuri',
          landmark: 'Airforce Enclave Garden',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110021'
        },
        location: {
          type: 'Point',
          coordinates: [77.1990, 28.5880]
        },
        serviceablePincodes: ['110021', '110003', '110011', '110001', '110023'],
        rating: 4.8,
        totalRatings: 520,
        isOpen: true,
        prepTimeMins: 35,
        priceForTwo: 1100,
        deliveryRadiusKm: 14,
        minimumOrderAmount: 300,
        featuredBadge: 'Wazwan Tradition',
        isPureVeg: false
      }
    ];

    const seededRestaurants = [];
    for (const rData of restaurantsData) {
      let r = await Restaurant.findOne({ name: rData.name });
      if (r) {
        Object.assign(r, rData);
        r = await r.save();
      } else {
        r = await Restaurant.create(rData);
      }
      seededRestaurants.push(r);
    }

    const rBellini = seededRestaurants[0];
    const rUmami = seededRestaurants[1];
    const rAwadh = seededRestaurants[2];
    const rFlora = seededRestaurants[3];
    const rBukhara = seededRestaurants[4];
    const rMaison = seededRestaurants[5];
    const rDragonfly = seededRestaurants[6];
    const rTaqueria = seededRestaurants[7];
    const rCacao = seededRestaurants[8];
    const rKoshur = seededRestaurants[9];

    console.log('[Seed] Seeding Comprehensive Artisanal Menus (7-9 items per kitchen)...');
    const menuItemsData = [
      // 1. Osteria Bellini (9 items across 4 categories)
      {
        restaurantId: rBellini._id,
        name: 'Truffle Burrata & Wild Mushroom Pizza',
        description: 'Charred sourdough crust, fior di latte mozzarella, roasted porcini, black summer truffle paste, fresh basil.',
        price: 680,
        category: 'Woodfired Pizza',
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: [
          { name: 'Extra Bufala Mozzarella', price: 120, isAvailable: true },
          { name: 'Shaved Black Truffle', price: 210, isAvailable: true },
          { name: 'Hot Honey Drizzle', price: 60, isAvailable: true }
        ]
      },
      {
        restaurantId: rBellini._id,
        name: 'Diavola Spicy Salami Pizza',
        description: 'San Marzano DOP tomato sauce, smoked provolone, Calabrian spicy artisan pepperoni, fresh oregano.',
        price: 720,
        category: 'Woodfired Pizza',
        image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: [
          { name: 'Extra Spicy Salami', price: 140, isAvailable: true },
          { name: 'Pickled Jalapenos', price: 50, isAvailable: true }
        ]
      },
      {
        restaurantId: rBellini._id,
        name: 'Handmade Tagliolini al Tartufo',
        description: 'Silky golden egg pasta tossed in Normandy butter emulsion, 30-month Parmigiano Reggiano, cracked pepper.',
        price: 590,
        category: 'Handmade Pasta',
        image: 'https://images.unsplash.com/photo-1621996346565-e3d5d628169e?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: [{ name: 'Garlic Herb Toast (2 pcs)', price: 90, isAvailable: true }]
      },
      {
        restaurantId: rBellini._id,
        name: 'Margherita di Bufala D.O.P.',
        description: 'Crushed sweet Vesuvio tomatoes, creamy buffalo mozzarella, cold-pressed Ligurian olive oil, fresh sweet basil.',
        price: 580,
        category: 'Woodfired Pizza',
        image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rBellini._id,
        name: 'Slow-Cooked Tuscan Lamb Pappardelle',
        description: 'Braised spring lamb shoulder simmered 6 hours in Chianti Classico, rosemary, and shaved pecorino toscano.',
        price: 690,
        category: 'Handmade Pasta',
        image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rBellini._id,
        name: 'Crispy Calamari Fritti with Caper Aioli',
        description: 'Tender baby squid lightly dusted in semolina, flash fried, served with lemon herb caper aioli.',
        price: 490,
        category: 'Antipasti (Appetizers)',
        image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: false,
        addOns: []
      },
      {
        restaurantId: rBellini._id,
        name: 'Burrata Pugliese Caprese',
        description: 'Fresh 200g burrata ball with charred heirloom vine tomatoes, aged balsamic reduction, basil pesto.',
        price: 440,
        category: 'Antipasti (Appetizers)',
        image: 'https://images.unsplash.com/photo-1592417817098-8f3d6ef2394c?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rBellini._id,
        name: 'Classic Venetian Tiramisu',
        description: 'Espresso-soaked savoiardi ladyfingers, velvety mascarpone cream, dark cocoa dust.',
        price: 340,
        category: 'Dolci (Desserts)',
        image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: []
      },

      // 2. Umami Ramen & Robata (8 items across 4 categories)
      {
        restaurantId: rUmami._id,
        name: 'Signature Tonkotsu Black Garlic Ramen',
        description: 'Rich 24-hr pork bone broth, tender rolled chashu, marinated ajitsuke tamago, wood ear mushrooms, black garlic mayu.',
        price: 640,
        category: 'Ramen Bowls',
        image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: [
          { name: 'Extra Ajitsuke Tamago (Lava Egg)', price: 70, isAvailable: true },
          { name: 'Extra Pork Chashu (2 slices)', price: 130, isAvailable: true },
          { name: 'Spicy Chili Oil Bomb', price: 40, isAvailable: true }
        ]
      },
      {
        restaurantId: rUmami._id,
        name: 'Spicy Miso Shiitake Ramen',
        description: 'Hearty roasted vegetable & fermented red miso broth, braised shiitake, bok choy, nori crisp, chili oil.',
        price: 580,
        category: 'Ramen Bowls',
        image: 'https://images.unsplash.com/photo-1557872943-16a5ac26437e?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: [{ name: 'Extra Bamboo Shoots', price: 50, isAvailable: true }]
      },
      {
        restaurantId: rUmami._id,
        name: 'Truffle Shoyu Chicken Paitan Ramen',
        description: 'Velvety chicken bone broth infused with barrel-aged shoyu, sous-vide chicken chashu, and white truffle aroma.',
        price: 620,
        category: 'Ramen Bowls',
        image: 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rUmami._id,
        name: 'Crispy Kurobuta Pork Gyoza (5 pcs)',
        description: 'Pan-seared Japanese dumplings with crispy lace skirts, served with spicy sesame scallion ponzu dip.',
        price: 420,
        category: 'Robata & Small Bites',
        image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rUmami._id,
        name: 'Charred Binchotan Chicken Yakitori (3 skewers)',
        description: 'Smoky skewered chicken thigh and scallions glazed in 30-year house tare sauce.',
        price: 460,
        category: 'Robata & Small Bites',
        image: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: false,
        addOns: []
      },
      {
        restaurantId: rUmami._id,
        name: 'Spicy Salmon Volcano Roll (8 pcs)',
        description: 'Fresh Norwegian salmon, cucumber, avocado, topped with torched spicy crab and tobiko caviar.',
        price: 680,
        category: 'Maki & Sushi',
        image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rUmami._id,
        name: 'Truffle Avocado & Asparagus Roll (8 pcs)',
        description: 'Crisp tempura asparagus, ripe Hass avocado, rolled in toasted sesame seeds with truffle ponzu glaze.',
        price: 540,
        category: 'Maki & Sushi',
        image: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: false,
        addOns: []
      },
      {
        restaurantId: rUmami._id,
        name: 'Matcha White Chocolate Mousse Cake',
        description: 'Uji ceremonial grade matcha sponge, light white chocolate ganache, candied yuzu peel.',
        price: 340,
        category: 'Desserts',
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: false,
        addOns: []
      },

      // 3. The Awadh Dastarkhwan (8 items across 4 categories)
      {
        restaurantId: rAwadh._id,
        name: 'Dum Pukht Murgh Biryani',
        description: 'Fragrant aged Dehradun basmati layered with spring chicken marinated in saffron, rose water, and kewra, sealed in clay handi with dough crust.',
        price: 580,
        category: 'Royal Dum Biryani',
        image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: [
          { name: 'Extra Mirch Ka Salan', price: 60, isAvailable: true },
          { name: 'Burani Garlic Raita', price: 50, isAvailable: true }
        ]
      },
      {
        restaurantId: rAwadh._id,
        name: 'Galouti Kebab with Ulta Tawa Paratha (4 pcs)',
        description: 'Finely minced mutton smoked with cloves and rose water, pan-seared to silk on mahi tawa, served with saffron paratha.',
        price: 560,
        category: 'Kebabs & Grills',
        image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: [{ name: 'Extra Mughlai Paratha', price: 75, isAvailable: true }]
      },
      {
        restaurantId: rAwadh._id,
        name: 'Kakori Mutton Seekh Kebab (4 pcs)',
        description: 'The legendary softest seekh kebab, infused with khoya, cardamom, and saffron, melted over live coals.',
        price: 620,
        category: 'Kebabs & Grills',
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rAwadh._id,
        name: 'Zafrani Paneer Tikka (4 pcs)',
        description: 'Creamy malai paneer cubes stuffed with dry fruit paste, marinated in golden saffron cream and char-grilled.',
        price: 460,
        category: 'Kebabs & Grills',
        image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rAwadh._id,
        name: 'Awadhi Gosht Korma (Slow-Simmered)',
        description: 'Baby lamb shanks cooked on slow charcoal flame in rich golden cashew, browned onion, and melon seed gravy.',
        price: 680,
        category: 'Heritage Curries',
        image: 'https://images.unsplash.com/photo-1545247181-516773cae754?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rAwadh._id,
        name: 'Dal Makhani Dastarkhwan',
        description: 'Slow-simmered black urad lentils churned overnight with country butter, fresh cream, and smoky tomato purée.',
        price: 440,
        category: 'Heritage Curries',
        image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rAwadh._id,
        name: 'Subz Dum Biryani Handi',
        description: 'Aromatic garden vegetables, saffron rice, caramelized shallots, mint, and whole spices sealed in clay pot.',
        price: 480,
        category: 'Royal Dum Biryani',
        image: 'https://images.unsplash.com/photo-1642821373181-696a54913e9a?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: false,
        addOns: []
      },
      {
        restaurantId: rAwadh._id,
        name: 'Shahi Tukda with Saffron Rabri',
        description: 'Golden ghee-fried bread steeped in cardamom sugar syrup, crowned with thick condensed saffron rabri and silver leaf.',
        price: 280,
        category: 'Desserts',
        image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: []
      },

      // 4. Green Flora Botanica (7 items across 3 categories)
      {
        restaurantId: rFlora._id,
        name: 'Avocado Green Goddess Bowl',
        description: 'Tri-color organic quinoa, Hass avocado roses, edamame, baby spinach, roasted pepitas, spirulina tahini dressing.',
        price: 460,
        category: 'Nourish Bowls',
        image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: [
          { name: 'Grilled Herb Tofu', price: 80, isAvailable: true },
          { name: 'Organic Chia & Hemp Mix', price: 50, isAvailable: true }
        ]
      },
      {
        restaurantId: rFlora._id,
        name: 'Warm Wild Mushroom & Organic Quinoa Bowl',
        description: 'Sautéed king oyster & shiitake mushrooms, roasted butternut squash, kale, walnut crunch, lemon miso vinaigrette.',
        price: 480,
        category: 'Nourish Bowls',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rFlora._id,
        name: 'Charred Edamame with Truffle Sea Salt',
        description: 'Young organic soy beans tossed in cold-pressed white truffle oil, Himalayan pink flake salt, and toasted sesame.',
        price: 340,
        category: 'Small Plates',
        image: 'https://images.unsplash.com/photo-1550461716-dbf266b2a8a7?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rFlora._id,
        name: 'Sweet Potato & Black Bean Soft Tacos (3 pcs)',
        description: 'Charred corn tortillas filled with spiced roast sweet potato, smashed black beans, pickled red onion, cashew crema.',
        price: 390,
        category: 'Small Plates',
        image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: false,
        addOns: []
      },
      {
        restaurantId: rFlora._id,
        name: 'Truffled Cauliflower Silk Risotto',
        description: 'Creamy slow-simmered cauliflower rice folded with nutritional yeast, roasted pine nuts, and shaved winter truffle.',
        price: 560,
        category: 'Plant-Forward Mains',
        image: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rFlora._id,
        name: 'Acai Berry Superfood Protein Bowl',
        description: 'Frozen organic Amazonian acai blend topped with banana, dragonfruit, house granola, and almond butter drizzle.',
        price: 420,
        category: 'Nourish Bowls',
        image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: false,
        addOns: []
      },
      {
        restaurantId: rFlora._id,
        name: 'Raw Pistachio & Dark Cocoa Tart',
        description: 'Flourless date-almond crust, whipped avocado dark chocolate silk, crushed Sicilian pistachios.',
        price: 340,
        category: 'Guilt-Free Desserts',
        image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: []
      },

      // 5. Bukhara & Dera (8 items across 4 categories)
      {
        restaurantId: rBukhara._id,
        name: 'Dal Bukhara (Iconic 18-Hour Simmer)',
        description: 'Black lentils slow cooked overnight over dying charcoal embers with tomato purée, garlic, and generous dollops of churned butter.',
        price: 650,
        category: 'Tandoori Signatures',
        image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: [
          { name: 'Butter Garlic Naan', price: 95, isAvailable: true },
          { name: 'Laccha Paratha', price: 85, isAvailable: true }
        ]
      },
      {
        restaurantId: rBukhara._id,
        name: 'Murgh Malai Kebab (4 pcs)',
        description: 'Tender creamy chicken fillets marinated in rich clotted cream, green cardamom, white pepper, and roasted in clay tandoor.',
        price: 720,
        category: 'Tandoori Signatures',
        image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: [{ name: 'Mint Coriander Dip', price: 40, isAvailable: true }]
      },
      {
        restaurantId: rBukhara._id,
        name: 'Tandoori Jhinga (Tiger Prawns - 4 pcs)',
        description: 'Jumbo coastal prawns marinated in yellow mustard, carom seeds, malt vinegar, and roasted to succulent perfection.',
        price: 1150,
        category: 'Tandoori Signatures',
        image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rBukhara._id,
        name: 'Sikandari Raan Roast',
        description: 'Whole leg of baby lamb marinated twice in rum, spices, and malt vinegar, pot-roasted and finished in tandoor.',
        price: 1280,
        category: 'Tandoori Signatures',
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rBukhara._id,
        name: 'Paneer Tikka Bukhara (4 pcs)',
        description: 'Thick slabs of fresh cottage cheese skewered with sweet bell peppers and onions, basted in spiced mustard oil.',
        price: 560,
        category: 'Tandoori Signatures',
        image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: false,
        addOns: []
      },
      {
        restaurantId: rBukhara._id,
        name: 'Murgh Makhani Grand Cru',
        description: 'Clay-oven roasted chicken tikka pulled and simmered in satin tomato gravy enriched with fenugreek and butter.',
        price: 680,
        category: 'Heritage Curries',
        image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rBukhara._id,
        name: 'Giant Tandoori Garlic Butter Naan',
        description: 'Oversized teardrop naan baked against clay walls, brushed with clarified butter and roasted garlic flakes.',
        price: 110,
        category: 'Clay Oven Breads',
        image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: false,
        addOns: []
      },
      {
        restaurantId: rBukhara._id,
        name: 'Kesar Pista Kulfi Falooda',
        description: 'Dense reduced milk ice cream infused with saffron and pistachios, served with silky cornstarch noodles and rose syrup.',
        price: 290,
        category: 'Desserts',
        image: 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: []
      },

      // 6. Maison Bleue Bistro (7 items across 3 categories)
      {
        restaurantId: rMaison._id,
        name: 'Truffle & Gruyère Butter Croissant',
        description: 'Flaky multi-layered croissant laminated with French butter, stuffed with melted alpine gruyère and black winter truffle paste.',
        price: 360,
        category: 'Boulangerie & Savory',
        image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rMaison._id,
        name: 'Duck Confit with Orange Reduction',
        description: 'Crispy skin slow-rendered duck leg served over truffled potato mousseline and caramelized heirloom carrots.',
        price: 890,
        category: 'Bistro Mains',
        image: 'https://images.unsplash.com/photo-1514944298352-70dc4e0bfa90?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rMaison._id,
        name: 'French Onion Soup with Comté Gratiné',
        description: 'Caramelized onion broth enriched with white wine and thyme, topped with a sourdough crouton and broiled aged Comté.',
        price: 440,
        category: 'Boulangerie & Savory',
        image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rMaison._id,
        name: 'Pan-Seared Chilean Sea Bass',
        description: 'Crispy skin sea bass fillet over braised leeks, saffron potato confit, and lemon caper emulsion.',
        price: 940,
        category: 'Bistro Mains',
        image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rMaison._id,
        name: 'Steak Frites with Herb Butter',
        description: 'Grilled tenderloin steak sliced and served with Café de Paris herb compound butter and thin crisp pomme frites.',
        price: 960,
        category: 'Bistro Mains',
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rMaison._id,
        name: 'Wild Mushroom & Leek Vol-au-Vent',
        description: 'Flaky puff pastry case filled with sautéed chanterelles, porcini, cream, and fresh tarragon.',
        price: 480,
        category: 'Boulangerie & Savory',
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: false,
        addOns: []
      },
      {
        restaurantId: rMaison._id,
        name: 'Crème Brûlée à la Vanille Bourbon',
        description: 'Classic rich custard infused with Madagascar bourbon vanilla beans, topped with a crisp caramelized sugar crust.',
        price: 340,
        category: 'Desserts & Pâtisserie',
        image: 'https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: []
      },

      // 7. Dragonfly Pan-Asian Lounge (7 items across 3 categories)
      {
        restaurantId: rDragonfly._id,
        name: 'Truffle Edamame Crystal Dim Sum (5 pcs)',
        description: 'Translucent steamed parcels filled with crushed edamame, water chestnuts, and infused with white truffle essence.',
        price: 490,
        category: 'Handcrafted Dim Sum',
        image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: [{ name: 'Spicy Chili Crisp Oil', price: 45, isAvailable: true }]
      },
      {
        restaurantId: rDragonfly._id,
        name: 'Crispy Cantonese Roast Duck Wraps',
        description: 'Spiced aromatic duck slices, cucumber ribbons, scallions, hoisin plum glaze, steamed lotus pancakes.',
        price: 780,
        category: 'Asian Specialties',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rDragonfly._id,
        name: 'Prawn & XO Sauce Har Gow (5 pcs)',
        description: 'Steamed crystal wrappers stuffed with succulent chopped prawns and spicy dried scallop XO sauce.',
        price: 560,
        category: 'Handcrafted Dim Sum',
        image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rDragonfly._id,
        name: 'Thai Basil Chicken with Jasmine Rice',
        description: 'Wok-minced chicken thigh flash-fried with bird-eye chili, garlic, and fresh holy basil, served over steamed jasmine rice.',
        price: 590,
        category: 'Asian Specialties',
        image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rDragonfly._id,
        name: 'Dan Dan Noodles with Chili Garlic Crisp',
        description: 'Fresh wheat noodles tossed in roasted sesame paste, chili oil, bok choy, and crushed peanuts.',
        price: 510,
        category: 'Asian Specialties',
        image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: false,
        addOns: []
      },
      {
        restaurantId: rDragonfly._id,
        name: 'Wok-Tossed Black Pepper Lamb',
        description: 'Sliced tender lamb tenderloin seared with crushed Tellicherry black peppercorns, scallions, and oyster sauce.',
        price: 680,
        category: 'Asian Specialties',
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: false,
        addOns: []
      },
      {
        restaurantId: rDragonfly._id,
        name: 'Mango Coconut Sago Pudding',
        description: 'Chilled Alphonso mango purée with soft tapioca pearls and light coconut cream drizzle.',
        price: 310,
        category: 'Desserts',
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: []
      },

      // 8. La Taquería Oaxaqueña (7 items across 3 categories)
      {
        restaurantId: rTaqueria._id,
        name: 'Birria Beef Quesatacos with Consomé (3 pcs)',
        description: 'Crisp griddled corn tortillas dipped in chili broth, filled with melted Oaxaca cheese, shredded beef shank, cilantro, and limes.',
        price: 520,
        category: 'Hand-Pressed Tacos',
        image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: [
          { name: 'Extra Chili Consomé Cup', price: 60, isAvailable: true },
          { name: 'Fresh Hass Guacamole', price: 90, isAvailable: true }
        ]
      },
      {
        restaurantId: rTaqueria._id,
        name: 'Al Pastor Tacos with Grilled Pineapple (3 pcs)',
        description: 'Achiote-marinated pork roasted on spit, sliced over warm corn tortillas with salsa verde and cilantro.',
        price: 490,
        category: 'Hand-Pressed Tacos',
        image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rTaqueria._id,
        name: 'Baja Crispy Fish Tacos with Chipotle Crema (3 pcs)',
        description: 'Beer-battered fish fillets with shredded cabbage, pico de gallo, and smoky chipotle aioli.',
        price: 540,
        category: 'Hand-Pressed Tacos',
        image: 'https://images.unsplash.com/photo-1512838243191-e81e88c01842?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rTaqueria._id,
        name: 'Chipotle Black Bean & Roasted Corn Tacos (3 pcs)',
        description: 'Simmered spiced black beans, char-grilled corn salsa, creamy avocado slices, and cotija cheese.',
        price: 420,
        category: 'Hand-Pressed Tacos',
        image: 'https://images.unsplash.com/photo-1584536286788-78ae83c4c50e?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: false,
        addOns: []
      },
      {
        restaurantId: rTaqueria._id,
        name: 'Loaded Carne Asada Nachos',
        description: 'House-fried yellow corn totopos smothered in queso fundido, grilled steak cubes, jalapeños, and guacamole.',
        price: 580,
        category: 'Antojitos (Small Bites)',
        image: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rTaqueria._id,
        name: 'Fresh Guacamole & Crispy Totopos',
        description: 'Mortar-pestled Hass avocados with serrano chilies, lime juice, cilantro, served with crisp corn chips.',
        price: 390,
        category: 'Antojitos (Small Bites)',
        image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rTaqueria._id,
        name: 'Churros con Dulce de Leche',
        description: 'Crisp golden Mexican pastry sticks dusted in cinnamon sugar, served with warm house-made dulce de leche.',
        price: 310,
        category: 'Postres (Desserts)',
        image: 'https://images.unsplash.com/photo-1624371414361-e670edf4898d?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: []
      },

      // 9. Sweet Cacao Patisserie (7 items across 3 categories)
      {
        restaurantId: rCacao._id,
        name: 'Valrhona 70% Dark Chocolate Lava Dome',
        description: 'Warm French molten chocolate cake with gooey liquid core, served with vanilla bean crème anglaise.',
        price: 380,
        category: 'Desserts & Cakes',
        image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: [{ name: 'Madagascar Vanilla Bean Gelato Scoop', price: 80, isAvailable: true }]
      },
      {
        restaurantId: rCacao._id,
        name: 'San Sebastián Basque Burnt Cheesecake',
        description: 'Caramelized crust with velvety molten custard center, served with wild berry reduction.',
        price: 360,
        category: 'Desserts & Cakes',
        image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rCacao._id,
        name: 'Pistachio Raspberry Opera Cake Slice',
        description: 'Almond jaconde sponge soaked in coffee syrup, layered with Sicilian pistachio buttercream and dark ganache.',
        price: 390,
        category: 'Desserts & Cakes',
        image: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rCacao._id,
        name: 'Hazelnut Praline Mille-Feuille',
        description: 'Three crisp layers of caramelized inverted puff pastry filled with roasted Piedmont hazelnut mousseline.',
        price: 410,
        category: 'Desserts & Cakes',
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: false,
        addOns: []
      },
      {
        restaurantId: rCacao._id,
        name: 'Signature Parisian Macaron Box (4 pcs)',
        description: 'Delicate almond meringue shells filled with chocolate ganache, salted caramel, pistachio, and raspberry.',
        price: 360,
        category: 'Macarons & Petit Fours',
        image: 'https://images.unsplash.com/photo-1569864321390-344c203b5443?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rCacao._id,
        name: 'Passionfruit White Chocolate Éclair',
        description: 'Crisp choux pastry piped with tangy passionfruit curd, glazed with ivory chocolate.',
        price: 290,
        category: 'Macarons & Petit Fours',
        image: 'https://images.unsplash.com/photo-1612203985729-70726954388c?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: false,
        addOns: []
      },
      {
        restaurantId: rCacao._id,
        name: 'Spiced Parisian Hot Chocolate',
        description: 'Thick molten drinking chocolate made with 66% Caribbean chocolate, Ceylon cinnamon, and sea salt.',
        price: 280,
        category: 'Artisanal Beverages',
        image: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: []
      },

      // 10. Koshur Saal Wazwan (8 items across 4 categories)
      {
        restaurantId: rKoshur._id,
        name: 'Wazwan Mutton Rogan Josh',
        description: 'Tender baby lamb shanks simmered in authentic Kashmiri mawal (cockscomb flower), shallots, and fragrant sun-dried ginger.',
        price: 740,
        category: 'Royal Wazwan',
        image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: [{ name: 'Zafrani Saffron Pulao', price: 160, isAvailable: true }]
      },
      {
        restaurantId: rKoshur._id,
        name: 'Tabak Maaz (Crisp Pan-Fried Ribs)',
        description: 'Baby lamb ribs simmered in spiced milk and saffron, then shallow-fried in clarified Kashmiri desi ghee until crackling crisp.',
        price: 720,
        category: 'Royal Wazwan',
        image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rKoshur._id,
        name: 'Gushtaba (Silken Cardamom Meatball)',
        description: 'Mutton pounded on stone blocks to a silky paste, shaped into large dumplings and simmered in velvety curd gravy.',
        price: 760,
        category: 'Royal Wazwan',
        image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rKoshur._id,
        name: 'Rista (Spiced Saffron Meatballs)',
        description: 'Stone-pounded mutton meatballs cooked in aromatic fiery red gravy flavored with Kashmiri shallots and dried mint.',
        price: 740,
        category: 'Royal Wazwan',
        image: 'https://images.unsplash.com/photo-1545247181-516773cae754?auto=format&fit=crop&w=600&q=80',
        isVeg: false,
        isPopular: false,
        addOns: []
      },
      {
        restaurantId: rKoshur._id,
        name: 'Nadru Yakhni (Lotus Stem in Mint Curd)',
        description: 'Sliced Dal Lake lotus root simmered gently in light yogurt sauce flavored with green cardamom and fennel seeds.',
        price: 510,
        category: 'Vegetarian Wazwan',
        image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rKoshur._id,
        name: 'Dum Olav (Kashmiri Dum Aloo)',
        description: 'Baby potatoes deep-fried, pricked, and slow cooked in pungent red chili and ginger gravy until completely infused.',
        price: 460,
        category: 'Vegetarian Wazwan',
        image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: []
      },
      {
        restaurantId: rKoshur._id,
        name: 'Kashmiri Zafrani Saffron Pulao',
        description: 'Long-grain basmati cooked in rich saffron water with fried raisins, cashews, and slivered almonds.',
        price: 260,
        category: 'Wazwan Accompaniments',
        image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: false,
        addOns: []
      },
      {
        restaurantId: rKoshur._id,
        name: 'Traditional Saffron Almond Kahwa',
        description: 'Brewed green tea leaves infused with saffron strands, crushed green cardamom pods, cinnamon, and diced almonds.',
        price: 180,
        category: 'Traditional Beverages',
        image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80',
        isVeg: true,
        isPopular: true,
        addOns: []
      }
    ];

    // Safely refresh menu items for seeded restaurants
    console.log(`[Seed] Inserting ${menuItemsData.length} artisanal dishes across 10 kitchens...`);
    await MenuItem.deleteMany({ restaurantId: { $in: seededRestaurants.map(r => r._id) } });
    const seededMenuItems = await MenuItem.insertMany(menuItemsData);

    console.log('[Seed] Ensuring promotional discount coupons...');
    const offersData = [
      {
        code: 'CRAVE50',
        title: 'Welcome Gourmet Feast',
        description: 'Get 50% OFF up to ₹150 on your CRAVE order',
        discountPercentage: 50,
        maxDiscount: 150,
        minOrderAmount: 299,
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        isActive: true
      },
      {
        code: 'FEAST20',
        title: 'Weekend Indulgence',
        description: 'Enjoy 20% OFF on all culinary signatures',
        discountPercentage: 20,
        maxDiscount: 200,
        minOrderAmount: 499,
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        isActive: true
      },
      {
        code: 'GOURMET100',
        title: 'Artisanal Privilege',
        description: 'Flat ₹100 OFF on orders above ₹500',
        discountPercentage: 15,
        maxDiscount: 100,
        minOrderAmount: 500,
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        isActive: true
      }
    ];

    for (const off of offersData) {
      await Offer.findOneAndUpdate({ code: off.code }, { $set: off }, { upsert: true });
    }

    // Check if any order exists; if none exist, seed an initial demo order
    const orderCount = await Order.countDocuments();
    if (orderCount === 0) {
      console.log('[Seed] Seeding initial active demo order for live tracking...');
      const demoItem1 = seededMenuItems[0]; // Truffle Burrata Pizza
      const demoItem2 = seededMenuItems[2]; // Tagliolini

      await Order.create({
        customerId: customer._id,
        restaurantId: rBellini._id,
        partnerId: partner1._id,
        items: [
          {
            menuItemId: demoItem1._id,
            name: demoItem1.name,
            price: demoItem1.price,
            quantity: 1,
            selectedAddOns: [{ name: 'Extra Bufala Mozzarella', price: 120 }],
            itemTotal: 800
          },
          {
            menuItemId: demoItem2._id,
            name: demoItem2.name,
            price: demoItem2.price,
            quantity: 1,
            selectedAddOns: [],
            itemTotal: 590
          }
        ],
        amountBreakup: {
          itemSubtotal: 1390,
          taxes: 69.5,
          deliveryFee: 35,
          platformFee: 15,
          packagingFee: 25,
          discountAmount: 150,
          totalAmount: 1379.5
        },
        deliveryAddress: {
          addressLine: 'Apt 8B, Ivory Heights, Barakhamba Road',
          city: 'New Delhi',
          pincode: '110001',
          contactPhone: '+91 98765 43210',
          location: {
            type: 'Point',
            coordinates: [77.2245, 28.6295]
          }
        },
        paymentMode: PAYMENT_MODES.ONLINE,
        paymentStatus: PAYMENT_STATUS.PAID,
        paymentReference: {
          transactionId: 'PAY_DEMO_LIVE_TRACK_INIT',
          gateway: 'RAZORPAY_SANDBOX',
          method: 'UPI',
          verifiedAt: new Date()
        },
        status: ORDER_STATUS.OUT_FOR_DELIVERY,
        prepTimeMins: 25,
        estimatedDeliveryTime: new Date(Date.now() + 20 * 60000),
        statusHistory: [
          { status: ORDER_STATUS.PLACED, actor: { userId: customer._id, role: ROLES.CUSTOMER, name: customer.name }, timestamp: new Date(Date.now() - 30 * 60000) },
          { status: ORDER_STATUS.ACCEPTED, actor: { userId: owner1._id, role: ROLES.RESTAURANT, name: owner1.name }, timestamp: new Date(Date.now() - 25 * 60000) },
          { status: ORDER_STATUS.PREPARING, actor: { userId: owner1._id, role: ROLES.RESTAURANT, name: owner1.name }, timestamp: new Date(Date.now() - 20 * 60000) },
          { status: ORDER_STATUS.READY_FOR_PICKUP, actor: { userId: owner1._id, role: ROLES.RESTAURANT, name: owner1.name }, timestamp: new Date(Date.now() - 10 * 60000) },
          { status: ORDER_STATUS.PICKED_UP, actor: { userId: partner1._id, role: ROLES.DELIVERY_PARTNER, name: partner1.name }, timestamp: new Date(Date.now() - 5 * 60000) },
          { status: ORDER_STATUS.OUT_FOR_DELIVERY, actor: { userId: partner1._id, role: ROLES.DELIVERY_PARTNER, name: partner1.name }, timestamp: new Date() }
        ]
      });
    }

    console.log('====================================================');
    console.log('✨ CRAVE Idempotent Database Seeding Completed!');
    console.log(`✨ Total Kitchens: ${seededRestaurants.length}`);
    console.log(`✨ Total Menu Items Seeded: ${seededMenuItems.length}`);
    console.log('====================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seedDatabase();
