const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const trackingController = require('../controllers/trackingController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roleGuard');
const { ROLES } = require('../config/constants');

router.use(authenticate);

router.post('/', authorize(ROLES.CUSTOMER), orderController.createOrder);
router.post('/create-payment-order', authorize(ROLES.CUSTOMER), orderController.createPaymentOrder);
router.post('/verify-payment', authorize(ROLES.CUSTOMER), orderController.verifyPayment);
router.get('/', orderController.getOrders);
router.get('/active', orderController.getActiveOrders);
router.get('/my/current', authorize(ROLES.CUSTOMER), orderController.getCurrentCustomerOrder);
router.get('/:id/tracking', trackingController.getOrderTracking);
router.get('/:id/track', trackingController.getOrderTracking);
router.get('/:id', orderController.getOrderById);
router.patch('/:id/status', orderController.updateOrderStatus);
router.post('/:id/deliver-with-otp', authorize(ROLES.DELIVERY_PARTNER, ROLES.ADMIN), orderController.deliverWithOtp);
router.post('/:id/assign-partner', authorize(ROLES.RESTAURANT, ROLES.ADMIN), orderController.assignOrderPartner);

module.exports = router;
