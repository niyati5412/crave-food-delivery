const SupportTicket = require('../models/SupportTicket');
const { ROLES } = require('../config/constants');

// POST /api/support — Customer creates a ticket
exports.createTicket = async (req, res, next) => {
  try {
    const { subject, category, orderId, message } = req.body;

    if (!subject || !category || !message) {
      return res.status(400).json({ success: false, message: 'Subject, category, and message are required.' });
    }

    const ticket = await SupportTicket.create({
      customerId: req.user._id,
      subject: subject.trim(),
      category,
      orderId: orderId?.trim() || null,
      message: message.trim()
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket submitted successfully. Our team will respond within 24 hours.',
      ticket
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/support — Customer sees their own tickets
exports.getMyTickets = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find({ customerId: req.user._id })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: tickets.length, tickets });
  } catch (error) {
    next(error);
  }
};

// GET /api/support/admin — Admin sees all tickets
exports.getAllTickets = async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }
    const { status } = req.query;
    const query = status ? { status } : {};
    const tickets = await SupportTicket.find(query)
      .populate('customerId', 'name email phone')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: tickets.length, tickets });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/support/:id — Admin updates ticket status/notes
exports.updateTicket = async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.ADMIN) {
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }
    const { status, adminNotes } = req.body;
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

    if (status) ticket.status = status;
    if (adminNotes !== undefined) ticket.adminNotes = adminNotes;
    if (status === 'resolved') ticket.resolvedAt = new Date();
    await ticket.save();

    res.status(200).json({ success: true, message: 'Ticket updated.', ticket });
  } catch (error) {
    next(error);
  }
};
