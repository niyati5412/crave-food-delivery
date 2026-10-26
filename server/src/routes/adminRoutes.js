const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roleGuard');
const { ROLES } = require('../config/constants');

router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/stats', adminController.getPlatformStats);
router.get('/orders', adminController.getAllOrders);
router.get('/users', adminController.getAllUsers);
router.patch('/users/:id/status', adminController.toggleUserStatus);
router.patch('/users/:id/partner-approval', adminController.updatePartnerApproval);
router.get('/settlements', adminController.getSettlements);
router.get('/restaurants', adminController.getAllRestaurants);
router.patch('/restaurants/:id/status', adminController.updateRestaurantStatus);
router.patch('/restaurants/:id/coverage', adminController.updateRestaurantCoverage);
router.get('/restaurants/:id/menu', adminController.getRestaurantMenu);

module.exports = router;
