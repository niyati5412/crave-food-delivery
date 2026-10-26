import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/authSlice';
import LocationModal from './LocationModal';
import {
  ShoppingBag,
  MapPin,
  User,
  Compass,
  Tag,
  Clock,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Radio,
  Flame,
  Edit2
} from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { items } = useSelector((state) => state.cart);
  const activeLocation = useSelector((state) => state.location);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  const totalCartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleLogout = () => {
    dispatch(logout());
    setProfileDropdownOpen(false);
    navigate('/');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-ivory-50/95 backdrop-blur-md border-b border-ivory-200 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Left: Brand & Location */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-aubergine-900 flex items-center justify-center text-ivory-50 shadow-md group-hover:bg-citrus-600 transition-colors">
                <Flame className="w-6 h-6 text-citrus-500 group-hover:text-white transition-colors" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-2xl font-black tracking-tight text-charcoal-900 leading-none">
                  CRAVE
                </span>
                <span className="text-[10px] tracking-widest uppercase font-semibold text-citrus-600">
                  Haute Cuisine
                </span>
              </div>
            </Link>

            {/* Interactive Location Selector Button */}
            <button
              type="button"
              onClick={() => setLocationModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-ivory-100 hover:bg-ivory-200 border border-ivory-300 text-xs text-charcoal-800 transition-all group"
              title="Change Delivery Location"
            >
              <MapPin className="w-3.5 h-3.5 text-citrus-600 group-hover:scale-110 transition-transform flex-shrink-0" />
              <span className="font-medium truncate max-w-[150px] sm:max-w-[190px]">
                {activeLocation?.city ? `${activeLocation.city} (${activeLocation.pincode || 'PIN'})` : (activeLocation?.label || 'Select Location')}
              </span>
              <ChevronDown className="w-3 h-3 text-stone-400 group-hover:text-charcoal-700" />
            </button>
          </div>

          {/* Center: Role-Based Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-stone-700">
            {/* 1. Restaurant / Chef Owner Navigation */}
            {user?.role === 'restaurant' && (
              <>
                <Link
                  to="/restaurant-dashboard"
                  className={`flex items-center gap-1.5 hover:text-citrus-600 transition-colors ${
                    location.pathname === '/restaurant-dashboard' ? 'text-citrus-600 font-semibold' : ''
                  }`}
                >
                  <Flame className="w-4 h-4 text-citrus-600" />
                  Kitchen Console
                </Link>
                <Link
                  to="/support"
                  className={`flex items-center gap-1.5 hover:text-citrus-600 transition-colors ${
                    location.pathname === '/support' ? 'text-citrus-600 font-semibold' : ''
                  }`}
                >
                  Customer Care
                </Link>
              </>
            )}

            {/* 2. Courier / Delivery Partner Navigation */}
            {user?.role === 'delivery_partner' && (
              <>
                <Link
                  to="/partner-dashboard"
                  className={`flex items-center gap-1.5 hover:text-citrus-600 transition-colors ${
                    location.pathname === '/partner-dashboard' ? 'text-citrus-600 font-semibold' : ''
                  }`}
                >
                  <Radio className="w-4 h-4 text-citrus-600 animate-pulse" />
                  Courier Fleet Portal
                </Link>
                <Link
                  to="/support"
                  className={`flex items-center gap-1.5 hover:text-citrus-600 transition-colors ${
                    location.pathname === '/support' ? 'text-citrus-600 font-semibold' : ''
                  }`}
                >
                  Customer Care
                </Link>
              </>
            )}

            {/* 3. Platform Admin Navigation */}
            {user?.role === 'admin' && (
              <>
                <Link
                  to="/admin-dashboard"
                  className={`flex items-center gap-1.5 hover:text-citrus-600 transition-colors ${
                    location.pathname === '/admin-dashboard' ? 'text-citrus-600 font-semibold' : ''
                  }`}
                >
                  Platform Governance
                </Link>
                <Link
                  to="/restaurant-dashboard"
                  className={`flex items-center gap-1.5 hover:text-citrus-600 transition-colors ${
                    location.pathname === '/restaurant-dashboard' ? 'text-citrus-600 font-semibold' : ''
                  }`}
                >
                  <Flame className="w-4 h-4 text-citrus-600" />
                  Kitchen Console
                </Link>
                <Link
                  to="/restaurants"
                  className={`flex items-center gap-1.5 hover:text-citrus-600 transition-colors ${
                    location.pathname === '/restaurants' ? 'text-citrus-600 font-semibold' : ''
                  }`}
                >
                  <Compass className="w-4 h-4" />
                  Inspect Diners
                </Link>
                <Link
                  to="/support"
                  className={`flex items-center gap-1.5 hover:text-citrus-600 transition-colors ${
                    location.pathname === '/support' ? 'text-citrus-600 font-semibold' : ''
                  }`}
                >
                  Customer Care
                </Link>
              </>
            )}

            {/* 4. Diner / Customer / Guest Navigation */}
            {(!user || user.role === 'customer') && (
              <>
                <Link
                  to="/restaurants"
                  className={`flex items-center gap-1.5 hover:text-citrus-600 transition-colors ${
                    location.pathname === '/restaurants' ? 'text-citrus-600 font-semibold' : ''
                  }`}
                >
                  <Compass className="w-4 h-4" />
                  Restaurants
                </Link>
                <Link
                  to="/offers"
                  className={`flex items-center gap-1.5 hover:text-citrus-600 transition-colors ${
                    location.pathname === '/offers' ? 'text-citrus-600 font-semibold' : ''
                  }`}
                >
                  <Tag className="w-4 h-4" />
                  Offers
                </Link>
                <Link
                  to="/tracking"
                  className={`flex items-center gap-1.5 hover:text-citrus-600 transition-colors ${
                    location.pathname.startsWith('/tracking') ? 'text-citrus-600 font-semibold' : ''
                  }`}
                >
                  <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
                  Live Tracker
                </Link>
                {isAuthenticated && (
                  <Link
                    to="/orders"
                    className={`flex items-center gap-1.5 hover:text-citrus-600 transition-colors ${
                      location.pathname === '/orders' ? 'text-citrus-600 font-semibold' : ''
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    My Orders
                  </Link>
                )}
                <Link
                  to="/support"
                  className={`flex items-center gap-1.5 hover:text-citrus-600 transition-colors ${
                    location.pathname === '/support' ? 'text-citrus-600 font-semibold' : ''
                  }`}
                >
                  Customer Care
                </Link>
              </>
            )}
          </nav>

          {/* Right: Cart & Auth */}
          <div className="flex items-center gap-3">
            {/* Cart Button: Visible exclusively to Customers & Guests */}
            {(!user || user.role === 'customer') && (
              <Link
                to="/cart"
                className="relative p-2.5 rounded-full bg-ivory-100 hover:bg-ivory-200 text-charcoal-900 border border-ivory-300 transition-colors flex items-center justify-center group"
                title="View Cart"
              >
                <ShoppingBag className="w-5 h-5 text-charcoal-900 group-hover:scale-105 transition-transform" />
                {totalCartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-citrus-600 text-white text-[11px] font-bold h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center shadow-sm">
                    {totalCartCount}
                  </span>
                )}
              </Link>
            )}

            {/* User Profile / Auth */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-ivory-100 hover:bg-ivory-200 border border-ivory-300 text-sm font-medium text-charcoal-900 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-aubergine-800 text-white flex items-center justify-center text-xs font-bold uppercase">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <span className="hidden sm:inline font-semibold text-xs max-w-[100px] truncate">
                    {user?.name?.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
                </button>

                {/* Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50 animate-fadeIn">
                    <div className="px-4 py-2 border-b border-stone-100">
                      <p className="text-xs text-stone-500">Signed in as</p>
                      <p className="text-sm font-bold text-charcoal-900 truncate">{user?.name}</p>
                      <span className="inline-block px-2 py-0.5 mt-1 bg-ivory-200 text-aubergine-900 rounded text-[10px] font-semibold uppercase tracking-wider">
                        {user?.role?.replace('_', ' ')}
                      </span>
                    </div>

                    {user?.role === 'restaurant' && (
                      <Link
                        to="/restaurant-dashboard"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 hover:text-citrus-600"
                      >
                        Restaurant Console
                      </Link>
                    )}

                    {user?.role === 'delivery_partner' && (
                      <Link
                        to="/partner-dashboard"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 hover:text-citrus-600"
                      >
                        Delivery Partner Portal
                      </Link>
                    )}

                    {user?.role === 'admin' && (
                      <Link
                        to="/admin-dashboard"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 hover:text-citrus-600"
                      >
                        Platform Admin Suite
                      </Link>
                    )}

                    {(!user || user.role === 'customer') && (
                      <Link
                        to="/orders"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 hover:text-citrus-600"
                      >
                        Past Orders
                      </Link>
                    )}

                    <Link
                      to="/support"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 hover:text-citrus-600"
                    >
                      Customer Care
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-stone-100 mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-semibold text-charcoal-900 hover:text-citrus-600 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-full bg-citrus-600 hover:bg-citrus-500 text-white text-xs font-semibold shadow-sm transition-all"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-stone-600 hover:text-stone-900"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Role-Specific Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-ivory-50 border-b border-ivory-300 px-4 pt-2 pb-6 space-y-3">
          {user?.role === 'restaurant' && (
            <>
              <Link
                to="/restaurant-dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-bold text-charcoal-900 hover:text-citrus-600"
              >
                Kitchen Console
              </Link>
              <Link
                to="/support"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-stone-800 hover:text-citrus-600"
              >
                Customer Care & Concierge
              </Link>
            </>
          )}

          {user?.role === 'delivery_partner' && (
            <>
              <Link
                to="/partner-dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-bold text-charcoal-900 hover:text-citrus-600"
              >
                Courier Fleet Portal
              </Link>
              <Link
                to="/support"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-stone-800 hover:text-citrus-600"
              >
                Customer Care & Concierge
              </Link>
            </>
          )}

          {user?.role === 'admin' && (
            <>
              <Link
                to="/admin-dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-bold text-charcoal-900 hover:text-citrus-600"
              >
                Platform Governance Suite
              </Link>
              <Link
                to="/restaurants"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-stone-800 hover:text-citrus-600"
              >
                Inspect Restaurants
              </Link>
              <Link
                to="/support"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-stone-800 hover:text-citrus-600"
              >
                Customer Care & Concierge
              </Link>
            </>
          )}

          {(!user || user.role === 'customer') && (
            <>
              <Link
                to="/restaurants"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-stone-800 hover:text-citrus-600"
              >
                Explore Restaurants
              </Link>
              <Link
                to="/offers"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-stone-800 hover:text-citrus-600"
              >
                Offers & Coupons
              </Link>
              <Link
                to="/tracking"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-stone-800 hover:text-citrus-600"
              >
                Live Order Tracking
              </Link>
              {isAuthenticated && (
                <Link
                  to="/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-base font-medium text-stone-800 hover:text-citrus-600"
                >
                  My Orders
                </Link>
              )}
              <Link
                to="/support"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-stone-800 hover:text-citrus-600"
              >
                Customer Care & FAQs
              </Link>
            </>
          )}
        </div>
      )}
    </header>
    {/* Interactive Delivery Location Selector Modal */}
    <LocationModal
      isOpen={locationModalOpen}
      onClose={() => setLocationModalOpen(false)}
    />
  </>
);
}
