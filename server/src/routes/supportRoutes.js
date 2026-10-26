const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roleGuard');
const { ROLES } = require('../config/constants');

router.use(authenticate);

// Customer endpoints
router.post('/', authorize(ROLES.CUSTOMER), supportController.createTicket);
router.get('/', authorize(ROLES.CUSTOMER), supportController.getMyTickets);

// Admin endpoints
router.get('/admin', authorize(ROLES.ADMIN), supportController.getAllTickets);
router.patch('/:id', authorize(ROLES.ADMIN), supportController.updateTicket);

module.exports = router;
