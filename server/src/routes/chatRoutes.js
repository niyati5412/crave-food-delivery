const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authenticate = require('../middleware/auth');

router.use(authenticate);

router.get('/:orderId', chatController.getOrderChat);
router.post('/:orderId', chatController.sendChatMessage);

module.exports = router;
