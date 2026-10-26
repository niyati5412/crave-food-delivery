const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roleGuard');
const { ROLES } = require('../config/constants');

router.patch('/:id', authenticate, authorize(ROLES.RESTAURANT, ROLES.ADMIN), menuController.updateMenuItem);
router.patch('/:id/availability', authenticate, authorize(ROLES.RESTAURANT, ROLES.ADMIN), menuController.toggleItemAvailability);
router.delete('/:id', authenticate, authorize(ROLES.RESTAURANT, ROLES.ADMIN), menuController.deleteMenuItem);

module.exports = router;
