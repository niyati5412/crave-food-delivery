const PartnerLocation = require('../models/PartnerLocation');
const Order = require('../models/Order');
const User = require('../models/User');

/**
 * Concurrency-safe algorithm to discover and atomically assign the nearest available delivery partner.
 * 
 * 1. Self-heals stale locks if previously assigned orders have terminated.
 * 2. Uses MongoDB $near geospatial query on 2dsphere index to find candidate partners within maxRadiusMeters.
 * 3. Falls back to wider coverage radius (up to 25km) or any online available courier.
 * 4. Uses atomic findOneAndUpdate with activeOrderId: null to prevent race conditions / duplicate assignment.
 * 
 * @param {Object} order The Order document
 * @param {[number, number]} pickupCoordinates [longitude, latitude] of restaurant
 * @param {number} maxRadiusMeters Search radius in meters (default 10,000m / 10km)
 * @returns {Promise<Object|null>} The assigned partner or null if none available
 */
async function assignNearestPartner(order, pickupCoordinates, maxRadiusMeters = 10000) {
  try {
    if (!pickupCoordinates || pickupCoordinates.length < 2) {
      console.warn('[PartnerAssignment] Invalid pickup coordinates');
      return null;
    }

    // 1. Self-healing check: release any partners whose activeOrderId points to a terminal or abandoned test order
    try {
      const activePartnerLocs = await PartnerLocation.find({ activeOrderId: { $ne: null } });
      for (const pl of activePartnerLocs) {
        const linkedOrder = await Order.findById(pl.activeOrderId);
        const isStaleDevOrder = linkedOrder && (Date.now() - new Date(linkedOrder.updatedAt || linkedOrder.createdAt).getTime() > 10 * 60 * 1000);
        if (!linkedOrder || ['delivered', 'cancelled', 'rejected'].includes(linkedOrder.status) || isStaleDevOrder) {
          await PartnerLocation.findByIdAndUpdate(pl._id, {
            $set: { activeOrderId: null, updatedAt: new Date() }
          });
          console.log(`[PartnerAssignment] Auto-released partner ${pl.partnerId} from terminal/stale order ${pl.activeOrderId}`);
        }
      }
    } catch (healErr) {
      console.warn('[PartnerAssignment] Stale lock check warning:', healErr.message);
    }

    // 2. Sync online status from User collection for all delivery partners
    try {
      const onlinePartnerUsers = await User.find({ role: 'delivery_partner', isAvailable: true, accountStatus: 'active' });
      for (const pUser of onlinePartnerUsers) {
        await PartnerLocation.findOneAndUpdate(
          { partnerId: pUser._id },
          {
            $setOnInsert: {
              location: {
                type: 'Point',
                coordinates: [77.218, 28.631]
              }
            },
            $set: { isOnline: true }
          },
          { upsert: true }
        );
      }
    } catch (syncErr) {
      console.warn('[PartnerAssignment] Partner sync warning:', syncErr.message);
    }

    // 3. Find candidate partners within primary radius (10km) using $near
    let candidateLocations = await PartnerLocation.find({
      isOnline: true,
      activeOrderId: null,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: pickupCoordinates
          },
          $maxDistance: maxRadiusMeters
        }
      }
    }).limit(5);

    // 4. Secondary fallback: widen to 25km if no candidates within 10km
    if (!candidateLocations || candidateLocations.length === 0) {
      console.log(`[PartnerAssignment] No free partners within ${maxRadiusMeters / 1000}km, widening search to 25km...`);
      candidateLocations = await PartnerLocation.find({
        isOnline: true,
        activeOrderId: null,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: pickupCoordinates
            },
            $maxDistance: 25000
          }
        }
      }).limit(5);
    }

    // 5. Final fallback: any free online courier in system
    if (!candidateLocations || candidateLocations.length === 0) {
      candidateLocations = await PartnerLocation.find({
        isOnline: true,
        activeOrderId: null
      }).limit(3);
    }

    if (!candidateLocations || candidateLocations.length === 0) {
      console.log(`[PartnerAssignment] No free partners available anywhere for Order #${order.orderNumber}`);
      return null;
    }

    // 6. Atomic race-free claim loop:
    // Attempt to acquire lock on the nearest partner. If another concurrent order grabbed them first,
    // findOneAndUpdate will return null and we will proceed to the next candidate.
    for (const candidate of candidateLocations) {
      const acquiredPartnerLocation = await PartnerLocation.findOneAndUpdate(
        {
          partnerId: candidate.partnerId,
          isOnline: true,
          activeOrderId: null // Concurrency lock guard
        },
        {
          $set: {
            activeOrderId: order._id,
            updatedAt: new Date()
          }
        },
        { new: true }
      );

      if (acquiredPartnerLocation) {
        // Successfully acquired lock! Link partner to order in MongoDB
        const partnerUser = await User.findById(acquiredPartnerLocation.partnerId).select('name phone partnerDetails');
        
        order.partnerId = acquiredPartnerLocation.partnerId;
        await Order.findByIdAndUpdate(order._id, {
          partnerId: acquiredPartnerLocation.partnerId,
          $push: {
            statusHistory: {
              status: order.status,
              actor: {
                userId: acquiredPartnerLocation.partnerId,
                role: 'delivery_partner',
                name: partnerUser ? partnerUser.name : 'Delivery Partner'
              },
              timestamp: new Date(),
              note: `Partner ${partnerUser ? partnerUser.name : ''} assigned automatically via nearest geospatial match.`
            }
          }
        });

        console.log(`[PartnerAssignment] Successfully assigned partner ${acquiredPartnerLocation.partnerId} to order ${order.orderNumber}`);
        return {
          partnerLocation: acquiredPartnerLocation,
          partnerUser
        };
      }
    }

    console.log(`[PartnerAssignment] All candidates were locked by concurrent requests for Order #${order.orderNumber}`);
    return null;
  } catch (error) {
    console.error('[PartnerAssignment] Error during assignment:', error);
    return null;
  }
}

/**
 * Releases partner from active order upon delivery or cancellation
 */
async function releasePartner(partnerId) {
  if (!partnerId) return;
  await PartnerLocation.findOneAndUpdate(
    { partnerId },
    { $set: { activeOrderId: null, updatedAt: new Date() } }
  );
  console.log(`[PartnerAssignment] Released partner ${partnerId} lock`);
}

module.exports = {
  assignNearestPartner,
  releasePartner
};
