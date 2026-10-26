import { createSlice } from '@reduxjs/toolkit';

const token = localStorage.getItem('crave_token') || null;
const userStr = localStorage.getItem('crave_user') || null;
let initialUser = null;
try {
  initialUser = userStr ? JSON.parse(userStr) : null;
} catch (e) {
  initialUser = null;
}

const initialState = {
  token,
  user: initialUser,
  isAuthenticated: !!token && !!initialUser,
  loading: false,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      localStorage.setItem('crave_token', token);
      localStorage.setItem('crave_user', JSON.stringify(user));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('crave_token');
      localStorage.removeItem('crave_user');
    },
    setUser: (state, action) => {
      state.user = action.payload;
      localStorage.setItem('crave_user', JSON.stringify(action.payload));
    }
  }
});

export const { setCredentials, logout, setUser } = authSlice.actions;
export default authSlice.reducer;
