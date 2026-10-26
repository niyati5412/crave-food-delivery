const { calculateDistanceKm, calculateEtaMinutes } = require('./distanceService');

/**
 * Authoritative Delivery Serviceability Check
 * 
 * Verifies whether a given delivery address is covered by a restaurant's configured service area.
 * 
 * Rules:
 * 1. Checks that the restaurant has an active service-area configuration (deliveryRadiusKm and/or serviceablePincodes).
 *    A restaurant with neither configured fails safely: does not deliver anywhere.
 * 2. Validates the 6-digit Indian postal PIN code format (/^[1-9][0-9]{5}$/).
 *    A valid PIN format does NOT imply delivery availability.
 * 3. If serviceablePincodes is configured:
 *    - The customer's 6-digit PIN must explicitly match the restaurant's list.
 *    - If not in the list, delivery is rejected.
 * 4. If deliveryRadiusKm is configured:
 *    - Checks geospatial distance between restaurant location and customer address coordinates.
 *    - If distanceKm > deliveryRadiusKm, delivery is rejected.
 * 5. Returns authoritative result with standardized message:
 *    "Sorry, this restaurant does not deliver to your selected address yet."
 * 
 * @param {Object} restaurant The Restaurant mongoose document or plain object
 * @param {Object} deliveryAddress { pincode, coordinates, addressLine, city }
 * @returns {Object} { serviceable: boolean, reason: string|null, distanceKm: number|null, maxRadiusKm: number, deliveryFee: number, estimatedDeliveryMins: number, message: string }
 */
function checkRestaurantServiceability(restaurant, deliveryAddress) {
  if (!restaurant) {
    return {
      serviceable: false,
      reason: 'Restaurant not found.',
      distanceKm: null,
      maxRadiusKm: 0,
      deliveryFee: 0,
      estimatedDeliveryMins: 0,
      message: 'Restaurant not found.'
    };
  }

  // 1. Service Area Configuration Check
  // Do NOT treat missing configuration as permission to deliver everywhere.
  const hasRadiusConfig = typeof restaurant.deliveryRadiusKm === 'number' && restaurant.deliveryRadiusKm > 0;
  const hasPincodeConfig = Array.isArray(restaurant.serviceablePincodes) && restaurant.serviceablePincodes.length > 0;

  if (!hasRadiusConfig && !hasPincodeConfig) {
    return {
      serviceable: false,
      reason: 'Sorry, this restaurant does not deliver to your selected address yet.',
      distanceKm: null,
      maxRadiusKm: 0,
      deliveryFee: 0,
      estimatedDeliveryMins: 0,
      message: 'Sorry, this restaurant does not deliver to your selected address yet.'
    };
  }

  // 2. Validate Postal PIN Code format
  const rawPincode = deliveryAddress?.pincode ? deliveryAddress.pincode.toString().trim() : '';
  const isValidFormat = /^[1-9][0-9]{5}$/.test(rawPincode);

  if (!isValidFormat) {
    return {
      serviceable: false,
      code: 'INVALID_PINCODE_FORMAT',
      reason: 'Invalid postal PIN code. Please provide a valid 6-digit Indian postal PIN code.',
      distanceKm: null,
      maxRadiusKm: restaurant.deliveryRadiusKm || 0,
      deliveryFee: 0,
      estimatedDeliveryMins: 0,
      message: 'Invalid postal PIN code. Please provide a valid 6-digit Indian postal PIN code.'
    };
  }

  // 3. Check Explicit Serviceable PIN Codes if configured
  if (hasPincodeConfig) {
    const normalizedServiceable = restaurant.serviceablePincodes.map(p => p.toString().trim());
    if (!normalizedServiceable.includes(rawPincode)) {
      return {
        serviceable: false,
        reason: 'Sorry, this restaurant does not deliver to your selected address yet.',
        distanceKm: null,
        maxRadiusKm: restaurant.deliveryRadiusKm || 0,
        deliveryFee: 0,
        estimatedDeliveryMins: 0,
        pincode: rawPincode,
        message: 'Sorry, this restaurant does not deliver to your selected address yet.'
      };
    }
  }

  // 4. Check Geospatial Delivery Radius if configured
  const maxRadiusKm = restaurant.deliveryRadiusKm || 12;
  let distanceKm = null;
  const userCoords = deliveryAddress?.coordinates || deliveryAddress?.location?.coordinates;

  if (hasRadiusConfig) {
    if (!userCoords || !Array.isArray(userCoords) || userCoords.length < 2 || isNaN(Number(userCoords[0])) || isNaN(Number(userCoords[1]))) {
      // Coordinates could not be confirmed
      return {
        serviceable: false,
        reason: 'Delivery area coordinates could not be confirmed. Please select a verified address or enable location.',
        distanceKm: null,
        maxRadiusKm,
        deliveryFee: 0,
        estimatedDeliveryMins: 0,
        message: 'Delivery area coordinates could not be confirmed. Please select a verified address or enable location.'
      };
    }

    const restCoords = restaurant.location?.coordinates;
    if (!restCoords || !Array.isArray(restCoords) || restCoords.length < 2) {
      return {
        serviceable: false,
        reason: 'Restaurant kitchen coordinates are unavailable.',
        distanceKm: null,
        maxRadiusKm,
        deliveryFee: 0,
        estimatedDeliveryMins: 0,
        message: 'Restaurant kitchen coordinates are unavailable.'
      };
    }

    distanceKm = calculateDistanceKm(restCoords, userCoords);
    if (distanceKm > maxRadiusKm) {
      return {
        serviceable: false,
        reason: 'Sorry, this restaurant does not deliver to your selected address yet.',
        distanceKm,
        maxRadiusKm,
        deliveryFee: 0,
        estimatedDeliveryMins: 0,
        pincode: rawPincode,
        message: 'Sorry, this restaurant does not deliver to your selected address yet.'
      };
    }
  }

  // 5. Address is confirmed serviceable
  const effectiveDistance = distanceKm !== null ? distanceKm : 3;
  const estimatedDeliveryMins = calculateEtaMinutes(restaurant.prepTimeMins || 25, effectiveDistance);
  const deliveryFee = effectiveDistance > 6 ? 45 : 30;

  return {
    serviceable: true,
    reason: null,
    distanceKm,
    maxRadiusKm,
    pincode: rawPincode,
    estimatedDeliveryMins,
    deliveryFee,
    message: `Delivery available! (~${effectiveDistance} km, ETA: ${estimatedDeliveryMins} mins)`
  };
}

module.exports = {
  checkRestaurantServiceability
};
