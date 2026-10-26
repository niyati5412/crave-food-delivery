/**
 * Calculates great-circle distance between two coordinates using Haversine formula
 * @param {[number, number]} coord1 [longitude, latitude]
 * @param {[number, number]} coord2 [longitude, latitude]
 * @returns {number} distance in kilometers
 */
function calculateDistanceKm(coord1, coord2) {
  if (!coord1 || !coord2 || coord1.length < 2 || coord2.length < 2) return 3.5;

  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

/**
 * Calculates delivery fee based on distance
 * @param {number} distanceKm
 * @returns {number}
 */
function calculateDeliveryFee(distanceKm) {
  const baseFee = 35; // Base fee for up to 3 km
  if (distanceKm <= 3) return baseFee;
  const extraKm = distanceKm - 3;
  return Math.round(baseFee + extraKm * 12);
}

/**
 * Calculates Estimated Time of Arrival (ETA in minutes)
 * @param {number} prepTimeMins
 * @param {number} distanceKm
 * @returns {number}
 */
function calculateEtaMinutes(prepTimeMins = 25, distanceKm = 4) {
  const transitSpeedKmH = 22; // Average urban delivery partner speed
  const transitTimeMins = Math.round((distanceKm / transitSpeedKmH) * 60) + 6; // + 6 min pickup buffer
  return prepTimeMins + transitTimeMins;
}

module.exports = {
  calculateDistanceKm,
  calculateDeliveryFee,
  calculateEtaMinutes
};
