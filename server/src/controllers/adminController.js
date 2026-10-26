const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const Settlement = require('../models/Settlement');

// GET /api/admin/stats
exports.getPlatformStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'customer' });
    const totalRestaurants = await Restaurant.countDocuments();
    const totalPartners = await User.countDocuments({ role: 'delivery_partner' });
    const totalOrders = await Order.countDocuments();

    const deliveredOrders = await Order.find({ status: 'delivered' });
    const platformGMV = deliveredOrders.reduce((sum, o) => sum + (o.amountBreakup.totalAmount || 0), 0);
    const platformCommission = deliveredOrders.reduce((sum, o) => sum + Math.round((o.amountBreakup.itemSubtotal || 0) * 0.15), 0);

    const activeOrdersCount = await Order.countDocuments({
      status: { $in: ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'out_for_delivery'] }
    });

    const recentOrders = await Order.find()
      .populate('customerId', 'name email phone')
      .populate('restaurantId', 'name address')
      .populate('partnerId', 'name phone')
      .sort({ createdAt: -1 })
      .limit(25);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalRestaurants,
        totalPartners,
        totalOrders,
        activeOrdersCount,
        platformGMV,
        platformCommission
      },
      recentOrders
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/orders
exports.getAllOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 25, status, search, restaurantId, dateFrom, dateTo } = req.query;
    const query = {};

    if (status && status !== 'all') {
      if (status === 'active') {
        query.status = { $in: ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'out_for_delivery'] };
      } else {
        query.status = status;
      }
    }

    if (restaurantId) {
      query.restaurantId = restaurantId;
    }

    if (search && search.trim()) {
      const trimmed = search.trim();
      query.$or = [
        { orderNumber: { $regex: trimmed, $options: 'i' } },
        { 'deliveryAddress.addressLine': { $regex: trimmed, $options: 'i' } },
        { 'deliveryAddress.pincode': { $regex: trimmed, $options: 'i' } }
      ];
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('customerId', 'name email phone')
      .populate('restaurantId', 'name address location')
      .populate('partnerId', 'name phone partnerDetails')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      count: orders.length,
      orders
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/users
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    const query = {};
    if (role && role !== 'all') {
      query.role = role;
    }
    if (status && status !== 'all') {
      query.accountStatus = status;
    }
    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
        { phone: { $regex: search.trim(), $options: 'i' } }
      ];
    }
    const users = await User.find(query).select('-passwordHash -resetPasswordToken -resetPasswordExpires').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/users/:id/status
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const { accountStatus } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (accountStatus) {
      user.accountStatus = accountStatus;
    } else {
      user.accountStatus = user.accountStatus === 'active' ? 'suspended' : 'active';
    }
    await user.save();

    // Synchronize associated restaurant status if owner account changes
    if (user.role === 'restaurant') {
      const restStatus = user.accountStatus === 'active' ? 'approved' : user.accountStatus === 'pending' ? 'pending' : 'suspended';
      await Restaurant.findOneAndUpdate(
        { ownerId: user._id },
        { status: restStatus, isOpen: user.accountStatus === 'active' }
      );
    }

    // Synchronize delivery partner verification if applicable
    if (user.role === 'delivery_partner') {
      if (!user.partnerDetails) user.partnerDetails = {};
      user.partnerDetails.isVerified = user.accountStatus === 'active';
      await user.save();
      const PartnerLocation = require('../models/PartnerLocation');
      await PartnerLocation.findOneAndUpdate(
        { partnerId: user._id },
        { isOnline: user.accountStatus === 'active' }
      );
    }

    res.status(200).json({
      success: true,
      message: `User status updated to ${user.accountStatus}`,
      user
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/settlements
exports.getSettlements = async (req, res, next) => {
  try {
    const settlements = await Settlement.find()
      .populate('restaurantId', 'name')
      .populate('orderId', 'orderNumber amountBreakup createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: settlements.length,
      settlements
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/restaurants
exports.getAllRestaurants = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { 'address.city': { $regex: search.trim(), $options: 'i' } },
        { cuisines: { $regex: search.trim(), $options: 'i' } }
      ];
    }
    const restaurants = await Restaurant.find(query)
      .populate('ownerId', 'name email phone accountStatus')
      .sort({ createdAt: -1 });

    const MenuItem = require('../models/MenuItem');
    const enhanced = await Promise.all(restaurants.map(async (r) => {
      const menuCount = await MenuItem.countDocuments({ restaurantId: r._id });
      return {
        ...r.toObject(),
        menuItemCount: menuCount
      };
    }));

    res.status(200).json({
      success: true,
      count: enhanced.length,
      restaurants: enhanced
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/restaurants/:id/status
exports.updateRestaurantStatus = async (req, res, next) => {
  try {
    const { status, isOpen, applicationNotes } = req.body;
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }
    if (status) restaurant.status = status;
    if (typeof isOpen === 'boolean') restaurant.isOpen = isOpen;
    if (applicationNotes !== undefined) restaurant.applicationNotes = applicationNotes;
    await restaurant.save();

    // If restaurant status changes, synchronize owner's accountStatus
    if (restaurant.ownerId) {
      if (status === 'approved') {
        await User.findByIdAndUpdate(restaurant.ownerId, { accountStatus: 'active' });
      } else if (status === 'rejected' || status === 'suspended') {
        await User.findByIdAndUpdate(restaurant.ownerId, { accountStatus: 'suspended' });
      } else if (status === 'pending') {
        await User.findByIdAndUpdate(restaurant.ownerId, { accountStatus: 'pending' });
      }
    }

    res.status(200).json({
      success: true,
      message: `Restaurant status updated to ${restaurant.status}`,
      restaurant
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/restaurants/:id/coverage
exports.updateRestaurantCoverage = async (req, res, next) => {
  try {
    const { deliveryRadiusKm, serviceablePincodes } = req.body;
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }
    if (deliveryRadiusKm !== undefined) {
      restaurant.deliveryRadiusKm = Number(deliveryRadiusKm);
    }
    if (Array.isArray(serviceablePincodes)) {
      restaurant.serviceablePincodes = serviceablePincodes.map(p => String(p).trim());
    }
    await restaurant.save();

    res.status(200).json({
      success: true,
      message: 'Restaurant delivery coverage updated successfully',
      restaurant
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/admin/restaurants/:id/menu
exports.getRestaurantMenu = async (req, res, next) => {
  try {
    const MenuItem = require('../models/MenuItem');
    const items = await MenuItem.find({ restaurantId: req.params.id }).sort({ category: 1, name: 1 });
    res.status(200).json({
      success: true,
      count: items.length,
      items
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/admin/users/:id/partner-approval
exports.updatePartnerApproval = async (req, res, next) => {
  try {
    const { isVerified, accountStatus } = req.body;
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'delivery_partner') {
      return res.status(404).json({ success: false, message: 'Delivery partner not found' });
    }
    if (typeof isVerified === 'boolean') {
      if (!user.partnerDetails) user.partnerDetails = {};
      user.partnerDetails.isVerified = isVerified;
    }
    if (accountStatus) {
      user.accountStatus = accountStatus;
    } else if (isVerified === true) {
      user.accountStatus = 'active';
    } else if (isVerified === false) {
      user.accountStatus = 'pending';
    }
    await user.save();

    const PartnerLocation = require('../models/PartnerLocation');
    await PartnerLocation.findOneAndUpdate(
      { partnerId: user._id },
      { isOnline: user.accountStatus === 'active' }
    );

    res.status(200).json({
      success: true,
      message: `Partner approval status updated (${user.accountStatus})`,
      user
    });
  } catch (error) {
    next(error);
  }
};
