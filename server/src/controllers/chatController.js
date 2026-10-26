const ChatMessage = require('../models/ChatMessage');
const Order = require('../models/Order');
const { getIO } = require('../sockets/socketHandler');

exports.getOrderChat = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const messages = await ChatMessage.find({ orderId }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      messages
    });
  } catch (error) {
    next(error);
  }
};

exports.sendChatMessage = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message content cannot be empty.' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const chatMsg = await ChatMessage.create({
      orderId,
      senderId: req.user._id,
      senderRole: req.user.role,
      senderName: req.user.name,
      message: message.trim()
    });

    // Broadcast in real-time to the order room via Socket.IO
    try {
      const io = getIO();
      if (io) {
        io.to(`order:${orderId}`).emit('chat:new_message', chatMsg);
      }
    } catch (socketErr) {
      console.warn('[Socket] Chat emit warning:', socketErr.message);
    }

    res.status(201).json({
      success: true,
      chatMsg
    });
  } catch (error) {
    next(error);
  }
};
