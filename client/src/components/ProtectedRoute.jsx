import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // If an Admin navigates to a role-specific screen (like partner-dashboard), redirect to admin dashboard
    if (user?.role === 'admin') {
      return <Navigate to="/admin-dashboard" replace />;
    }

    return (
      <div className="min-h-[75vh] flex items-center justify-center p-6 text-center">
        <div className="max-w-lg bg-white rounded-3xl p-8 border border-red-200 shadow-2xl space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-inner">
            <ShieldAlert className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
              403 Forbidden • Role Authorization Guard
            </span>
            <h2 className="font-serif text-2xl font-bold text-charcoal-900 pt-2">
              Privileged Access Restricted
            </h2>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Customers cannot view proprietary restaurant revenue, order logs, or fleet telematics. This module is strictly restricted to accounts with <strong className="text-charcoal-900 font-bold uppercase">{allowedRoles.join(' or ')}</strong> permissions.
          </p>
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-500 flex items-center justify-between">
            <span>Your authenticated account:</span>
            <span className="font-mono font-bold text-charcoal-900 bg-white px-2 py-0.5 rounded border border-stone-200 uppercase">
              {user?.role} ({user?.email})
            </span>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-charcoal-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors shadow-md"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Customer Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
