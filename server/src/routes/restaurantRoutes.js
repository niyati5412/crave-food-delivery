const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');
const menuController = require('../controllers/menuController');
const orderController = require('../controllers/orderController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roleGuard');
const { ROLES } = require('../config/constants');

// Public restaurant discovery
router.get('/', restaurantController.getAllRestaurants);
router.get('/nearby', restaurantController.getNearbyRestaurants);
router.get('/cuisines', restaurantController.getDistinctCuisines);
router.get('/categories', restaurantController.getDistinctCategories);
router.post('/:id/check-serviceability', restaurantController.checkServiceability);
router.get('/:id', restaurantController.getRestaurantById);

// Restaurant Partner dashboard & operations
router.get('/my/dashboard', authenticate, authorize(ROLES.RESTAURANT, ROLES.ADMIN), restaurantController.getMyRestaurantDashboard);
router.patch('/my/toggle-status', authenticate, authorize(ROLES.RESTAURANT, ROLES.ADMIN), restaurantController.toggleRestaurantStatus);
router.patch('/my/service-area', authenticate, authorize(ROLES.RESTAURANT, ROLES.ADMIN), restaurantController.updateServiceArea);
router.patch('/:id/service-area', authenticate, authorize(ROLES.RESTAURANT, ROLES.ADMIN), restaurantController.updateServiceArea);
router.get('/:id/orders', authenticate, authorize(ROLES.RESTAURANT, ROLES.ADMIN), orderController.getRestaurantOrders);

// Menu management under restaurant
router.post('/:id/menu', authenticate, authorize(ROLES.RESTAURANT, ROLES.ADMIN), menuController.addMenuItem);

module.exports = router;
