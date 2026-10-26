import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Flame, ArrowRight, ArrowLeft, Mail, AlertCircle, CheckCircle2, Info } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [devModeNotice, setDevModeNotice] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      const res = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      if (res.data.success) {
        setSubmitted(true);
        if (res.data.devMode) {
          setDevModeNotice(true);
          if (res.data.devResetUrl) {
            setDevResetUrl(res.data.devResetUrl);
          }
        }
      }
    } catch (err) {
      // Even on error, show neutral guidance
      setSubmitted(true);
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
            Forgot Password
          </h1>
          <p className="text-xs text-stone-500">
            Enter your registered email address to receive password reset instructions
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {submitted ? (
          <div className="space-y-5">
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h3 className="font-serif text-base font-bold text-emerald-950">
                Instructions Sent
              </h3>
              <p className="text-xs leading-relaxed text-emerald-800">
                If an account with that email exists, password reset instructions have been sent. Please check your inbox (and spam folder).
              </p>
            </div>

            {devModeNotice && (
              <div className="p-4 rounded-2xl bg-ivory-100 border border-ivory-300 text-charcoal-900 space-y-3 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-citrus-600">
                  <Info className="w-4 h-4" />
                  <span>Local Development Mode Notice:</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Real SMTP credentials (<code className="bg-white px-1 py-0.5 rounded border border-stone-200 font-mono">EMAIL_SMTP_*</code>) are not configured in your <code className="bg-white px-1 py-0.5 rounded border border-stone-200 font-mono">.env</code>. To test without email setup, click below to set your new password directly:
                </p>
                {devResetUrl && (
                  <a
                    href={devResetUrl}
                    className="w-full py-2.5 px-4 rounded-xl bg-citrus-600 hover:bg-citrus-500 text-white font-bold text-xs uppercase tracking-wider shadow-xs transition-all flex items-center justify-center gap-2 text-center"
                  >
                    <span>Proceed to Set New Password</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            <div className="pt-2">
              <Link
                to="/login"
                className="w-full py-3.5 px-6 rounded-2xl bg-charcoal-900 hover:bg-stone-800 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Registered Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setErrorMessage('');
                    setEmail(e.target.value);
                  }}
                  placeholder="e.g. customer@crave.com"
                  required
                  className="w-full px-4 py-2.5 pl-10 rounded-xl bg-stone-50 border border-stone-200 text-xs text-charcoal-900 focus:outline-none focus:border-citrus-500"
                />
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-2xl bg-citrus-600 hover:bg-citrus-500 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <span>Send Reset Instructions</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-citrus-600 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
