const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');
const authenticate = require('../middleware/auth');

router.get('/:id/tracking', authenticate, trackingController.getOrderTracking);
router.get('/:id', authenticate, trackingController.getOrderTracking);

module.exports = router;
