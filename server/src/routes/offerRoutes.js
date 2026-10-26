const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roleGuard');
const { ROLES } = require('../config/constants');

router.get('/', offerController.getActiveOffers);
router.post('/validate', offerController.validateOffer);
router.post('/', authenticate, authorize(ROLES.ADMIN), offerController.createOffer);

module.exports = router;
