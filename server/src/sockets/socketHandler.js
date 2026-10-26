const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const PartnerLocation = require('../models/PartnerLocation');

let io = null;

function initSocket(server, clientOrigin) {
  io = socketIo(server, {
    cors: {
      origin: clientOrigin || '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true
    }
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication error: Token not provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'crave_super_secure_jwt_secret_token_evaluation_2026');
      const user = await User.findById(decoded.userId).select('-passwordHash');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id} (User: ${socket.user.name}, Role: ${socket.user.role})`);

    // Personal room for direct notifications
    socket.join(`user:${socket.user._id}`);

    // If Admin, auto-join platform governance admin room
    if (socket.user.role === 'admin') {
      socket.join('admin');
      console.log(`[Socket.IO] Admin joined global governance room: admin`);
    }

    // If Delivery Partner, auto-join partner room
    if (socket.user.role === 'delivery_partner') {
      socket.join(`partner:${socket.user._id}`);
      console.log(`[Socket.IO] Partner joined room partner:${socket.user._id}`);
    }

    // If Restaurant Owner, auto-join rooms for all restaurants they own
    if (socket.user.role === 'restaurant') {
      try {
        const ownedRestaurants = await Restaurant.find({ ownerId: socket.user._id });
        for (const r of ownedRestaurants) {
          socket.join(`restaurant:${r._id}`);
          console.log(`[Socket.IO] Restaurant owner auto-joined room restaurant:${r._id} (${r.name})`);
        }
      } catch (restErr) {
        console.error('[Socket.IO] Error auto-joining restaurant rooms:', restErr.message);
      }
    }

    // Role-authorized room join: Restaurant Room
    socket.on('join:restaurant', async ({ restaurantId }) => {
      try {
        if (!restaurantId) return;

        // Verify restaurant ownership or admin
        if (socket.user.role === 'admin') {
          socket.join(`restaurant:${restaurantId}`);
          return;
        }

        const restaurant = await Restaurant.findById(restaurantId);
        if (restaurant && restaurant.ownerId.toString() === socket.user._id.toString()) {
          socket.join(`restaurant:${restaurantId}`);
          console.log(`[Socket.IO] Restaurant owner joined room restaurant:${restaurantId}`);
        } else {
          socket.emit('error:unauthorized', { message: 'Unauthorized restaurant room access' });
        }
      } catch (err) {
        console.error('[Socket.IO] join:restaurant error:', err.message);
      }
    });

    // Role-authorized room join: Order Room
    socket.on('join:order', async ({ orderId }) => {
      try {
        if (!orderId) return;

        const order = await Order.findById(orderId);
        if (!order) {
          socket.emit('error:not_found', { message: 'Order not found' });
          return;
        }

        const isCustomer = order.customerId.toString() === socket.user._id.toString();
        const isPartner = order.partnerId && order.partnerId.toString() === socket.user._id.toString();
        const isAdmin = socket.user.role === 'admin';

        let isRestaurantOwner = false;
        if (socket.user.role === 'restaurant') {
          const restaurant = await Restaurant.findById(order.restaurantId);
          if (restaurant && restaurant.ownerId.toString() === socket.user._id.toString()) {
            isRestaurantOwner = true;
          }
        }

        if (isCustomer || isPartner || isRestaurantOwner || isAdmin) {
          socket.join(`order:${orderId}`);
          console.log(`[Socket.IO] User ${socket.user.name} joined room order:${orderId}`);
          socket.emit('joined:order', { orderId, success: true });
        } else {
          socket.emit('error:unauthorized', { message: 'You are not authorized to join this private order room.' });
        }
      } catch (err) {
        console.error('[Socket.IO] join:order error:', err.message);
      }
    });

    // Leave order room
    socket.on('leave:order', ({ orderId }) => {
      socket.leave(`order:${orderId}`);
    });

    // Partner live location emitter from socket client
    socket.on('partner:location_tick', async (data) => {
      try {
        const { coordinates, orderId, heading = 0, speed = 25, isSimulation } = data;
        if (!coordinates || coordinates.length < 2) return;

        // Check permission: delivery partner, admin, or simulation on active order
        const isPartner = socket.user.role === 'delivery_partner';
        const isAdmin = socket.user.role === 'admin';
        const isSimulator = isSimulation || socket.user.role === 'customer';

        if (!isPartner && !isAdmin && !isSimulator) return;

        // Update PartnerLocation in DB if real partner
        if (isPartner) {
          await PartnerLocation.findOneAndUpdate(
            { partnerId: socket.user._id },
            {
              $set: {
                location: {
                  type: 'Point',
                  coordinates: [Number(coordinates[0]), Number(coordinates[1])]
                },
                heading,
                speed,
                isOnline: true,
                activeOrderId: orderId || null,
                updatedAt: new Date()
              }
            },
            { upsert: true }
          );
        }

        if (orderId) {
          // Broadcast to order room
          io.to(`order:${orderId}`).emit('partner:location_updated', {
            partnerId: socket.user._id,
            partnerName: socket.user.name,
            coordinates: [Number(coordinates[0]), Number(coordinates[1])],
            heading,
            speed,
            timestamp: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error('[Socket.IO] partner:location_tick error:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = {
  initSocket,
  getIO
};
