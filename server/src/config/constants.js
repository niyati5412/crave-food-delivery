// User Roles
const ROLES = {
  CUSTOMER: 'customer',
  RESTAURANT: 'restaurant',
  DELIVERY_PARTNER: 'delivery_partner',
  ADMIN: 'admin'
};

// Order Status Lifecycle
const ORDER_STATUS = {
  PLACED: 'placed',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  READY_FOR_PICKUP: 'ready_for_pickup',
  PICKED_UP: 'picked_up',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected'
};

// Role-based allowed transitions:
// key: current status, value: object of allowed next statuses mapped to authorized roles
const ALLOWED_TRANSITIONS = {
  [ORDER_STATUS.PLACED]: {
    [ORDER_STATUS.ACCEPTED]: [ROLES.RESTAURANT, ROLES.ADMIN],
    [ORDER_STATUS.REJECTED]: [ROLES.RESTAURANT, ROLES.ADMIN],
    [ORDER_STATUS.CANCELLED]: [ROLES.CUSTOMER, ROLES.ADMIN]
  },
  [ORDER_STATUS.ACCEPTED]: {
    [ORDER_STATUS.PREPARING]: [ROLES.RESTAURANT, ROLES.ADMIN],
    [ORDER_STATUS.CANCELLED]: [ROLES.ADMIN] // Customer cannot cancel once restaurant accepts
  },
  [ORDER_STATUS.PREPARING]: {
    [ORDER_STATUS.READY_FOR_PICKUP]: [ROLES.RESTAURANT, ROLES.ADMIN],
    [ORDER_STATUS.CANCELLED]: [ROLES.ADMIN]
  },
  [ORDER_STATUS.READY_FOR_PICKUP]: {
    [ORDER_STATUS.PICKED_UP]: [ROLES.DELIVERY_PARTNER, ROLES.ADMIN],
    [ORDER_STATUS.CANCELLED]: [ROLES.ADMIN]
  },
  [ORDER_STATUS.PICKED_UP]: {
    [ORDER_STATUS.OUT_FOR_DELIVERY]: [ROLES.DELIVERY_PARTNER, ROLES.ADMIN]
  },
  [ORDER_STATUS.OUT_FOR_DELIVERY]: {
    [ORDER_STATUS.DELIVERED]: [ROLES.DELIVERY_PARTNER, ROLES.ADMIN]
  },
  [ORDER_STATUS.DELIVERED]: {},
  [ORDER_STATUS.CANCELLED]: {},
  [ORDER_STATUS.REJECTED]: {}
};

const PAYMENT_MODES = {
  COD: 'COD',
  ONLINE: 'ONLINE'
};

const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

const PARTNER_STATUS = {
  OFFLINE: 'offline',
  AVAILABLE: 'available',
  BUSY: 'busy'
};

module.exports = {
  ROLES,
  ORDER_STATUS,
  ALLOWED_TRANSITIONS,
  PAYMENT_MODES,
  PAYMENT_STATUS,
  PARTNER_STATUS
};
