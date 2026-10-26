const MenuItem = require('../models/MenuItem');
const Offer = require('../models/Offer');
const { calculateDeliveryFee } = require('./distanceService');

/**
 * Validates and calculates authoritative order pricing on the server
 */
async function calculateAuthoritativeOrder({ restaurantId, items, offerCode, distanceKm = 3 }) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    const error = new Error('Cart cannot be empty');
    error.statusCode = 400;
    throw error;
  }

  // Extract all item IDs
  const itemIds = items.map(i => i.menuItemId);

  // Fetch items from database belonging to this specific restaurant
  const dbMenuItems = await MenuItem.find({
    _id: { $in: itemIds },
    restaurantId: restaurantId
  });

  if (dbMenuItems.length !== itemIds.length) {
    const error = new Error('One or more items do not belong to this restaurant or do not exist (Single-restaurant cart enforced)');
    error.statusCode = 400;
    throw error;
  }

  const dbItemMap = new Map();
  dbMenuItems.forEach(item => dbItemMap.set(item._id.toString(), item));

  let itemSubtotal = 0;
  const processedItems = [];

  for (const clientItem of items) {
    const dbItem = dbItemMap.get(clientItem.menuItemId.toString());

    if (!dbItem.isAvailable) {
      const error = new Error(`Item "${dbItem.name}" is currently sold out / unavailable`);
      error.statusCode = 400;
      throw error;
    }

    const qty = parseInt(clientItem.quantity, 10);
    if (isNaN(qty) || qty < 1) {
      const error = new Error(`Invalid quantity for "${dbItem.name}"`);
      error.statusCode = 400;
      throw error;
    }

    // Process add-ons
    let addOnsTotal = 0;
    const validatedAddOns = [];

    if (clientItem.selectedAddOns && Array.isArray(clientItem.selectedAddOns)) {
      clientItem.selectedAddOns.forEach(clientAddOn => {
        const matchingDbAddOn = dbItem.addOns.find(a => a.name.toLowerCase() === clientAddOn.name.toLowerCase());
        if (matchingDbAddOn && matchingDbAddOn.isAvailable) {
          addOnsTotal += matchingDbAddOn.price;
          validatedAddOns.push({
            name: matchingDbAddOn.name,
            price: matchingDbAddOn.price
          });
        }
      });
    }

    const unitPriceWithAddOns = dbItem.price + addOnsTotal;
    const itemTotal = unitPriceWithAddOns * qty;
    itemSubtotal += itemTotal;

    processedItems.push({
      menuItemId: dbItem._id,
      name: dbItem.name,
      price: dbItem.price,
      quantity: qty,
      selectedAddOns: validatedAddOns,
      itemTotal: itemTotal
    });
  }

  // Calculate fees
  const deliveryFee = calculateDeliveryFee(distanceKm);
  const packagingFee = 25; // Standard eco-friendly packaging
  const tax = Math.round(itemSubtotal * 0.05 * 100) / 100; // 5% GST

  // Process Offer / Promo Code
  let discount = 0;
  let appliedOffer = null;

  if (offerCode) {
    const offer = await Offer.findOne({
      code: offerCode.trim().toUpperCase(),
      isActive: true,
      validFrom: { $lte: new Date() },
      validUntil: { $gte: new Date() }
    });

    if (offer) {
      if (itemSubtotal >= offer.minOrderAmount) {
        const calculatedDiscount = Math.round((itemSubtotal * offer.discountPercentage) / 100);
        discount = Math.min(calculatedDiscount, offer.maxDiscount);
        appliedOffer = offer.code;
      }
    }
  }

  const totalAmount = Math.max(0, Math.round((itemSubtotal + deliveryFee + packagingFee + tax - discount) * 100) / 100);

  return {
    processedItems,
    amountBreakup: {
      itemSubtotal: Math.round(itemSubtotal * 100) / 100,
      deliveryFee,
      tax,
      packagingFee,
      discount,
      totalAmount
    },
    appliedOffer
  };
}

module.exports = {
  calculateAuthoritativeOrder
};
