const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const { ROLES } = require('../config/constants');

// POST /api/restaurants/:id/menu
exports.addMenuItem = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    // Ownership check
    if (req.user.role !== ROLES.ADMIN && restaurant.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not own this restaurant.' });
    }

    const { name, description, price, category, image, isVeg, isPopular, addOns } = req.body;

    if (!name || price === undefined || !category) {
      return res.status(400).json({ success: false, message: 'Name, price, and category are required.' });
    }

    const menuItem = await MenuItem.create({
      restaurantId: restaurant._id,
      name,
      description: description || '',
      price: Number(price),
      category,
      image: image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      isVeg: isVeg !== undefined ? isVeg : false,
      isPopular: !!isPopular,
      addOns: Array.isArray(addOns) ? addOns : []
    });

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      item: menuItem
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/menu/:id
exports.updateMenuItem = async (req, res, next) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    const restaurant = await Restaurant.findById(menuItem.restaurantId);
    if (req.user.role !== ROLES.ADMIN && restaurant.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not own this restaurant.' });
    }

    const { name, description, price, category, image, isVeg, isPopular, isAvailable, addOns } = req.body;

    if (name) menuItem.name = name;
    if (description !== undefined) menuItem.description = description;
    if (price !== undefined) menuItem.price = Number(price);
    if (category) menuItem.category = category;
    if (image) menuItem.image = image;
    if (isVeg !== undefined) menuItem.isVeg = isVeg;
    if (isPopular !== undefined) menuItem.isPopular = isPopular;
    if (isAvailable !== undefined) menuItem.isAvailable = isAvailable;
    if (addOns) menuItem.addOns = addOns;

    await menuItem.save();

    res.status(200).json({
      success: true,
      message: 'Menu item updated successfully',
      item: menuItem
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/menu/:id/availability
exports.toggleItemAvailability = async (req, res, next) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    const restaurant = await Restaurant.findById(menuItem.restaurantId);
    if (req.user.role !== ROLES.ADMIN && restaurant.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not own this restaurant.' });
    }

    menuItem.isAvailable = !menuItem.isAvailable;
    await menuItem.save();

    res.status(200).json({
      success: true,
      message: `Item "${menuItem.name}" is now ${menuItem.isAvailable ? 'In Stock' : 'Sold Out'}`,
      isAvailable: menuItem.isAvailable
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/menu/:id
exports.deleteMenuItem = async (req, res, next) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    const restaurant = await Restaurant.findById(menuItem.restaurantId);
    if (req.user.role !== ROLES.ADMIN && restaurant.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not own this restaurant.' });
    }

    await MenuItem.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
