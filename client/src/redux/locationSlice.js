import { createSlice } from '@reduxjs/toolkit';

const getInitialLocation = () => {
  try {
    const saved = localStorage.getItem('crave_selected_location');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    // ignore
  }

  return {
    label: 'Connaught Place, New Delhi (Demo Cluster)',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110001',
    addressLine: 'Connaught Place Inner Circle',
    coordinates: [77.2205, 28.6328], // [longitude, latitude]
    isDemoCluster: true,
    source: 'demo_cluster' // 'saved_address' | 'manual_entry' | 'browser_gps' | 'demo_cluster'
  };
};

const locationSlice = createSlice({
  name: 'location',
  initialState: getInitialLocation(),
  reducers: {
    setLocation: (state, action) => {
      const updated = {
        ...state,
        ...action.payload,
        isDemoCluster: action.payload.isDemoCluster ?? false
      };
      try {
        localStorage.setItem('crave_selected_location', JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    },
    resetToDemoCluster: () => {
      const demoState = {
        label: 'Connaught Place, New Delhi (Demo Cluster)',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
        addressLine: 'Connaught Place Inner Circle',
        coordinates: [77.2205, 28.6328],
        isDemoCluster: true,
        source: 'demo_cluster'
      };
      try {
        localStorage.setItem('crave_selected_location', JSON.stringify(demoState));
      } catch (e) {
        // ignore
      }
      return demoState;
    }
  }
});

export const { setLocation, resetToDemoCluster } = locationSlice.actions;
export default locationSlice.reducer;
