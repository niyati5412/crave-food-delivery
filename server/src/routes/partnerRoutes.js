const express = require('express');
const router = express.Router();
const partnerController = require('../controllers/partnerController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roleGuard');
const { ROLES } = require('../config/constants');

router.use(authenticate);

router.patch('/availability', authorize(ROLES.DELIVERY_PARTNER), partnerController.toggleAvailability);
router.post('/location', authorize(ROLES.DELIVERY_PARTNER), partnerController.updateLocation);
router.get('/dashboard', authorize(ROLES.DELIVERY_PARTNER), partnerController.getPartnerDashboard);
router.get('/available', authorize(ROLES.ADMIN, ROLES.RESTAURANT), partnerController.getAvailablePartners);

module.exports = router;
