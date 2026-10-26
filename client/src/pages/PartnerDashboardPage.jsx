import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import api from '../services/api';
import { connectSocket, getSocket } from '../services/socket';
import {
  Bike,
  Power,
  Navigation,
  MapPin,
  CheckCircle2,
  Phone,
  Clock,
  DollarSign,
  Package,
  ShieldCheck,
  AlertCircle,
  Radio,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export default function PartnerDashboardPage() {
  const { token, user } = useSelector((state) => state.auth);

  // If Admin attempts to access the courier portal directly, redirect to platform governance
  if (user?.role === 'admin') {
    return <Navigate to="/admin-dashboard" replace />;
  }
  if (user && user.role !== 'delivery_partner') {
    return <Navigate to="/" replace />;
  }

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [toggleError, setToggleError] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [broadcastingGps, setBroadcastingGps] = useState(false);
  const [realGpsActive, setRealGpsActive] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const gpsIntervalRef = useRef(null);
  const watchIdRef = useRef(null);

  // Operational Feedback State
  const [lastCompletedOrder, setLastCompletedOrder] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [pickupDelayMins, setPickupDelayMins] = useState(0);
  const [packagingCondition, setPackagingCondition] = useState('excellent');
  const [issueType, setIssueType] = useState('none');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  useEffect(() => {
    fetchPartnerDashboard(true);
    return () => {
      if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current);
      if (watchIdRef.current && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const handleToggleRealGps = () => {
    if (realGpsActive) {
      if (watchIdRef.current && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      setRealGpsActive(false);
      return;
    }

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsError('');
    if (broadcastingGps) {
      clearInterval(gpsIntervalRef.current);
      setBroadcastingGps(false);
    }

    const activeOrder = dashboardData?.activeOrder;
    const socket = getSocket();

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const coords = [
          Math.round(position.coords.longitude * 10000) / 10000,
          Math.round(position.coords.latitude * 10000) / 10000
        ];
        setCurrentCoords(coords);
        setRealGpsActive(true);

        if (socket && activeOrder) {
          socket.emit('partner:location_tick', {
            orderId: activeOrder._id,
            coordinates: coords,
            heading: position.coords.heading || 0,
            speed: position.coords.speed ? Math.round(position.coords.speed * 3.6) : 25,
            isRealGps: true
          });
        }

        try {
          await api.post('/partners/location', {
            coordinates: coords,
            heading: position.coords.heading || 0,
            speed: position.coords.speed ? Math.round(position.coords.speed * 3.6) : 25,
            orderId: activeOrder?._id
          });
        } catch (e) {
          // Throttled or offline
        }
      },
      (err) => {
        console.warn('Geolocation permission denied or error:', err.message);
        setGpsError(`Device GPS error: ${err.message}. Ensure location permissions are granted.`);
        setRealGpsActive(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000
      }
    );
  };

  useEffect(() => {
    if (!token || !user) return;

    const socket = connectSocket(token);
    if (socket) {
      socket.on('order:assigned', (data) => {
        console.log('[Socket] New delivery assignment:', data);
        if (data?.order) {
          setDashboardData(prev => ({
            ...prev,
            activeOrder: data.order
          }));
        }
        fetchPartnerDashboard(false);
      });

      socket.on('order:status_updated', (data) => {
        if (data?.order) {
          setDashboardData(prev => {
            if (!prev) return prev;
            if (['delivered', 'cancelled', 'rejected'].includes(data.order.status)) {
              return {
                ...prev,
                activeOrder: null,
                stats: {
                  ...prev.stats,
                  completedTodayCount: (prev.stats?.completedTodayCount || 0) + (data.order.status === 'delivered' ? 1 : 0),
                  earningsToday: (prev.stats?.earningsToday || 0) + (data.order.status === 'delivered' ? 65 : 0)
                }
              };
            }
            return {
              ...prev,
              activeOrder: data.order
            };
          });
        }
        fetchPartnerDashboard(false);
      });
    }

    return () => {
      if (socket) {
        socket.off('order:assigned');
        socket.off('order:status_updated');
      }
    };
  }, [token, user]);

  const toggleGpsBroadcast = () => {
    if (broadcastingGps) {
      clearInterval(gpsIntervalRef.current);
      setBroadcastingGps(false);
      return;
    }

    const activeOrder = dashboardData?.activeOrder;
    if (!activeOrder) return;

    setBroadcastingGps(true);
    const start = activeOrder.restaurantId?.location?.coordinates || [77.218, 28.631];
    const dest = activeOrder.deliveryAddress?.location?.coordinates || [77.225, 28.638];

    let currentLng = start[0];
    let currentLat = start[1];
    const steps = 20;
    const dLng = (dest[0] - start[0]) / steps;
    const dLat = (dest[1] - start[1]) / steps;
    let stepCount = 0;

    const socket = getSocket();

    gpsIntervalRef.current = setInterval(async () => {
      stepCount++;
      currentLng += dLng;
      currentLat += dLat;
      const coords = [
        Math.round(currentLng * 10000) / 10000,
        Math.round(currentLat * 10000) / 10000
      ];

      if (socket) {
        socket.emit('partner:location_tick', {
          orderId: activeOrder._id,
          coordinates: coords,
          heading: 75,
          speed: 30
        });
      }

      try {
        await api.post('/partners/location', {
          coordinates: coords,
          orderId: activeOrder._id
        });
      } catch (e) {
        // Throttled
      }

      if (stepCount >= steps) {
        clearInterval(gpsIntervalRef.current);
        setBroadcastingGps(false);
      }
    }, 2500);
  };

  const fetchPartnerDashboard = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await api.get('/partners/dashboard');
      if (res.data.success) {
        setDashboardData(res.data);
        if (res.data.location) {
          setCurrentCoords(res.data.location);
        }
      }
    } catch (err) {
      console.error('Failed to load partner dashboard:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleToggleOnline = async () => {
    try {
      setToggleError('');
      const res = await api.patch('/partners/availability');
      if (res.data.success) {
        setDashboardData(prev => ({
          ...prev,
          isOnline: res.data.isAvailable
        }));
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to toggle partner online status';
      setToggleError(msg);
      alert(msg);
    }
  };

  const handleUpdateOrderStatus = async (nextStatus) => {
    if (!dashboardData?.activeOrder) return;

    try {
      await api.patch(`/orders/${dashboardData.activeOrder._id}/status`, {
        status: nextStatus
      });
      fetchPartnerDashboard();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update order status');
    }
  };

  const handleVerifyOtpAndDeliver = async () => {
    const activeOrder = dashboardData?.activeOrder;
    if (!activeOrder) return;

    const trimmedOtp = otpInput.trim();
    if (!trimmedOtp || trimmedOtp.length !== 4) {
      setOtpError('Please enter the customer 4-digit verification OTP.');
      return;
    }

    try {
      await api.patch(`/orders/${activeOrder._id}/status`, {
        status: 'delivered',
        otp: trimmedOtp,
        note: 'Delivered at doorstep with verified customer OTP.'
      });

      setLastCompletedOrder({
        id: activeOrder._id,
        orderNumber: activeOrder.orderNumber,
        restaurantName: activeOrder.restaurantId?.name
      });
      setShowOtpModal(false);
      setOtpInput('');
      setOtpError('');

      // Immediately release in-flight trip in local state so UI updates instantaneously
      setDashboardData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          activeOrder: null,
          activeOrders: [],
          stats: {
            ...prev.stats,
            completedTodayCount: (prev.stats?.completedTodayCount || 0) + 1,
            completedAllTimeCount: (prev.stats?.completedAllTimeCount || 0) + 1,
            earningsToday: (prev.stats?.earningsToday || 0) + 65
          }
        };
      });

      fetchPartnerDashboard();
      setShowFeedbackModal(true);
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Delivery verification failed. Verify 4-digit customer OTP.');
    }
  };

  const handleSubmitPartnerFeedback = async (e) => {
    e?.preventDefault();
    if (!lastCompletedOrder) return;
    try {
      setSubmittingFeedback(true);
      await api.post('/reviews/partner-feedback', {
        orderId: lastCompletedOrder.id,
        pickupDelayMins: Number(pickupDelayMins),
        packagingCondition,
        issueType,
        notes: feedbackNotes
      });
      setFeedbackSuccess(true);
      setTimeout(() => {
        setShowFeedbackModal(false);
        setFeedbackSuccess(false);
      }, 1400);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit operational feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6 animate-pulse">
        <div className="h-40 bg-stone-200 rounded-3xl" />
        <div className="h-64 bg-stone-200 rounded-3xl" />
      </div>
    );
  }

  const { isOnline, activeOrder, stats } = dashboardData || {};

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Pending Account Notice */}
      {(user?.accountStatus === 'pending' || user?.partnerDetails?.isVerified === false) && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl flex items-center gap-3 text-xs text-amber-800 shadow-2xs">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <div>
            <p className="font-bold">Application Pending Administrator Approval</p>
            <p className="text-[11px] text-amber-700">
              Your courier registration is awaiting administrative verification. You will be able to toggle online and receive delivery trips once verified.
            </p>
          </div>
        </div>
      )}

      {/* Partner Header & Availability Toggle */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-aubergine-900 text-citrus-400 flex items-center justify-center shadow-inner">
            <Bike className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-bold text-citrus-600 uppercase tracking-widest block">
              Fleet Partner Console
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal-900">
              {dashboardData?.partner?.name || user?.name || 'Courier Partner'}
            </h1>
            <p className="text-xs text-stone-500">
              {(dashboardData?.partner?.partnerDetails?.vehicleType || user?.partnerDetails?.vehicleType)?.toUpperCase() || 'DELIVERY FLEET'}
              {(dashboardData?.partner?.partnerDetails?.vehicleNumber || user?.partnerDetails?.vehicleNumber) ? ` • ${(dashboardData?.partner?.partnerDetails?.vehicleNumber || user?.partnerDetails?.vehicleNumber)}` : ''}
            </p>
          </div>
        </div>

        {/* Online / Duty Toggle & Refresh */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchPartnerDashboard(true)}
            className="p-3 rounded-2xl bg-ivory-100 hover:bg-ivory-200 text-charcoal-900 border border-ivory-300 transition-colors"
            title="Refresh Deliveries"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleToggleOnline}
            className={`px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm ${
              isOnline
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-4 ring-emerald-100'
                : 'bg-stone-200 hover:bg-stone-300 text-stone-700'
            }`}
          >
            <Power className="w-4 h-4" />
            {isOnline ? 'Online & Ready for Orders' : 'Offline / Off-Duty'}
          </button>
        </div>
      </div>

      {toggleError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{toggleError}</span>
        </div>
      )}

      {/* Daily Earnings & Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-stone-400 uppercase block">Trips Completed Today</span>
          <p className="font-serif text-3xl font-bold text-charcoal-900 mt-1">{stats?.completedTodayCount || 0}</p>
          {stats?.completedAllTimeCount !== undefined && (
            <span className="text-[10px] text-stone-400 block mt-0.5">All-time: {stats.completedAllTimeCount} deliveries</span>
          )}
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-stone-400 uppercase block">Today's Earnings</span>
          <p className="font-serif text-3xl font-bold text-emerald-600 mt-1">₹{stats?.earningsToday || 0}</p>
          <span className="text-[10px] text-stone-400 block mt-0.5">₹65 fixed payout / trip</span>
        </div>
        <div className="col-span-2 md:col-span-1 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-stone-400 uppercase block">Courier Rating</span>
          <p className="font-serif text-3xl font-bold text-amber-500 mt-1">
            {stats?.averageRating ? `${stats.averageRating}★` : (stats?.completedTodayCount > 0 || stats?.completedAllTimeCount > 0 ? '5.0★' : 'New Courier')}
          </p>
          <span className="text-[10px] text-stone-400 block mt-0.5">
            {stats?.reviewCount ? `${stats.reviewCount} customer reviews` : 'Awaiting reviews'}
          </span>
        </div>
      </div>

      {/* Active Assignment Section */}
      <div className="space-y-4">
        <h2 className="font-serif text-xl font-bold text-charcoal-900">
          Active In-Flight Delivery
        </h2>

        {activeOrder ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
            
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div>
                <span className="text-xs font-mono font-bold text-charcoal-900">
                  Order #{activeOrder.orderNumber}
                </span>
                <p className="text-xs text-stone-500">
                  Items: {activeOrder.items?.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                </p>
              </div>

              <span className="px-3 py-1 rounded-full bg-citrus-100 text-citrus-800 text-xs font-bold uppercase tracking-wider">
                {activeOrder.status?.replace('_', ' ')}
              </span>
            </div>

            {/* Pickup & Dropoff Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Kitchen Pickup */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-citrus-600 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> 1. Kitchen Pickup
                </span>
                <h4 className="text-sm font-bold text-charcoal-900">{activeOrder.restaurantId?.name}</h4>
                <p className="text-xs text-stone-600">{activeOrder.restaurantId?.address?.addressLine}</p>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${activeOrder.restaurantId?.location?.coordinates[1]},${activeOrder.restaurantId?.location?.coordinates[0]}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline pt-1"
                >
                  <Navigation className="w-3 h-3" /> Turn-by-Turn GPS to Kitchen
                </a>
              </div>

              {/* Customer Drop-off */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> 2. Customer Drop-off
                </span>
                <h4 className="text-sm font-bold text-charcoal-900">{activeOrder.customerId?.name}</h4>
                <p className="text-xs text-stone-600">{activeOrder.deliveryAddress?.addressLine}</p>
                <div className="flex items-center gap-4 pt-1 text-xs font-bold">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${activeOrder.deliveryAddress?.location?.coordinates[1]},${activeOrder.deliveryAddress?.location?.coordinates[0]}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Navigation className="w-3 h-3" /> GPS to Drop-off
                  </a>
                  <a
                    href={`tel:${activeOrder.deliveryAddress?.contactPhone}`}
                    className="text-stone-700 hover:underline flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3 text-citrus-600" /> Call Diner
                  </a>
                </div>
              </div>

            </div>

            {/* Action Buttons for Trip Progression & Live GPS Telemetry */}
            <div className="pt-2 border-t border-stone-100 space-y-4">
              <div className="flex flex-wrap gap-3">
                {/* 1. If still preparing in kitchen: courier waits */}
                {(activeOrder.status === 'accepted' || activeOrder.status === 'preparing') && (
                  <div className="flex-1 py-3 px-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                    <span>Kitchen is preparing order #{activeOrder.orderNumber}. Awaiting "Ready for Pickup" signal...</span>
                  </div>
                )}

                {/* 2. Ready for pickup: Courier can pick up */}
                {activeOrder.status === 'ready_for_pickup' && (
                  <button
                    onClick={() => handleUpdateOrderStatus('picked_up')}
                    className="flex-1 py-3.5 px-4 rounded-xl bg-charcoal-900 hover:bg-stone-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md animate-pulse"
                  >
                    <Package className="w-4 h-4" />
                    Confirm Picked Up from Kitchen
                  </button>
                )}

                {/* 3. Picked up: Courier starts transit */}
                {activeOrder.status === 'picked_up' && (
                  <button
                    onClick={() => handleUpdateOrderStatus('out_for_delivery')}
                    className="flex-1 py-3.5 px-4 rounded-xl bg-citrus-600 hover:bg-citrus-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md"
                  >
                    <Bike className="w-4 h-4" />
                    Start Trip: Out for Delivery (On the Way)
                  </button>
                )}

                {/* 4. Out for delivery: Customer OTP verification */}
                {activeOrder.status === 'out_for_delivery' && (
                  <button
                    onClick={() => setShowOtpModal(true)}
                    className="flex-1 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Verify Customer OTP & Complete Handover
                  </button>
                )}
              </div>

              {/* Live Location Telemetry Panel */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Radio className={`w-4 h-4 ${realGpsActive ? 'text-emerald-600 animate-pulse' : broadcastingGps ? 'text-citrus-600 animate-pulse' : 'text-stone-400'}`} />
                    <div>
                      <span className="text-xs font-bold text-charcoal-900 block">Courier Location Telemetry Stream:</span>
                      <span className="text-[11px] text-stone-500">
                        {realGpsActive
                          ? 'Streaming live device GPS coordinates to customer map'
                          : broadcastingGps
                          ? 'Testing simulation active (interpolated evaluation route)'
                          : 'Location streaming offline. Connect device GPS or test mode simulator.'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Real Browser/Device Geolocation */}
                    <button
                      type="button"
                      onClick={handleToggleRealGps}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                        realGpsActive
                          ? 'bg-emerald-600 text-white shadow-emerald-200'
                          : 'bg-stone-200 hover:bg-stone-300 text-charcoal-900'
                      }`}
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      {realGpsActive ? 'Stop Real Device GPS' : 'Share Device GPS'}
                    </button>

                    {/* Development Testing Simulator */}
                    <button
                      type="button"
                      onClick={toggleGpsBroadcast}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                        broadcastingGps
                          ? 'bg-citrus-600 text-white animate-pulse'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200'
                      }`}
                      title="Testing Simulator (Dev Mode Only)"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-citrus-500" />
                      {broadcastingGps ? 'Stop Route Sim' : 'Dev Sim Route'}
                    </button>
                  </div>
                </div>

                {gpsError && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{gpsError}</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 text-stone-500 space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="font-serif text-xl font-bold text-charcoal-900">
              No Active Delivery
            </h3>
            <p className="text-xs max-w-sm mx-auto">
              Stay Online and nearby partner assignments will appear here automatically when kitchen orders are confirmed.
            </p>
          </div>
        )}
      </div>

      {/* OTP Verification Modal */}
      {showOtpModal && activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h3 className="font-serif text-xl font-bold text-charcoal-900">
              Customer Handover Verification
            </h3>

            <p className="text-xs text-stone-500">
              Ask the customer for their 4-digit Delivery OTP displayed on their live tracking screen.
            </p>

            <div className="py-2">
              <input
                type="text"
                maxLength="4"
                placeholder="4-digit OTP"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                className="w-36 text-center text-2xl font-mono font-bold tracking-widest px-3 py-2 rounded-xl bg-stone-50 border border-stone-300 focus:outline-none focus:border-citrus-500"
              />
            </div>

            {otpError && (
              <p className="text-xs text-red-600 font-semibold">{otpError}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowOtpModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyOtpAndDeliver}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm"
              >
                Verify & Handover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Operational Feedback Modal */}
      {showFeedbackModal && lastCompletedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col">
            <div className="bg-aubergine-900 text-ivory-50 p-5 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-sm">Trip Operational Report (Optional)</h3>
                <p className="text-[11px] text-stone-300">Order #{lastCompletedOrder.orderNumber} • {lastCompletedOrder.restaurantName}</p>
              </div>
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-stone-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {feedbackSuccess ? (
                <div className="py-6 text-center space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-charcoal-900">Report Logged Successfully!</h4>
                  <p className="text-stone-500 text-[11px]">Thank you for helping optimize kitchen dispatch logistics.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitPartnerFeedback} className="space-y-4">
                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Kitchen Handover Delay (Minutes)</label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={pickupDelayMins}
                      onChange={(e) => setPickupDelayMins(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono font-bold text-charcoal-900 focus:outline-none focus:border-citrus-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Packaging Condition</label>
                    <select
                      value={packagingCondition}
                      onChange={(e) => setPackagingCondition(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-charcoal-900 focus:outline-none focus:border-citrus-500"
                    >
                      <option value="excellent">Excellent — Thermal Sealed & Spill-proof</option>
                      <option value="acceptable">Acceptable — Standard Packaging</option>
                      <option value="leaking_or_damaged">Damaged or Leaking</option>
                      <option value="not_ready">Not Packed When Ready Marked</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Operational Issue Type</label>
                    <select
                      value={issueType}
                      onChange={(e) => setIssueType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-charcoal-900 focus:outline-none focus:border-citrus-500"
                    >
                      <option value="none">None — Smooth Delivery</option>
                      <option value="kitchen_delay">Kitchen Preparation Delay</option>
                      <option value="packaging_defect">Packaging Defect / Spillage</option>
                      <option value="customer_unreachable">Customer Difficult to Reach</option>
                      <option value="address_difficulty">Complex / Inaccurate Address</option>
                      <option value="other">Other Operational Concern</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">Internal Courier Notes (Optional)</label>
                    <textarea
                      rows="2"
                      value={feedbackNotes}
                      onChange={(e) => setFeedbackNotes(e.target.value)}
                      placeholder="e.g. Guard gated entry took 5 mins; kitchen was very prompt."
                      className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-charcoal-900 focus:outline-none focus:border-citrus-500"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowFeedbackModal(false)}
                      className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-charcoal-900 font-bold transition-all"
                    >
                      Skip
                    </button>
                    <button
                      type="submit"
                      disabled={submittingFeedback}
                      className="px-5 py-2 rounded-xl bg-citrus-600 hover:bg-citrus-500 text-white font-bold transition-all"
                    >
                      {submittingFeedback ? 'Logging...' : 'Submit Report'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
