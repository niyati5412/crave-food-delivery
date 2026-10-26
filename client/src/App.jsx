import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { connectSocket } from './services/socket';

// Components
import RoleBanner from './components/RoleBanner';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartConflictModal from './components/CartConflictModal';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import HomePage from './pages/HomePage';
import DiscoveryPage from './pages/DiscoveryPage';
import RestaurantDetailPage from './pages/RestaurantDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import OffersPage from './pages/OffersPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import CustomerCarePage from './pages/CustomerCarePage';
import RestaurantDashboardPage from './pages/RestaurantDashboardPage';
import PartnerDashboardPage from './pages/PartnerDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

export default function App() {
  const { token, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && token) {
      connectSocket(token);
    }
  }, [isAuthenticated, token]);

  return (
    <div className="min-h-screen flex flex-col bg-ivory-50 text-charcoal-900 font-sans selection:bg-citrus-500 selection:text-white">
      {/* Optional Development-Only Role Switcher (Disabled by default for production & real auth operations) */}
      {import.meta.env.VITE_ENABLE_DEV_ROLE_BANNER === 'true' && <RoleBanner />}

      {/* Global Brand Navigation Bar */}
      <Navbar />

      {/* Main Routed Content */}
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/restaurants" element={<DiscoveryPage />} />
          <Route path="/restaurants/:id" element={<RestaurantDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/offers" element={<OffersPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/support" element={<CustomerCarePage />} />

          {/* Protected Customer Routes */}
          <Route
            path="/checkout"
            element={
              <ProtectedRoute allowedRoles={['customer', 'admin']}>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tracking"
            element={
              <ProtectedRoute>
                <OrderTrackingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tracking/:id"
            element={
              <ProtectedRoute>
                <OrderTrackingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrderHistoryPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Role Specific Dashboards */}
          <Route
            path="/restaurant-dashboard"
            element={
              <ProtectedRoute allowedRoles={['restaurant', 'admin']}>
                <RestaurantDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/partner-dashboard"
            element={
              <ProtectedRoute allowedRoles={['delivery_partner']}>
                <PartnerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback 404 */}
          <Route
            path="*"
            element={
              <div className="py-24 text-center space-y-4">
                <h2 className="font-serif text-4xl font-bold text-charcoal-900">404 — Page Not Found</h2>
                <p className="text-xs text-stone-500">The destination you requested does not exist on CRAVE.</p>
              </div>
            }
          />
        </Routes>
      </main>

      {/* Single Restaurant Cart Conflict Dialog */}
      <CartConflictModal />

      {/* Global Haute Gastronomy Footer */}
      <Footer />
    </div>
  );
}
