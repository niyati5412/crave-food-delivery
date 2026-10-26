# CRAVE — Backend Evaluation & Viva Examination Guide
**Assigned Project:** Project 14: Food Delivery Platform with Live Order Tracking  
**Evaluation Date:** 27 October  
**Candidate Architecture:** MERN (MongoDB, Express, React, Node.js) + Socket.IO + Leaflet Geospatial  

---

## 1. How does a MongoDB `2dsphere` index work?
### Definition & Theory
A `2dsphere` index supports queries that calculate geometries on an earth-like sphere (WGS84 datum). Coordinates are stored in standard **GeoJSON Point** format:
```json
{
  "type": "Point",
  "coordinates": [longitude, latitude] // Longitude always first (-180 to 180), Latitude second (-90 to 90)
}
```
MongoDB uses hierarchical spatial indexing based on **S2 Geometry Library** (developed by Google), which projects the Earth's spherical surface onto six faces of a cube and recursively subdivides them into multi-level hierarchical Hilbert space-filling curve cells (quad-tree like cells).

### In Our Codebase
- In `server/src/models/Restaurant.js`:
  ```javascript
  restaurantSchema.index({ location: '2dsphere' });
  ```
- In `server/src/models/PartnerLocation.js`:
  ```javascript
  partnerLocationSchema.index({ location: '2dsphere' });
  ```

---

## 2. How does `$near` differ from `$geoWithin`?
| Feature | `$near` Operator | `$geoWithin` Operator |
| :--- | :--- | :--- |
| **Sorting** | Sorts documents automatically from **closest to farthest** from the query point. | Does **NOT** sort by distance. Returns all documents located strictly inside geometry. |
| **Index Requirement** | **Strictly requires** a geospatial index (`2dsphere` or `2d`). Fails without it. | Can work without an index (though `2dsphere` speeds it up substantially). |
| **Max Distance** | Uses `$maxDistance` (in meters for `2dsphere`). | Uses bounded shape primitives: `$geometry: Polygon`, `$centerSphere`, `$box`. |
| **Use Case in CRAVE** | Discovering closest restaurants and finding nearest delivery partner (`server/src/controllers/restaurantController.js` and `server/src/services/partnerAssignmentService.js`). | Bounding-box search when the user drags/pans the map viewport or city polygon delivery zones. |

---

## 3. How is the nearest available delivery partner selected?
### In Our Codebase: `server/src/services/partnerAssignmentService.js`
1. When a restaurant accepts an order, `assignNearestPartner(order, restaurantCoords, maxRadiusMeters = 10000)` executes.
2. It runs a `$near` geospatial query on `PartnerLocation` with two business availability filters:
   ```javascript
   const candidates = await PartnerLocation.find({
     isOnline: true,
     activeOrderId: null, // Exclude partners already on an order
     location: {
       $near: {
         $geometry: { type: 'Point', coordinates: pickupCoordinates },
         $maxDistance: 10000 // 10 km search radius
       }
     }
   }).limit(5);
   ```

---

## 4. How do you prevent assigning one partner to two conflicting orders?
### The Race Condition Problem
If two customers place orders at the exact same millisecond near the same lone delivery partner, a naive read-then-write approach (`if (!partner.activeOrderId) partner.activeOrderId = orderId; await partner.save()`) causes duplicate assignment.

### Our Solution: Atomic Conditional Mutex (`findOneAndUpdate`)
In `server/src/services/partnerAssignmentService.js`:
```javascript
const acquiredPartnerLocation = await PartnerLocation.findOneAndUpdate(
  {
    partnerId: candidate.partnerId,
    isOnline: true,
    activeOrderId: null // Atomic concurrency lock guard
  },
  {
    $set: {
      activeOrderId: order._id,
      updatedAt: new Date()
    }
  },
  { new: true }
);
```
MongoDB's single-document atomicity guarantees that even if 100 concurrent requests try to grab this partner, only **one** transaction succeeds in matching `activeOrderId: null` and updating it. All other concurrent attempts return `null`, prompting the algorithm to step to the next candidate partner.

---

## 5. How do you handle location updates without overwhelming the database and sockets?
### Problem
GPS chips on couriers' phones emit updates every 500ms to 1s. Having 500 active couriers would bombard MongoDB with 1,000 writes/sec and saturate WebSocket threads.

### Our Solution
1. **In-Memory Rate Limiting / Throttle Map:**
   In `server/src/controllers/partnerController.js`:
   ```javascript
   const partnerLocationThrottleMap = new Map();
   const isThrottled = (now - lastUpdate) < 2500; // 2.5 second cadence
   ```
   GPS updates sent faster than 2.5s are skipped from disk writes.
2. **Real-time Event Decoupling:**
   High-frequency ephemeral GPS pings are broadcast directly to the order room (`order:{orderId}`) over WebSockets without blocking or waiting for disk transactions.
3. **Database Checkpointing:**
   Only durable checkpoints (pickup, arrival, delivered status) require full MongoDB transaction writes.

---

## 6. How is the order state machine modeled?
### In Our Codebase: `server/src/config/constants.js` and `server/src/services/orderStateMachine.js`
The lifecycle has strictly enforced state transitions:
```
placed 
  ├──> rejected (by Restaurant)
  ├──> cancelled (by Customer before acceptance)
  └──> accepted (by Restaurant)
         └──> preparing (by Restaurant)
                └──> ready_for_pickup (by Restaurant)
                       └──> picked_up (by Delivery Partner)
                              └──> out_for_delivery (by Delivery Partner)
                                     └──> delivered (by Delivery Partner with customer OTP)
```
Every transition is recorded in `order.statusHistory` with `{ status, actor: { userId, role, name }, timestamp, note }`.

---

## 7. Which role is allowed to perform each status transition?
Enforced by server middleware and `validateTransition()`:
- **`placed` -> `accepted` / `rejected`**: Only the verified owner of the restaurant (`req.user._id === restaurant.ownerId`) or Admin.
- **`accepted` -> `preparing` -> `ready_for_pickup`**: Only the verified restaurant owner or Admin.
- **`ready_for_pickup` -> `picked_up` -> `out_for_delivery` -> `delivered`**: Only the specifically assigned courier (`req.user._id === order.partnerId`) or Admin.
- **`placed` -> `cancelled`**: Customer can cancel **only** while order is in `placed` status. Once kitchen accepts, customer cancellation is rejected by the server (400 Bad Request).

---

## 8. How is the cart restricted to a single restaurant?
Both client and server enforce this:
1. **Frontend (`client/src/redux/cartSlice.js`):**
   When `addItem` is dispatched:
   ```javascript
   if (state.restaurant && state.restaurant._id !== restaurant._id && state.items.length > 0) {
     state.conflictModalOpen = true; // Prompt user to clear previous or cancel
     return;
   }
   ```
2. **Backend Authoritative Validation (`server/src/services/pricingService.js`):**
   The server queries MongoDB:
   ```javascript
   const dbMenuItems = await MenuItem.find({
     _id: { $in: itemIds },
     restaurantId: restaurantId
   });
   if (dbMenuItems.length !== itemIds.length) {
     throw new Error('Single-restaurant cart enforced: item does not belong to this restaurant');
   }
   ```

---

## 9. How is delivery ETA calculated?
### In Our Codebase: `server/src/services/distanceService.js`
1. Calculate distance between Kitchen coordinates and Customer Drop-off coordinates using the **Haversine Great-Circle Formula**:
   $$\text{distance} = 2 R \cdot \arcsin\left(\sqrt{\sin^2(\Delta\phi/2) + \cos\phi_1 \cos\phi_2 \sin^2(\Delta\lambda/2)}\right)$$
2. Transit time estimated assuming average urban delivery speed of 22 km/h:
   $$\text{Transit Minutes} = \left(\frac{\text{Distance Km}}{22}\right) \times 60 + 6 \text{ mins buffer}$$
3. Grand ETA:
   $$\text{Total ETA} = \text{Kitchen Prep Time Mins (e.g. 25m)} + \text{Transit Minutes}$$

---

## 10. What happens when the mapping service is unavailable?
- Our architecture uses **Leaflet with OpenStreetMap / CartoDB raster tiles** as primary tile server.
- If tile servers or vector route APIs fail to return turn-by-turn geometry, CRAVE falls back gracefully:
  1. Calculations continue uninterrupted using the server-side mathematical Haversine formula (does not require external internet calls).
  2. Map pins remain accurately placed using stored GeoJSON coordinates.
  3. Straight-line dashed route and estimated distance remain visible on the Leaflet canvas.

---

## 11. Why is Redis useful for live location data?
- In-memory data store with sub-millisecond read/write latency.
- In-memory commands like `GEOADD`, `GEODIST`, and `GEORADIUS` can track 10,000 couriers without touching slow magnetic or SSD disk I/O.
- Ephemeral GPS positions expire automatically using Redis `EXPIRE` keys (TTL).

---

## 12. How do Socket.IO rooms isolate real-time events?
### In Our Codebase: `server/src/sockets/socketHandler.js`
Socket.IO allows grouping sockets into private channels called **Rooms**.
1. **Authentication Handshake:** JWT is verified before connection is accepted.
2. **Role-Validated Subscriptions:**
   - `socket.join('order:' + orderId)` is permitted **only** if `socket.user` is the customer who placed the order, the owner of the restaurant, the assigned partner, or platform admin.
   - An outsider attempting to join an arbitrary order room is rejected with `error:unauthorized`.
3. Targeted broadcasts:
   ```javascript
   io.to(`order:${orderId}`).emit('partner:location_updated', data);
   ```

---

## 13. How does JWT authentication differ from role-based authorization?
- **Authentication (`auth.js`):** "Who are you?" Validates digital signature of the JSON Web Token, decodes `userId`, and verifies user exists in MongoDB and is active.
- **Authorization (`roleGuard.js`):** "What are you permitted to do?" Checks if the authenticated user's role belongs to the authorized whitelist for the endpoint (`authorize('restaurant', 'admin')`).

---

## 14. How are payment callbacks verified?
- Client success flags (`paymentSuccess: true`) are **never** trusted by the backend.
- Razorpay HMAC SHA256 Signature Verification:
  $$\text{Expected Signature} = \text{HMAC-SHA256}(\text{order\_id} + "|" + \text{payment\_id}, \text{KEY\_SECRET})$$
  The backend recomputes this hash using the secret key and compares it against `razorpay_signature`. Only if they match byte-for-byte is the order marked `PAID`.

---

## 15. How do you protect customer addresses and order information?
1. **Password Hashing:** Passwords hashed with `bcryptjs` with salt work factor 10.
2. **Schema Sanitization:** `userSchema.methods.toJSON` automatically deletes `passwordHash` from all query responses.
3. **Endpoint Authorization Checks:** In `getOrderById`, the server checks:
   ```javascript
   const isCustomer = order.customerId.equals(req.user._id);
   const isPartner = order.partnerId && order.partnerId.equals(req.user._id);
   const isRestaurant = restaurant.ownerId.equals(req.user._id);
   if (!isCustomer && !isPartner && !isRestaurant && !isAdmin) return 403;
   ```
4. **Delivery OTP Verification:** Courier cannot mark order delivered without entering the customer's private 4-digit code.
