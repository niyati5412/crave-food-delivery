import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../redux/authSlice';
import api from '../services/api';
import {
  Flame,
  ArrowRight,
  AlertCircle,
  Bike,
  User,
  Utensils,
  Eye,
  EyeOff,
  Check,
  X,
  CheckCircle2
} from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'customer',
    // Delivery partner details
    vehicleType: 'bike',
    vehicleNumber: '',
    // Restaurant onboarding details
    restaurantName: '',
    cuisines: '',
    addressLine: '',
    city: 'New Delhi',
    pincode: '',
    deliveryRadiusKm: 10
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Password rules validation
  const hasMinLength = formData.password.length >= 8;
  const passwordsMatch = Boolean(formData.password && formData.password === formData.confirmPassword);
  const hasValidEmail = /^\S+@\S+\.\S+$/.test(formData.email.trim());
  const hasValidPhone = formData.phone.trim().length >= 10;

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.password) {
      setErrorMessage('Please fill in all required user fields.');
      return;
    }

    if (!hasValidEmail) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!hasValidPhone) {
      setErrorMessage('Please enter a valid 10-digit phone number.');
      return;
    }

    if (!hasMinLength) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('Passwords do not match. Please verify your confirmation password.');
      return;
    }

    if (formData.role === 'restaurant') {
      if (!formData.restaurantName.trim()) {
        setErrorMessage('Restaurant Name is required for culinary partner onboarding.');
        return;
      }
      if (!formData.pincode.trim() || formData.pincode.trim().length < 6) {
        setErrorMessage('A valid 6-digit postal PIN code is required.');
        return;
      }
    }

    try {
      setLoading(true);
      setErrorMessage('');

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: formData.role
      };

      if (formData.role === 'delivery_partner') {
        payload.vehicleType = formData.vehicleType;
        payload.vehicleNumber = (formData.vehicleNumber || 'DL-01-AB-1234').trim().toUpperCase();
      } else if (formData.role === 'restaurant') {
        payload.restaurantDetails = {
          name: formData.restaurantName.trim(),
          cuisines: formData.cuisines ? formData.cuisines.split(',').map(c => c.trim()).filter(Boolean) : ['Artisanal Dining'],
          address: {
            addressLine: formData.addressLine.trim() || 'Gourmet Kitchen Suite',
            city: formData.city.trim() || 'New Delhi',
            pincode: formData.pincode.trim()
          },
          deliveryRadiusKm: Number(formData.deliveryRadiusKm) || 10
        };
      }

      const res = await api.post('/auth/register', payload);

      if (res.data.success) {
        // If partner or restaurant pending admin approval
        if (res.data.user.accountStatus === 'pending') {
          setApplicationSubmitted(true);
          return;
        }

        dispatch(setCredentials({ user: res.data.user, token: res.data.token }));
        if (res.data.user.role === 'restaurant') {
          navigate('/restaurant-dashboard');
        } else if (res.data.user.role === 'delivery_partner') {
          navigate('/partner-dashboard');
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 flex justify-center items-start sm:items-center overflow-y-auto">
      <div className="w-full max-w-lg sm:max-w-xl bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-xl space-y-6 my-auto">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-aubergine-900 text-citrus-400 flex items-center justify-center shadow-md">
            <Flame className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal-900">
            Create an Account
          </h1>
          <p className="text-xs text-stone-500">
            Join the CRAVE culinary ecosystem
          </p>
        </div>

        {/* Pending Application Notice */}
        {applicationSubmitted ? (
          <div className="p-6 bg-ivory-100 rounded-3xl border border-ivory-300 text-center space-y-3 animate-fadeIn">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-bold text-charcoal-900">
              Application Submitted Successfully!
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Your {formData.role === 'restaurant' ? 'Restaurant Partner' : 'Delivery Fleet'} registration has been recorded and is currently awaiting administrator review and approval.
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-citrus-600 hover:bg-citrus-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Role Selection Tabs */}
            <div>
              <label className="text-[11px] font-bold text-stone-400 uppercase tracking-widest block mb-1.5 text-center">
                Select Your Role
              </label>
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-ivory-200 rounded-2xl border border-ivory-300">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    setFormData({ ...formData, role: 'customer' });
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 ${
                    formData.role === 'customer'
                      ? 'bg-charcoal-900 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Diner</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    setFormData({ ...formData, role: 'restaurant' });
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 ${
                    formData.role === 'restaurant'
                      ? 'bg-charcoal-900 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Utensils className="w-3.5 h-3.5" />
                  <span>Kitchen</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    setFormData({ ...formData, role: 'delivery_partner' });
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 ${
                    formData.role === 'delivery_partner'
                      ? 'bg-charcoal-900 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" />
                  <span>Courier</span>
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    setErrorMessage('');
                    setFormData({ ...formData, name: e.target.value });
                  }}
                  placeholder="e.g. Elena Rostova"
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-charcoal-900 focus:outline-none focus:border-citrus-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => {
                      setErrorMessage('');
                      setFormData({ ...formData, email: e.target.value });
                    }}
                    placeholder="elena@example.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-charcoal-900 focus:outline-none focus:border-citrus-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => {
                      setErrorMessage('');
                      setFormData({ ...formData, phone: e.target.value });
                    }}
                    placeholder="98765 00000"
                    className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs text-charcoal-900 focus:outline-none focus:border-citrus-500"
                  />
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => {
                        setErrorMessage('');
                        setFormData({ ...formData, password: e.target.value });
                      }}
                      placeholder="At least 8 characters"
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

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => {
                        setErrorMessage('');
                        setFormData({ ...formData, confirmPassword: e.target.value });
                      }}
                      placeholder="Re-enter password"
                      className={`w-full px-4 py-2.5 pr-10 rounded-xl bg-stone-50 border text-xs text-charcoal-900 focus:outline-none ${
                        formData.confirmPassword && !passwordsMatch
                          ? 'border-red-300 focus:border-red-500'
                          : 'border-stone-200 focus:border-citrus-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-charcoal-700 focus:outline-none"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Requirement Hints */}
              {formData.password && (
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {hasMinLength ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    ) : (
                      <X className="w-3.5 h-3.5 text-stone-400 stroke-[2]" />
                    )}
                    <span className={hasMinLength ? 'text-emerald-700 font-medium' : 'text-stone-500'}>
                      Minimum 8 characters
                    </span>
                  </div>
                  {formData.confirmPassword && (
                    <div className="flex items-center gap-1.5">
                      {passwordsMatch ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-red-500 stroke-[2]" />
                      )}
                      <span className={passwordsMatch ? 'text-emerald-700 font-medium' : 'text-red-600 font-medium'}>
                        {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Delivery Partner Specific Details */}
              {formData.role === 'delivery_partner' && (
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                  <div className="flex items-center gap-2 text-stone-700 font-bold text-xs">
                    <Bike className="w-4 h-4 text-citrus-600" />
                    <span>Courier Fleet Onboarding Details</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Vehicle Type *
                      </label>
                      <select
                        value={formData.vehicleType}
                        onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-white text-charcoal-900 focus:outline-none focus:border-citrus-500"
                      >
                        <option value="bike">Motorcycle</option>
                        <option value="scooter">Scooter</option>
                        <option value="cycle">Bicycle</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Vehicle Reg. No. *
                      </label>
                      <input
                        type="text"
                        placeholder="DL-01-AB-1234"
                        value={formData.vehicleNumber}
                        onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-white text-charcoal-900 uppercase focus:outline-none focus:border-citrus-500 font-mono"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-stone-500">
                    Note: Courier accounts require administrator verification before accepting real in-flight orders.
                  </p>
                </div>
              )}

              {/* Restaurant Specific Onboarding Details */}
              {formData.role === 'restaurant' && (
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                  <div className="flex items-center gap-2 text-stone-700 font-bold text-xs">
                    <Utensils className="w-4 h-4 text-citrus-600" />
                    <span>Culinary Partner Kitchen Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Restaurant Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Osteria Milano"
                        value={formData.restaurantName}
                        onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-white text-charcoal-900 focus:outline-none focus:border-citrus-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Cuisines (comma separated)
                      </label>
                      <input
                        type="text"
                        placeholder="Italian, Woodfired Pizza, Pasta"
                        value={formData.cuisines}
                        onChange={(e) => setFormData({ ...formData, cuisines: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-white text-charcoal-900 focus:outline-none focus:border-citrus-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      Kitchen Address Line
                    </label>
                    <input
                      type="text"
                      placeholder="Shop 12, Main Market, Defence Colony"
                      value={formData.addressLine}
                      onChange={(e) => setFormData({ ...formData, addressLine: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-white text-charcoal-900 focus:outline-none focus:border-citrus-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-white text-charcoal-900 focus:outline-none focus:border-citrus-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        PIN Code *
                      </label>
                      <input
                        type="text"
                        maxLength="6"
                        placeholder="110024"
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-white text-charcoal-900 font-mono focus:outline-none focus:border-citrus-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                        Radius (km)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={formData.deliveryRadiusKm}
                        onChange={(e) => setFormData({ ...formData, deliveryRadiusKm: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs bg-white text-charcoal-900 focus:outline-none focus:border-citrus-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-2xl bg-citrus-600 hover:bg-citrus-500 disabled:bg-stone-300 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <span>Processing Application...</span>
                ) : (
                  <>
                    <span>
                      {formData.role === 'customer'
                        ? 'Complete Registration'
                        : 'Submit Partner Application'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {/* Clear Sign In / Sign Up navigation */}
        <p className="text-center text-xs text-stone-500 pt-2 border-t border-stone-100">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-citrus-600 hover:text-citrus-700 hover:underline">
            Sign In
          </Link>
        </p>

      </div>
    </div>
  );
}
