import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setCredentials } from '../redux/authSlice';
import api from '../services/api';
import { ShieldCheck, Utensils, Bike, UserCheck, Sparkles, ChevronUp, ChevronDown, EyeOff } from 'lucide-react';

export default function RoleBanner() {
  const isDevBannerEnabled = import.meta.env.VITE_ENABLE_DEV_ROLE_BANNER === 'true';
  if (!isDevBannerEnabled) {
    return null;
  }

  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleQuickSwitch = async (email, password, redirectPath) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        dispatch(setCredentials({ user: res.data.user, token: res.data.token }));
        navigate(redirectPath);
      }
    } catch (err) {
      console.error('Quick switch failed:', err);
    }
  };

  if (collapsed) {
    return (
      <div className="bg-charcoal-950 text-stone-300 py-1 px-4 text-[11px] flex items-center justify-between border-b border-charcoal-800">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-citrus-500"></span>
          Active Role: <strong className="text-white capitalize">{user?.role || 'Guest'}</strong> ({user?.name || 'Not logged in'})
        </span>
        <button
          onClick={() => setCollapsed(false)}
          className="text-citrus-400 hover:text-citrus-300 flex items-center gap-1 font-semibold"
        >
          <span>Open Role Switcher</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-charcoal-900 text-ivory-100 border-b border-charcoal-800 text-xs py-2 px-4 shadow-inner">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-citrus-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-citrus-500"></span>
          </span>
          <span className="font-semibold text-citrus-400 tracking-wider uppercase text-[11px] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> CRAVE Demo Mode • Switch Role:
          </span>
          <span className="hidden sm:inline text-stone-400">
            Current: <strong className="text-white capitalize">{user?.role || 'Guest'}</strong>
          </span>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => handleQuickSwitch('customer@crave.com', 'password123', '/')}
            className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 font-medium ${
              user?.role === 'customer'
                ? 'bg-citrus-600 text-white shadow-sm ring-1 ring-white/30'
                : 'bg-charcoal-800 hover:bg-stone-800 text-stone-300'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Customer
          </button>

          <button
            onClick={() => handleQuickSwitch('owner1@crave.com', 'password123', '/restaurant-dashboard')}
            className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 font-medium ${
              user?.role === 'restaurant'
                ? 'bg-citrus-600 text-white shadow-sm ring-1 ring-white/30'
                : 'bg-charcoal-800 hover:bg-stone-800 text-stone-300'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            Restaurant Owner
          </button>

          <button
            onClick={() => handleQuickSwitch('partner@crave.com', 'password123', '/partner-dashboard')}
            className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 font-medium ${
              user?.role === 'delivery_partner'
                ? 'bg-citrus-600 text-white shadow-sm ring-1 ring-white/30'
                : 'bg-charcoal-800 hover:bg-stone-800 text-stone-300'
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            Delivery Partner
          </button>

          <button
            onClick={() => handleQuickSwitch('admin@crave.com', 'admin123', '/admin-dashboard')}
            className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 font-medium ${
              user?.role === 'admin'
                ? 'bg-citrus-600 text-white shadow-sm ring-1 ring-white/30'
                : 'bg-charcoal-800 hover:bg-stone-800 text-stone-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin
          </button>

          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded hover:bg-charcoal-800 text-stone-400 hover:text-white transition-colors"
            title="Minimize Bar"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
