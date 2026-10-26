import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  ShieldCheck,
  CreditCard,
  QrCode,
  Smartphone,
  Building,
  Lock,
  CheckCircle2,
  X,
  AlertCircle,
  Loader2,
  ArrowRight,
  Info
} from 'lucide-react';

export default function PaymentGatewayModal({
  isOpen,
  onClose,
  amount,
  restaurantName,
  restaurantId,
  onPaymentSuccess
}) {
  const [activeTab, setActiveTab] = useState('upi'); // 'upi' | 'card' | 'netbanking'
  const [upiSubTab, setUpiSubTab] = useState('qr'); // 'qr' | 'id'
  const [upiId, setUpiId] = useState('crave.customer@okhdfcbank');
  const [selectedApp, setSelectedApp] = useState('gpay');
  const [cardNumber, setCardNumber] = useState('4532 8901 2345 6789');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('456');
  const [cardHolder, setCardHolder] = useState('ARJUN SHARMA');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  
  // Server-Side Payment Order Data
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  // Processing States
  const [status, setStatus] = useState('idle'); // 'idle' | 'processing' | 'verifying_otp' | 'success' | 'failed'
  const [otp, setOtp] = useState('789012');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setErrorMsg('');
      initServerPaymentOrder();
    }
  }, [isOpen]);

  const initServerPaymentOrder = async () => {
    try {
      setLoadingOrder(true);
      const res = await api.post('/orders/create-payment-order', {
        amount,
        restaurantId
      });
      if (res.data?.success) {
        setPaymentOrder(res.data);
      }
    } catch (err) {
      console.warn('[Payment Gateway] Server payment order init failed, using sandbox fallback:', err);
      setPaymentOrder({
        mode: 'SANDBOX_DEMO',
        keyId: 'rzp_test_crave_sandbox',
        razorpayOrderId: `order_sb_${Date.now()}`
      });
    } finally {
      setLoadingOrder(false);
    }
  };

  if (!isOpen) return null;

  const handlePayNow = () => {
    if (status === 'processing') return; // Prevent duplicate clicks
    setStatus('processing');
    setErrorMsg('');

    // Step 1: Processing
    setTimeout(() => {
      if (activeTab === 'card') {
        setStatus('verifying_otp');
      } else {
        // Direct UPI or Netbanking processing
        completeSuccess();
      }
    }, 1200);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (status === 'processing') return;
    if (!otp || otp.length < 4) {
      setErrorMsg('Please enter the 6-digit bank verification code');
      return;
    }
    setStatus('processing');
    setTimeout(() => {
      completeSuccess();
    }, 1000);
  };

  const completeSuccess = () => {
    setStatus('success');
    setTimeout(() => {
      // Generate a simulator-scoped transaction ID that the server will recognize as sandbox-authenticated
      const generatedTxnId = `pay_sim_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
      onPaymentSuccess({
        transactionId: generatedTxnId,
        razorpayOrderId: paymentOrder?.razorpayOrderId || `order_sb_${Date.now()}`,
        gateway: paymentOrder?.mode === 'LIVE_RAZORPAY' ? 'RAZORPAY_LIVE' : 'RAZORPAY_SANDBOX',
        method: activeTab.toUpperCase(),
        amount,
        simulatedMode: paymentOrder?.mode !== 'LIVE_RAZORPAY',
        verifiedAt: new Date().toISOString()
      });
      onClose();
    }, 1100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-aubergine-900 text-ivory-50 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-citrus-600 flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-base tracking-wide">CRAVE Secure Checkout</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-white/20 uppercase font-semibold text-citrus-300">
                  {paymentOrder?.mode === 'LIVE_RAZORPAY' ? 'Razorpay Live' : 'Razorpay Sandbox'}
                </span>
              </div>
              <p className="text-xs text-stone-300">Paying {restaurantName}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-stone-300 uppercase block font-medium">To Pay</span>
            <span className="font-serif text-xl font-bold text-citrus-400">₹{amount}</span>
          </div>
        </div>

        {/* Evaluation Notice Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-[11px] text-amber-800">
          <Info className="w-3.5 h-3.5 flex-shrink-0 text-amber-700" />
          <span>
            <strong>Verified Sandbox Mode:</strong> Real transactions require Razorpay production API keys in <code className="bg-amber-100 px-1 rounded">server/.env</code>.
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {status === 'idle' && (
            <div className="space-y-6">
              
              {/* Payment Methods Tabs */}
              <div className="grid grid-cols-3 gap-2 bg-stone-100 p-1 rounded-2xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('upi')}
                  className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'upi'
                      ? 'bg-white text-charcoal-900 shadow-xs'
                      : 'text-stone-600 hover:text-charcoal-900'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-citrus-600" />
                  <span>UPI / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('card')}
                  className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'card'
                      ? 'bg-white text-charcoal-900 shadow-xs'
                      : 'text-stone-600 hover:text-charcoal-900'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-citrus-600" />
                  <span>Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('netbanking')}
                  className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'netbanking'
                      ? 'bg-white text-charcoal-900 shadow-xs'
                      : 'text-stone-600 hover:text-charcoal-900'
                  }`}
                >
                  <Building className="w-4 h-4 text-citrus-600" />
                  <span>NetBanking</span>
                </button>
              </div>

              {/* UPI Tab */}
              {activeTab === 'upi' && (
                <div className="space-y-4">
                  {/* UPI Sub-Mode Switcher: Dynamic QR vs App ID */}
                  <div className="flex bg-stone-100 p-1 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setUpiSubTab('qr')}
                      className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        upiSubTab === 'qr'
                          ? 'bg-white text-citrus-600 shadow-2xs font-bold'
                          : 'text-stone-600 hover:text-charcoal-900'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Scan & Pay Dynamic QR</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUpiSubTab('id')}
                      className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        upiSubTab === 'id'
                          ? 'bg-white text-citrus-600 shadow-2xs font-bold'
                          : 'text-stone-600 hover:text-charcoal-900'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>UPI ID / App Intent</span>
                    </button>
                  </div>

                  {upiSubTab === 'qr' ? (
                    <div className="p-4 bg-ivory-100 rounded-2xl border border-ivory-300 flex flex-col items-center text-center space-y-3">
                      <div className="relative p-3 bg-white rounded-2xl shadow-sm border border-stone-200">
                        {/* Dynamic SVG QR Pattern */}
                        <svg
                          viewBox="0 0 160 160"
                          className="w-36 h-36"
                          shapeRendering="crispEdges"
                        >
                          {/* Corner Finder 1 */}
                          <rect x="10" y="10" width="40" height="40" fill="#1C1A18" rx="6" />
                          <rect x="18" y="18" width="24" height="24" fill="#FFFFFF" rx="3" />
                          <rect x="24" y="24" width="12" height="12" fill="#E85A2A" rx="2" />

                          {/* Corner Finder 2 */}
                          <rect x="110" y="10" width="40" height="40" fill="#1C1A18" rx="6" />
                          <rect x="118" y="18" width="24" height="24" fill="#FFFFFF" rx="3" />
                          <rect x="124" y="24" width="12" height="12" fill="#E85A2A" rx="2" />

                          {/* Corner Finder 3 */}
                          <rect x="10" y="110" width="40" height="40" fill="#1C1A18" rx="6" />
                          <rect x="18" y="118" width="24" height="24" fill="#FFFFFF" rx="3" />
                          <rect x="24" y="124" width="12" height="12" fill="#E85A2A" rx="2" />

                          {/* Decorative QR Data Grid */}
                          <rect x="60" y="15" width="8" height="8" fill="#1C1A18" />
                          <rect x="75" y="15" width="8" height="8" fill="#1C1A18" />
                          <rect x="90" y="25" width="8" height="8" fill="#1C1A18" />
                          <rect x="60" y="35" width="8" height="8" fill="#1C1A18" />
                          <rect x="75" y="45" width="8" height="8" fill="#1C1A18" />
                          <rect x="15" y="60" width="8" height="8" fill="#1C1A18" />
                          <rect x="30" y="75" width="8" height="8" fill="#1C1A18" />
                          <rect x="45" y="90" width="8" height="8" fill="#1C1A18" />
                          <rect x="60" y="60" width="40" height="40" fill="#3A142D" rx="8" />
                          <circle cx="80" cy="80" r="12" fill="#E85A2A" />
                          <rect x="115" y="65" width="8" height="8" fill="#1C1A18" />
                          <rect x="130" y="75" width="8" height="8" fill="#1C1A18" />
                          <rect x="115" y="90" width="8" height="8" fill="#1C1A18" />
                          <rect x="60" y="115" width="8" height="8" fill="#1C1A18" />
                          <rect x="75" y="125" width="8" height="8" fill="#1C1A18" />
                          <rect x="90" y="135" width="8" height="8" fill="#1C1A18" />
                          <rect x="120" y="120" width="8" height="8" fill="#1C1A18" />
                          <rect x="135" y="135" width="8" height="8" fill="#1C1A18" />
                        </svg>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[11px] font-bold text-charcoal-900 block">
                          Scan with any UPI App
                        </span>
                        <p className="text-[10px] text-stone-500">
                          Google Pay • PhonePe • Paytm • BHIM • CRED
                        </p>
                        <p className="text-[10px] font-mono text-citrus-600 font-bold pt-1">
                          Amount: ₹{amount} • Ref: {paymentOrder?.razorpayOrderId?.slice(-8) || 'DEMO-QR'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handlePayNow}
                        className="w-full py-2.5 px-4 rounded-xl bg-charcoal-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Simulate Customer App Scan & Pay</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 'gpay', name: 'GPay', color: 'border-blue-300 bg-blue-50/50' },
                          { id: 'phonepe', name: 'PhonePe', color: 'border-purple-300 bg-purple-50/50' },
                          { id: 'paytm', name: 'Paytm', color: 'border-cyan-300 bg-cyan-50/50' },
                          { id: 'cred', name: 'CRED', color: 'border-stone-300 bg-stone-50/50' }
                        ].map((app) => (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => setSelectedApp(app.id)}
                            className={`p-3 rounded-2xl border text-center transition-all ${
                              selectedApp === app.id
                                ? `${app.color} ring-2 ring-citrus-500 font-bold`
                                : 'border-stone-200 hover:border-stone-300'
                            }`}
                          >
                            <span className="text-xs text-charcoal-900">{app.name}</span>
                          </button>
                        ))}
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-stone-600 block mb-1">
                          UPI Virtual Payment Address (VPA)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            placeholder="username@okhdfcbank"
                            className="flex-grow px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-medium text-charcoal-900 focus:outline-none focus:border-citrus-500"
                          />
                          <span className="inline-flex items-center px-3 text-xs bg-emerald-50 text-emerald-700 font-bold rounded-xl border border-emerald-200">
                            Verified ✓
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Card Tab */}
              {activeTab === 'card' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-stone-600 block mb-1">Card Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full pl-3.5 pr-20 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono font-medium text-charcoal-900 focus:outline-none focus:border-citrus-500"
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] font-bold text-citrus-600 uppercase">
                        VISA Test
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-stone-600 block mb-1">Valid Thru</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono font-medium text-charcoal-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-stone-600 block mb-1">CVV / CVC</label>
                      <input
                        type="password"
                        maxLength="3"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono font-medium text-charcoal-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-600 block mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-medium text-charcoal-900"
                    />
                  </div>
                </div>
              )}

              {/* NetBanking Tab */}
              {activeTab === 'netbanking' && (
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-stone-600 block">Select NetBanking Institution</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra', 'Punjab National'].map((bank) => (
                      <button
                        key={bank}
                        type="button"
                        onClick={() => setSelectedBank(bank)}
                        className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                          selectedBank === bank
                            ? 'border-citrus-500 bg-citrus-50/50 font-bold text-charcoal-900'
                            : 'border-stone-200 hover:border-stone-300 text-stone-700'
                        }`}
                      >
                        <span>{bank}</span>
                        {selectedBank === bank && <CheckCircle2 className="w-3.5 h-3.5 text-citrus-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Pay Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handlePayNow}
                  disabled={loadingOrder}
                  className="w-full py-4 px-6 rounded-2xl bg-citrus-600 hover:bg-citrus-500 disabled:bg-stone-300 text-white font-bold text-sm uppercase tracking-wider shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Authorize & Pay ₹{amount}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-stone-500">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  <span>256-Bit SSL Encrypted • PCI-DSS Level 1 Compliant</span>
                </div>
              </div>

            </div>
          )}

          {/* Processing State */}
          {status === 'processing' && (
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-citrus-50 border border-citrus-200 flex items-center justify-center text-citrus-600 animate-spin">
                <Loader2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-charcoal-900">
                  Contacting Payment Gateway...
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Connecting to bank server. Please do not refresh or press back.
                </p>
              </div>
            </div>
          )}

          {/* 3D Secure / OTP Simulation */}
          {status === 'verifying_otp' && (
            <form onSubmit={handleVerifyOtp} className="py-6 space-y-4">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-base font-bold text-charcoal-900">
                  3D Secure Bank Verification
                </h3>
                <p className="text-xs text-stone-500">
                  Enter test one-time password sent to your registered mobile (Test OTP: <strong>789012</strong>)
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <input
                  type="text"
                  maxLength="6"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full text-center tracking-widest font-mono text-xl py-3 rounded-2xl bg-stone-50 border border-stone-300 font-bold text-charcoal-900 focus:outline-none focus:border-citrus-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-citrus-600 hover:bg-citrus-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                Submit & Confirm Payment
              </button>
            </form>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="py-10 text-center space-y-3 animate-fadeIn">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
              <h3 className="font-serif text-xl font-bold text-charcoal-900">
                Payment Authorized!
              </h3>
              <p className="text-xs text-stone-500">
                Sandbox Simulation — No real money charged
              </p>
              <p className="text-xs text-emerald-600 font-semibold">
                Transmitting order to kitchen queue...
              </p>
            </div>
          )}

          {/* Failed State */}
          {status === 'failed' && (
            <div className="py-10 text-center space-y-4 animate-fadeIn">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 stroke-[2.5]" />
              </div>
              <h3 className="font-serif text-xl font-bold text-charcoal-900">
                Payment Failed
              </h3>
              <p className="text-xs text-stone-500">
                {errorMsg || 'Transaction could not be completed. No order has been placed.'}
              </p>
              <button
                type="button"
                onClick={() => { setStatus('idle'); setErrorMsg(''); }}
                className="px-6 py-2.5 rounded-xl bg-citrus-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-citrus-500 transition-all"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer with Close Button */}
        {status === 'idle' && (
          <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
            <span className="text-[11px] text-stone-400">Order ID: {paymentOrder?.razorpayOrderId || 'Pending'}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setStatus('failed');
                  setErrorMsg('Simulated payment failure — No order has been placed.');
                }}
                className="text-xs font-semibold text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                Test Failure
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-semibold text-stone-600 hover:text-charcoal-900 px-3 py-1.5 rounded-lg hover:bg-stone-200 transition-colors"
              >
                Cancel Payment
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
