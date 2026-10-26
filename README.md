# CRAVE — Haute Cuisine Food Delivery Platform 🍽️

A full-stack, real-time food delivery platform built as a college group project.

**Tech Stack:** React + Vite + Tailwind CSS | Node.js + Express | Socket.IO | MongoDB + Mongoose

---

## 👥 Group Members
*(Add your names and roll numbers here)*

| Name | Role / Contribution |
|------|-------------------|
| Niyati | Full Stack, Admin Dashboard, Auth, Order Lifecycle |
| [Member 2] | [Contribution] |
| [Member 3] | [Contribution] |
| [Member 4] | [Contribution] |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Redux Toolkit |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose ODM |
| Real-Time | Socket.IO |
| Maps | Leaflet.js (OpenStreetMap) |
| Auth | JWT (JSON Web Tokens), bcryptjs |
| Payment | Razorpay (Sandbox Mode) |

---

## 🗂️ Project Structure

```
Food-Del-App/
├── client/          # React frontend (Vite)
│   ├── src/
│   │   ├── pages/   # All page components
│   │   ├── components/
│   │   ├── services/
│   │   └── store/
│   └── package.json
├── server/          # Node.js backend
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── sockets/
│   ├── .env.example # Copy to .env before starting
│   └── package.json
└── README.md
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js v18+
- MongoDB v6+ (running locally on port 27017)
- Git

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/REPO_NAME.git
cd Food-Del-App
```

### 2. Configure environment variables

```bash
cd server
cp .env.example .env
# Edit .env with your own values (JWT_SECRET, MONGODB_URI, etc.)
```

### 3. Install dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 4. Seed the database

```bash
cd server
node src/scripts/seedData.js
```

### 5. Start MongoDB locally

```bash
mongod --dbpath ./data/db
```

### 6. Start the backend

```bash
cd server
node src/server.js
# Server runs on http://localhost:5000
```

### 7. Start the frontend

```bash
cd client
npm run dev
# Frontend runs on http://localhost:5173
```

---

## 👤 Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Customer | `customer@crave.com` | `password123` |
| Kitchen Owner | `owner1@crave.com` | `password123` |
| Delivery Partner | `partner@crave.com` | `password123` |
| Admin | `admin@crave.com` | `admin123` |

---

## 🚀 Key Features

- ✅ **Complete Order Lifecycle** — Place → Kitchen Accept → Prepare → Partner Assigned → Pickup → Deliver
- ✅ **Real-Time Tracking** — Live GPS updates via Socket.IO (Leaflet map)
- ✅ **4-Digit OTP Handover** — Secure delivery confirmation at customer doorstep
- ✅ **Role-Based Access Control** — Customer, Restaurant Owner, Delivery Partner, Admin
- ✅ **Admin Dashboard** — Platform-wide governance, kitchen oversight, partner approval
- ✅ **Geospatial Partner Assignment** — Nearest available courier via MongoDB 2dsphere index
- ✅ **Razorpay Sandbox Payments** — UPI QR / online payment flow simulation
- ✅ **Financial Settlements** — 15% platform commission tracking per delivered order

---

## 🗄️ Database

**MongoDB** — NoSQL document database

- **Database:** `crave_food_delivery`
- **Collections:** `users`, `restaurants`, `menuitems`, `orders`, `partnerlocations`, `settlements`, `reviews`, `offers`, `supporttickets`

---

## 📄 License

MIT License — Academic / Educational Use
