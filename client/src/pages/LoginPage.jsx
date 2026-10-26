import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../redux/authSlice';
import api from '../services/api';
import {
  Flame,
  ArrowRight,
  ShieldCheck,
  Utensils,
  Bike,
  User,
  AlertCircle,
  Eye,
  EyeOff,
  Clock,
  HelpCircle
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingDetails, setPendingDetails] = useState(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter email and password.');
      setPendingDetails(null);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      setPendingDetails(null);
      const res = await api.post('/auth/login', { email, password });

      if (res.data.success) {
        dispatch(setCredentials({ user: res.data.user, token: res.data.token }));

        // Role-based smart redirection
        if (res.data.user.role === 'restaurant') {
          navigate('/restaurant-dashboard');
        } else if (res.data.user.role === 'delivery_partner') {
          navigate('/partner-dashboard');
        } else if (res.data.user.role === 'admin') {
          navigate('/admin-dashboard');
        } else {
          navigate(from === '/login' ? '/' : from);
        }
      }
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.accountStatus === 'pending') {
        setPendingDetails({
          role: errData.role || 'partner',
          message: errData.message
        });
        setErrorMessage('');
      } else {
        setPendingDetails(null);
        setErrorMessage(errData?.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPreset = (presetEmail, presetPassword) => {
    setEmail(presetEmail);
    setPassword(presetPassword);
    setErrorMessage('');
    setPendingDetails(null);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-stone-200/80 shadow-xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-aubergine-900 text-citrus-400 flex items-center justify-center shadow-md">
            <Flame className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-charcoal-900">
            Welcome to CRAVE
          </h1>
          <p className="text-xs text-stone-500">
            Sign in to access your culinary profile or operations suite
          </p>
        </div>

        {/* Optional Developer Demo Accounts (Isolated behind explicit dev config) */}
        {import.meta.env.VITE_ENABLE_DEV_ACCOUNTS === 'true' && (
          <div className="p-4 bg-ivory-100 rounded-2xl border border-ivory-300 space-y-2">
            <span className="text-[10px] font-bold text-citrus-600 uppercase tracking-widest block">
              Developer Testing Presets (Dev Mode Only):
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickPreset('customer@crave.com', 'password123')}
                className="p-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 font-medium text-charcoal-900 flex items-center gap-1.5 shadow-2xs"
              >
                <User className="w-3.5 h-3.5 text-citrus-600" />
                <span>Customer</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('owner1@crave.com', 'password123')}
                className="p-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 font-medium text-charcoal-900 flex items-center gap-1.5 shadow-2xs"
              >
                <Utensils className="w-3.5 h-3.5 text-citrus-600" />
                <span>Kitchen Owner</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('partner@crave.com', 'password123')}
                className="p-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 font-medium text-charcoal-900 flex items-center gap-1.5 shadow-2xs"
              >
                <Bike className="w-3.5 h-3.5 text-citrus-600" />
                <span>Delivery Courier</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('admin@crave.com', 'admin123')}
                className="p-2 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 font-medium text-charcoal-900 flex items-center gap-1.5 shadow-2xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-citrus-600" />
                <span>Platform Admin</span>
              </button>
            </div>
          </div>
        )}

        {pendingDetails && (
          <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-amber-950 space-y-2.5 animate-fadeIn shadow-2xs">
            <div className="flex items-start gap-2.5">
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Application Pending Administrative Approval
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed font-normal">
                  {pendingDetails.message}
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-amber-200/70 text-[11px] text-amber-900 flex items-center justify-between">
              <span>Need help or evaluation approval?</span>
              <Link to="/support" className="font-bold underline hover:text-amber-950 inline-flex items-center gap-1">
                Contact Partner Support
              </Link>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-stone-700 block mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. customer@crave.com"
              required
              className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-charcoal-900 focus:outline-none focus:border-citrus-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-stone-700 block">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-[11px] font-semibold text-citrus-600 hover:text-citrus-700 hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-2.5 pr-10 rounded-xl bg-stone-50 border border-stone-200 text-xs text-charcoal-900 focus:outline-none focus:border-citrus-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-charcoal-700 focus:outline-none"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-2xl bg-citrus-600 hover:bg-citrus-500 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {loading ? <span>Authenticating...</span> : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-stone-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-citrus-600 hover:text-citrus-700 hover:underline">
            Sign Up
          </Link>
        </p>

      </div>
    </div>
  );
}
