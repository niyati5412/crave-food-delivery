import { createSlice } from '@reduxjs/toolkit';

const savedCart = localStorage.getItem('crave_cart');
let initialCartState = {
  restaurant: null, // { _id, name, images, location }
  items: [],        // [{ menuItemId, name, price, quantity, selectedAddOns, itemTotal, isVeg }]
  offerCode: null,
  discount: 0,
  conflictModalOpen: false,
  pendingItem: null
};

try {
  if (savedCart) {
    initialCartState = { ...initialCartState, ...JSON.parse(savedCart) };
  }
} catch (e) {
  console.warn('Failed to parse saved cart');
}

const syncStorage = (state) => {
  localStorage.setItem('crave_cart', JSON.stringify({
    restaurant: state.restaurant,
    items: state.items,
    offerCode: state.offerCode,
    discount: state.discount
  }));
};

const cartSlice = createSlice({
  name: 'cart',
  initialState: initialCartState,
  reducers: {
    addItem: (state, action) => {
      const { restaurant, item, quantity = 1, selectedAddOns = [] } = action.payload;

      // Check single-restaurant constraint
      if (state.restaurant && state.restaurant._id !== restaurant._id && state.items.length > 0) {
        state.conflictModalOpen = true;
        state.pendingItem = action.payload;
        return;
      }

      state.restaurant = restaurant;

      // Unique key for item + combination of add-ons
      const addOnsKey = selectedAddOns.map(a => a.name).sort().join('|');
      const existingItemIndex = state.items.findIndex(
        i => i.menuItemId === item._id && i.addOnsKey === addOnsKey
      );

      const addOnsPrice = selectedAddOns.reduce((sum, a) => sum + a.price, 0);
      const unitPrice = item.price + addOnsPrice;

      if (existingItemIndex > -1) {
        state.items[existingItemIndex].quantity += quantity;
        state.items[existingItemIndex].itemTotal = state.items[existingItemIndex].quantity * unitPrice;
      } else {
        state.items.push({
          menuItemId: item._id,
          name: item.name,
          price: item.price,
          isVeg: item.isVeg,
          quantity,
          selectedAddOns,
          addOnsKey,
          itemTotal: quantity * unitPrice
        });
      }

      syncStorage(state);
    },
    confirmReplaceCart: (state) => {
      if (state.pendingItem) {
        const { restaurant, item, quantity = 1, selectedAddOns = [] } = state.pendingItem;
        state.restaurant = restaurant;
        const addOnsPrice = selectedAddOns.reduce((sum, a) => sum + a.price, 0);
        const unitPrice = item.price + addOnsPrice;
        const addOnsKey = selectedAddOns.map(a => a.name).sort().join('|');

        state.items = [{
          menuItemId: item._id,
          name: item.name,
          price: item.price,
          isVeg: item.isVeg,
          quantity,
          selectedAddOns,
          addOnsKey,
          itemTotal: quantity * unitPrice
        }];
        state.offerCode = null;
        state.discount = 0;
        state.conflictModalOpen = false;
        state.pendingItem = null;
        syncStorage(state);
      }
    },
    cancelReplaceCart: (state) => {
      state.conflictModalOpen = false;
      state.pendingItem = null;
    },
    updateQuantity: (state, action) => {
      const { index, quantity } = action.payload;
      if (state.items[index]) {
        if (quantity <= 0) {
          state.items.splice(index, 1);
          if (state.items.length === 0) {
            state.restaurant = null;
            state.offerCode = null;
            state.discount = 0;
          }
        } else {
          state.items[index].quantity = quantity;
          const addOnsPrice = state.items[index].selectedAddOns.reduce((sum, a) => sum + a.price, 0);
          state.items[index].itemTotal = quantity * (state.items[index].price + addOnsPrice);
        }
      }
      syncStorage(state);
    },
    removeItem: (state, action) => {
      state.items.splice(action.payload, 1);
      if (state.items.length === 0) {
        state.restaurant = null;
        state.offerCode = null;
        state.discount = 0;
      }
      syncStorage(state);
    },
    applyDiscount: (state, action) => {
      const { code, discount } = action.payload;
      state.offerCode = code;
      state.discount = discount;
      syncStorage(state);
    },
    removeDiscount: (state) => {
      state.offerCode = null;
      state.discount = 0;
      syncStorage(state);
    },
    clearCart: (state) => {
      state.restaurant = null;
      state.items = [];
      state.offerCode = null;
      state.discount = 0;
      syncStorage(state);
    }
  }
});

export const {
  addItem,
  confirmReplaceCart,
  cancelReplaceCart,
  updateQuantity,
  removeItem,
  applyDiscount,
  removeDiscount,
  clearCart
} = cartSlice.actions;

export default cartSlice.reducer;
