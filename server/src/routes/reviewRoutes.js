const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authenticate = require('../middleware/auth');

router.get('/order/:orderId', authenticate, reviewController.getOrderReview);
router.post('/partner-feedback', authenticate, reviewController.createPartnerFeedback);
router.get('/partner-feedback', authenticate, reviewController.getPartnerFeedbacks);
router.get('/:restaurantId', reviewController.getRestaurantReviews);
router.post('/', authenticate, reviewController.createReview);

module.exports = router;
