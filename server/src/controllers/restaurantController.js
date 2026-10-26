const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const { calculateDistanceKm, calculateEtaMinutes } = require('../services/distanceService');
const { checkRestaurantServiceability } = require('../services/serviceabilityService');

// GET /api/restaurants/cuisines
exports.getDistinctCuisines = async (req, res, next) => {
  try {
    const cuisines = await Restaurant.distinct('cuisines');
    res.status(200).json({
      success: true,
      cuisines: cuisines.sort()
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/restaurants/categories
exports.getDistinctCategories = async (req, res, next) => {
  try {
    const categories = await MenuItem.distinct('category');
    // Also fetch sample item image for each category dynamically
    const categoriesWithImages = await Promise.all(
      categories.map(async (cat) => {
        const sampleItem = await MenuItem.findOne({ category: cat }).select('image name');
        return {
          name: cat,
          image: sampleItem ? sampleItem.image : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
          query: cat
        };
      })
    );

    res.status(200).json({
      success: true,
      categories: categoriesWithImages
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/restaurants
exports.getAllRestaurants = async (req, res, next) => {
  try {
    const { search, cuisine, rating, isVeg, maxPrice, isOpen, sort } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { cuisines: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    if (cuisine) {
      query.cuisines = { $in: [new RegExp(cuisine, 'i')] };
    }

    if (rating) {
      query.rating = { $gte: Number(rating) };
    }

    if (isVeg === 'true') {
      query.isPureVeg = true;
    }

    if (maxPrice) {
      query.priceForTwo = { $lte: Number(maxPrice) };
    }

    if (isOpen !== undefined) {
      query.isOpen = isOpen === 'true';
    }

    let sortOption = { rating: -1 };
    if (sort === 'deliveryTime') sortOption = { prepTimeMins: 1 };
    else if (sort === 'priceLow') sortOption = { priceForTwo: 1 };
    else if (sort === 'priceHigh') sortOption = { priceForTwo: -1 };
    else if (sort === 'rating') sortOption = { rating: -1 };

    const restaurants = await Restaurant.find(query).sort(sortOption);

    res.status(200).json({
      success: true,
      count: restaurants.length,
      data: restaurants
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/restaurants/nearby?lat=&lng=&radius=
// Geospatial query utilizing 2dsphere index and $near operator
exports.getNearbyRestaurants = async (req, res, next) => {
  try {
    const { lat, lng, radius = 15, cuisine, isVeg, maxPrice, rating } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both latitude and longitude query parameters.'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusMeters = parseFloat(radius) * 1000; // Convert km to meters

    // Construct geospatial query with MongoDB $near operator on 2dsphere index
    const geoQuery = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude] // GeoJSON standard: [longitude, latitude]
          },
          $maxDistance: radiusMeters
        }
      }
    };

    if (cuisine) {
      geoQuery.cuisines = { $in: [new RegExp(cuisine, 'i')] };
    }

    if (isVeg === 'true') {
      geoQuery.isPureVeg = true;
    }

    if (maxPrice) {
      geoQuery.priceForTwo = { $lte: Number(maxPrice) };
    }

    if (rating) {
      geoQuery.rating = { $gte: Number(rating) };
    }

    const restaurants = await Restaurant.find(geoQuery);

    // Compute accurate distance and estimated delivery time for each restaurant
    const restaurantsWithDistance = restaurants.map(r => {
      const distance = calculateDistanceKm([longitude, latitude], r.location.coordinates);
      const eta = calculateEtaMinutes(r.prepTimeMins, distance);
      const rObj = r.toObject();
      return {
        ...rObj,
        distanceKm: distance,
        estimatedDeliveryMins: eta
      };
    });

    res.status(200).json({
      success: true,
      count: restaurantsWithDistance.length,
      center: { latitude, longitude, radiusKm: Number(radius) },
      data: restaurantsWithDistance
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/restaurants/:id
exports.getRestaurantById = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const menuItems = await MenuItem.find({ restaurantId: restaurant._id });

    // Group menu by categories
    const categoriesMap = {};
    menuItems.forEach(item => {
      if (!categoriesMap[item.category]) {
        categoriesMap[item.category] = [];
      }
      categoriesMap[item.category].push(item);
    });

    // Sanitize sensitive owner ID from public response
    const sanitizedRestaurant = restaurant.toObject();
    delete sanitizedRestaurant.ownerId;

    res.status(200).json({
      success: true,
      restaurant: sanitizedRestaurant,
      categories: categoriesMap,
      menuItems
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/restaurants/:id/check-serviceability
exports.checkServiceability = async (req, res, next) => {
  try {
    const pincode = req.body.pincode || req.body.deliveryAddress?.pincode;
    const coordinates = req.body.coordinates || req.body.deliveryAddress?.coordinates;
    const addressLine = req.body.addressLine || req.body.deliveryAddress?.street || req.body.deliveryAddress?.addressLine;
    const city = req.body.city || req.body.deliveryAddress?.city;

    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const serviceResult = checkRestaurantServiceability(restaurant, {
      pincode,
      coordinates,
      addressLine,
      city
    });

    res.status(200).json({
      success: true,
      serviceable: serviceResult.serviceable,
      distanceKm: serviceResult.distanceKm,
      maxRadiusKm: serviceResult.maxRadiusKm,
      pincode: serviceResult.pincode || pincode || null,
      estimatedDeliveryMins: serviceResult.estimatedDeliveryMins,
      deliveryFee: serviceResult.deliveryFee,
      code: serviceResult.code || null,
      reason: serviceResult.reason,
      message: serviceResult.message
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/restaurants/:id/service-area or /api/restaurants/my/service-area
// Allows restaurant owners and admins to manage delivery radius and serviceable PIN codes
exports.updateServiceArea = async (req, res, next) => {
  try {
    const { deliveryRadiusKm, serviceablePincodes } = req.body;
    let targetRestaurant = null;

    if (req.params.id && req.params.id !== 'my') {
      targetRestaurant = await Restaurant.findById(req.params.id);
    } else {
      targetRestaurant = await Restaurant.findOne({ ownerId: req.user._id });
    }

    if (!targetRestaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found.' });
    }

    // Authorization check
    const isOwner = targetRestaurant.ownerId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden: You cannot modify this restaurant service area.' });
    }

    if (deliveryRadiusKm !== undefined) {
      const radiusNum = Number(deliveryRadiusKm);
      if (isNaN(radiusNum) || radiusNum <= 0 || radiusNum > 50) {
        return res.status(400).json({ success: false, message: 'deliveryRadiusKm must be a number between 1 and 50 km.' });
      }
      targetRestaurant.deliveryRadiusKm = radiusNum;
    }

    if (serviceablePincodes !== undefined) {
      if (!Array.isArray(serviceablePincodes)) {
        return res.status(400).json({ success: false, message: 'serviceablePincodes must be an array of 6-digit strings.' });
      }
      // Normalize and validate PIN codes
      const validPincodes = serviceablePincodes
        .map(p => p.toString().trim())
        .filter(p => /^[1-9][0-9]{5}$/.test(p));
      targetRestaurant.serviceablePincodes = validPincodes;
    }

    await targetRestaurant.save();

    res.status(200).json({
      success: true,
      message: 'Restaurant delivery service area updated successfully.',
      deliveryRadiusKm: targetRestaurant.deliveryRadiusKm,
      serviceablePincodes: targetRestaurant.serviceablePincodes,
      data: targetRestaurant,
      restaurant: targetRestaurant
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/restaurants/my/dashboard
exports.getMyRestaurantDashboard = async (req, res, next) => {
  try {
    let ownedRestaurants;
    if (req.user.role === 'admin') {
      ownedRestaurants = await Restaurant.find().sort({ name: 1 });
    } else {
      ownedRestaurants = await Restaurant.find({ ownerId: req.user._id });
    }

    if (!ownedRestaurants || ownedRestaurants.length === 0) {
      return res.status(404).json({ success: false, message: 'No restaurant registered for this user.' });
    }

    const requestedRestaurantId = req.query.restaurantId;
    let restaurant = ownedRestaurants[0];
    if (requestedRestaurantId) {
      const match = ownedRestaurants.find(r => r._id.toString() === requestedRestaurantId);
      if (match) restaurant = match;
    }

    // Orders today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayOrders = await Order.find({
      restaurantId: restaurant._id,
      createdAt: { $gte: startOfDay }
    });

    const activeOrders = await Order.find({
      restaurantId: restaurant._id,
      status: { $in: ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'out_for_delivery'] }
    })
      .populate('customerId', 'name phone email')
      .populate('partnerId', 'name phone partnerDetails')
      .sort({ createdAt: -1 });

    const totalDeliveredToday = todayOrders.filter(o => o.status === 'delivered');
    const todayRevenue = totalDeliveredToday.reduce((acc, curr) => acc + (curr.amountBreakup?.itemSubtotal || 0), 0);

    const totalMenuCount = await MenuItem.countDocuments({ restaurantId: restaurant._id });

    res.status(200).json({
      success: true,
      restaurant,
      ownedRestaurants,
      stats: {
        todayOrdersCount: todayOrders.length,
        todayDeliveredCount: totalDeliveredToday.length,
        todayRevenue,
        activeOrdersCount: activeOrders.length,
        menuItemsCount: totalMenuCount
      },
      activeOrders
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/restaurants/my/toggle-status
exports.toggleRestaurantStatus = async (req, res, next) => {
  try {
    const { restaurantId } = req.body;
    let restaurant;
    if (req.user.role === 'admin' && restaurantId) {
      restaurant = await Restaurant.findById(restaurantId);
    } else {
      restaurant = await Restaurant.findOne({ ownerId: req.user._id });
    }
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'No restaurant found for this user.' });
    }

    restaurant.isOpen = !restaurant.isOpen;
    await restaurant.save();

    res.status(200).json({
      success: true,
      message: `Restaurant is now ${restaurant.isOpen ? 'Open for orders' : 'Closed'}`,
      isOpen: restaurant.isOpen
    });
  } catch (error) {
    next(error);
  }
};
