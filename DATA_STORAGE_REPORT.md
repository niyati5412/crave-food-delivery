# CRAVE Food Delivery Platform — Technical Data Storage Report

This factual technical report documents the architecture, database collections, state persistence, API boundaries, and environment configurations of the CRAVE Food Delivery Platform located at `d:\Food-Del-App`.

---

## 1. Database Architecture & Collections

### Database Identity
* **Engine:** MongoDB (Document-Oriented Database)
* **Default Database Name:** `crave_food_delivery`
* **Default Connection Host:** `mongodb://127.0.0.1:27017/crave_food_delivery` (Local MongoDB Daemon, compatible with hosted MongoDB Atlas connection strings via `MONGODB_URI`).

### MongoDB Collections and Data Models

| Collection Name | Mongoose Model | File Location | Purpose & Data Fields Stored |
| :--- | :--- | :--- | :--- |
| **`users`** | `User` | `server/src/models/User.js` | User profiles across all four roles (`customer`, `restaurant`, `delivery_partner`, `admin`). Stores full legal name, normalized email, phone, bcrypt password hash (`passwordHash`), account status, vehicle info for fleet couriers, array of saved delivery addresses (with GeoJSON `Point` coordinates), and single-use password reset token hashes (`passwordResetTokenHash`, `passwordResetExpires`). |
| **`restaurants`** | `Restaurant` | `server/src/models/Restaurant.js` | Gourmet artisanal kitchens. Stores kitchen name, tagline, description, cuisines array, high-res Unsplash image URLs (cover, logo, gallery), street address, GeoJSON location coordinates `[longitude, latitude]` with `2dsphere` spatial indexing, authoritative `deliveryRadiusKm`, explicit `serviceablePincodes` array, average rating, prep time, price for two, open/close status, and owner reference (`ownerId`). |
| **`menuitems`** | `MenuItem` | `server/src/models/MenuItem.js` | Dishes belonging to kitchens. Stores dish name, description, unit price in INR, category name, image URL, dietary classification (`isVeg`), in-stock availability toggle (`isAvailable`), popularity badge, add-ons array (name, price, availability), and foreign key reference (`restaurantId`). |
| **`orders`** | `Order` | `server/src/models/Order.js` | Complete order lifecycle and audit log. Stores human-readable alphanumeric `orderNumber` (e.g. `CRV-184056-532`), customer ID, kitchen ID, courier ID, ordered line items with selected add-ons, structured `amountBreakup` (itemSubtotal, deliveryFee, tax, packagingFee, discount, totalAmount), delivery address snapshot with GeoJSON coordinates, payment mode (`ONLINE` vs `COD`), payment status (`pending`, `paid`, `refunded`), `paymentReference` object (transaction ID, gateway, method, verification timestamp), order lifecycle status, audit trail history (`statusHistory` array with actor role, name, and timestamps), preparation minutes, estimated delivery timestamp, and 4-digit customer handover `deliveryOtp`. |
| **`partnerlocations`** | `PartnerLocation` | `server/src/models/PartnerLocation.js` | Live telemetry tracking of fleet couriers. Stores partner ID, live GeoJSON location point with `2dsphere` spatial index, compass heading in degrees, travel speed in km/h, duty availability (`isOnline`), currently assigned active order ID, and last ping timestamp. |
| **`supporttickets`** | `SupportTicket` | `server/src/models/SupportTicket.js` | Customer care and operational inquiries. Stores customer ID, subject, category (`order_issue`, `payment`, `refund`, `delivery`, `account`, `restaurant`, `other`), optional order ID reference, detailed message, ticket status (`open`, `in_progress`, `resolved`, `closed`), administrative response notes (`adminNotes`), and resolution timestamp. |
| **`offers`** | `Offer` | `server/src/models/Offer.js` | Promotional discount coupons. Stores coupon code (e.g. `CRAVE50`), marketing title, description, discount percentage, maximum cap in INR, minimum order basket threshold, expiration date, and active toggle. |
| **`settlements`** | `Settlement` | `server/src/models/Settlement.js` | Platform financial accounting ledger. Stores kitchen ID, order ID, gross billing total, platform commission rate (15%), net payout due to the kitchen, settlement status (`pending`, `settled`), and transaction processing date. |
| **`chatmessages`** | `ChatMessage` | `server/src/models/ChatMessage.js` | In-app order chat history between customer and courier partner. Stores order ID, sender ID, sender role, sender display name, message body, and message timestamp. |
| **`reviews`** | `Review` | `server/src/models/Review.js` | Customer post-delivery feedback. Stores customer ID, restaurant ID, order ID, 1–5 star rating, feedback commentary, and specific dish ratings. |

---

## 2. API Routes and Data Operations

| Resource Category | API Endpoints | Controller File | Read / Write Type |
| :--- | :--- | :--- | :--- |
| **Authentication & Profile** | `POST /api/auth/register`<br>`POST /api/auth/login`<br>`GET /api/auth/me`<br>`POST /api/auth/address`<br>`DELETE /api/auth/address/:id`<br>`POST /api/auth/forgot-password`<br>`POST /api/auth/reset-password` | `server/src/controllers/authController.js` | Read/Write (`users`) |
| **Kitchens & Discovery** | `GET /api/restaurants`<br>`GET /api/restaurants/nearby`<br>`GET /api/restaurants/:id`<br>`POST /api/restaurants/:id/check-serviceability`<br>`PATCH /api/restaurants/my/service-area`<br>`PATCH /api/restaurants/my/toggle-status` | `server/src/controllers/restaurantController.js` | Read/Write (`restaurants`, `menuitems`) |
| **Menu Items** | `GET /api/menu/restaurant/:restaurantId`<br>`PATCH /api/menu/:id/availability`<br>`POST /api/menu`<br>`PUT /api/menu/:id` | `server/src/controllers/menuController.js` | Read/Write (`menuitems`) |
| **Orders & Checkout** | `POST /api/orders`<br>`GET /api/orders`<br>`GET /api/orders/active`<br>`GET /api/orders/my/current`<br>`GET /api/orders/:id`<br>`PATCH /api/orders/:id/status` | `server/src/controllers/orderController.js` | Read/Write (`orders`, `settlements`) |
| **Delivery & Courier** | `GET /api/partners/dashboard`<br>`PATCH /api/partners/availability`<br>`POST /api/partners/location` | `server/src/controllers/partnerController.js` | Read/Write (`partnerlocations`, `users`) |
| **Live Tracking & Map** | `GET /api/orders/:id/tracking`<br>`GET /api/tracking/:id` | `server/src/controllers/trackingController.js` | Read (`orders`, `partnerlocations`, `restaurants`) |
| **Customer Support** | `POST /api/support`<br>`GET /api/support`<br>`GET /api/support/admin`<br>`PATCH /api/support/:id` | `server/src/controllers/supportController.js` | Read/Write (`supporttickets`) |
| **Admin Operations** | `GET /api/admin/stats`<br>`GET /api/admin/users`<br>`GET /api/admin/settlements`<br>`PATCH /api/admin/users/:id/status` | `server/src/controllers/adminController.js` | Read/Write (`users`, `orders`, `settlements`) |

---

## 3. Client State vs. Database Persistence

### Persistent Data (Survives Browser Refresh & Re-login)
* **Authentication Session:** Persisted in `localStorage` (`token` and `user` keys via Redux `authSlice`). Reloading the page rehydrates the authenticated state without requiring re-login.
* **Shopping Cart:** Persisted in `localStorage` (`crave_cart` key via Redux `cartSlice`). Selected dishes, add-ons, restaurant lock, and coupon discounts survive browser reloads.
* **Delivery Location:** Persisted in `localStorage` (`crave_active_location` key via Redux `locationSlice`). User-selected city, postal PIN, street address, and coordinates persist across page switches and browser restarts.
* **Database Records:** Saved addresses, customer order history, kitchen configuration, live orders, support tickets, and settlements reside permanently in MongoDB.

### Ephemeral State (In-Memory Only, Resets on Reload)
* Open/closed status of modals (`LocationModal`, `PaymentGatewayModal`, `InvoiceModal`).
* Active UI tab switches (`faqs` vs `new_ticket` vs `my_tickets` on Customer Care; `overview` vs `users` vs `settlements` vs `tickets` on Admin).
* Filter text inputs before submission.
* Temporary Leaflet map zoom and pan positions.

---

## 4. Seeded Demo Data vs. Simulated vs. Actual Integrations

### Actual Real Integrations
* **MongoDB 2dsphere Spatial Indexing:** True spherical distance calculations using the Haversine formula and MongoDB `$near` geospatial operators.
* **Leaflet & OpenStreetMap:** Real map tile layers loaded from OpenStreetMap with full attribution and dynamic polyline coordinate rendering.
* **WebSockets (Socket.IO):** Live server-client event broadcasting for `order:new`, `order:status_updated`, and `partner:location_tick`.
* **Password Security:** Salted SHA-512 bcrypt hashes (`bcryptjs`) and cryptographically signed JWT tokens (`jsonwebtoken`).
* **Support Ticket Desk:** Full persistent ticket lifecycle management in MongoDB.

### Simulated / Configurable Integrations
* **Payment Gateway:** 
  * If `RAZORPAY_KEY_SECRET` is configured in environment variables, real server-side HMAC-SHA256 signature verification executes.
  * If keys are absent, CRAVE operates in an explicit **Sandbox Simulation Mode**, issuing verifiable `pay_sim_...` tokens. Closing or cancelling the modal never marks an order as paid.
* **Password Reset Email:**
  * If SMTP environment variables (`EMAIL_SMTP_*`) are configured, emails are dispatched via Nodemailer.
  * In development mode, the cryptographically generated single-use reset link is safely output to the backend server terminal console to enable full testing without leaking tokens to the frontend client.
* **Courier GPS Movement:**
  * A fleet courier can transmit physical GPS coordinates via the Courier Portal (`/partner-dashboard`).
  * For viva/evaluation testing, an interactive GPS simulator can stream incremental road waypoints across New Delhi over Socket.IO to the customer map.

### Seeded Demonstration Records
* **10 Artisanal Gourmet Kitchens:** Pre-seeded with rich descriptions, realistic addresses across Central & South Delhi, and explicit `serviceablePincodes`.
* **75 Artisanal Dishes:** Pre-seeded across 3–4 categories per kitchen with high-res food photography, dietary flags, and customizable add-ons.
* **4 Demo Accounts:** One account per role (`customer@crave.com`, `owner1@crave.com`, `partner@crave.com`, `admin@crave.com`).

---

## 5. Environment Variable Reference

The following environment variables control server runtime behavior (defined in `server/.env` and templated in `server/.env.example`):

| Variable Name | Required | Default in Development | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | Optional | `5000` | Port for Express HTTP server and Socket.IO |
| `NODE_ENV` | Optional | `development` | Runtime mode (`development` or `production`) |
| `CLIENT_URL` | Optional | `http://localhost:5173` | Allowed CORS origin for Vite frontend |
| `MONGODB_URI` | Required | `mongodb://127.0.0.1:27017/crave_food_delivery` | MongoDB connection connection string |
| `JWT_SECRET` | Required | Application fallback | Secret key used to sign and verify authentication JWTs |
| `JWT_EXPIRES_IN` | Optional | `7d` | Token expiration duration |
| `RAZORPAY_KEY_ID` | Optional | None | Live Razorpay key ID for payment processing |
| `RAZORPAY_KEY_SECRET` | Optional | None | Live Razorpay secret for HMAC-SHA256 signature check |
| `EMAIL_FROM` | Optional | `support@crave.com` | "From" address for system notifications |
| `EMAIL_SMTP_HOST` | Optional | None | SMTP server hostname for outbound email |
| `EMAIL_SMTP_PORT` | Optional | `587` | SMTP server port |
| `EMAIL_SMTP_USER` | Optional | None | SMTP authentication username |
| `EMAIL_SMTP_PASS` | Optional | None | SMTP authentication password |
| `EMAIL_SMTP_SECURE` | Optional | `false` | TLS connection toggle (`true` for port 465) |

*(Note: In accordance with security practices, no confidential secrets, API keys, or live passwords are listed in this document).*

---

## 6. How to Configure MongoDB Locally

1. **Install MongoDB Community Server** or ensure the binary is installed locally.
2. **Start the MongoDB Daemon:**
   ```powershell
   & "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --dbpath "d:\Food-Del-App\data\db" --bind_ip 127.0.0.1 --port 27017
   ```
3. **Seed Database Records (Idempotent):**
   ```powershell
   cd d:\Food-Del-App\server
   npm run seed
   ```
4. **Start Backend Server:**
   ```powershell
   cd d:\Food-Del-App\server
   node src/server.js
   ```
5. **Start Frontend Dev Server:**
   ```powershell
   cd d:\Food-Del-App\client
   npm run dev
   ```
