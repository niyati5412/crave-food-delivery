const Offer = require('../models/Offer');

// GET /api/offers
exports.getActiveOffers = async (req, res, next) => {
  try {
    const offers = await Offer.find({
      isActive: true,
      validUntil: { $gte: new Date() }
    }).sort({ discountPercentage: -1 });

    res.status(200).json({
      success: true,
      count: offers.length,
      offers
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/offers/validate
exports.validateOffer = async (req, res, next) => {
  try {
    const { code, cartAmount } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Offer code is required.' });
    }

    const offer = await Offer.findOne({
      code: code.trim().toUpperCase(),
      isActive: true,
      validUntil: { $gte: new Date() }
    });

    if (!offer) {
      return res.status(404).json({ success: false, message: 'Invalid or expired offer coupon.' });
    }

    if (cartAmount && cartAmount < offer.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `This coupon requires a minimum cart value of ₹${offer.minOrderAmount}.`
      });
    }

    const discount = Math.min(
      Math.round(((cartAmount || 100) * offer.discountPercentage) / 100),
      offer.maxDiscount
    );

    res.status(200).json({
      success: true,
      offer,
      calculatedDiscount: discount,
      message: `Coupon applied: ${offer.discountPercentage}% OFF (₹${discount} discount)`
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/offers (Admin)
exports.createOffer = async (req, res, next) => {
  try {
    const { code, title, description, discountPercentage, maxDiscount, minOrderAmount, validUntil } = req.body;
    const offer = await Offer.create({
      code: code.toUpperCase(),
      title,
      description,
      discountPercentage,
      maxDiscount,
      minOrderAmount,
      validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    res.status(201).json({
      success: true,
      offer
    });
  } catch (error) {
    next(error);
  }
};
