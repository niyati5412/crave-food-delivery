import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Flame, ArrowRight, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Check, X } from 'lucide-react';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const navigate = useNavigate();

  const hasMinLength = password.length >= 8;
  const passwordsMatch = password && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!token || !email) {
      setErrorMessage('Reset token or email is missing. Please use the link sent to your email.');
      return;
    }

    if (!hasMinLength) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/auth/reset-password', {
        token,
        email,
        newPassword: password
      });

      if (res.data.success) {
        setIsSuccess(true);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
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
            Set New Password
          </h1>
          <p className="text-xs text-stone-500">
            {email ? `Resetting password for ${email}` : 'Choose a strong, secure new password'}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isSuccess ? (
          <div className="space-y-5 text-center">
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h3 className="font-serif text-base font-bold text-emerald-950">
                Password Successfully Reset!
              </h3>
              <p className="text-xs text-emerald-800">
                Your password has been securely updated. You can now sign in with your new credentials.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full py-3.5 px-6 rounded-2xl bg-citrus-600 hover:bg-citrus-500 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>Go to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : !token || !email ? (
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 space-y-3 text-center">
            <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
            <h3 className="font-serif text-base font-bold text-amber-950">
              Invalid or Missing Reset Link
            </h3>
            <p className="text-xs text-amber-800">
              This password reset link is invalid or incomplete. Please request a fresh reset link from the forgot password page.
            </p>
            <Link
              to="/forgot-password"
              className="inline-block mt-2 px-5 py-2.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              Request New Reset Link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                New Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setErrorMessage('');
                    setPassword(e.target.value);
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
                Confirm New Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setErrorMessage('');
                    setConfirmPassword(e.target.value);
                  }}
                  placeholder="Re-enter new password"
                  className={`w-full px-4 py-2.5 pr-10 rounded-xl bg-stone-50 border text-xs text-charcoal-900 focus:outline-none ${
                    confirmPassword && !passwordsMatch
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

            {/* Validation checklist */}
            {password && (
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
                {confirmPassword && (
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl bg-citrus-600 hover:bg-citrus-500 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Resetting Password...</span>
              ) : (
                <>
                  <span>Save New Password</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
