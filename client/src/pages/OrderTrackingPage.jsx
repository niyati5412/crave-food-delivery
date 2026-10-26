import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { connectSocket, getSocket } from '../services/socket';
import LiveTrackingMap from '../components/LiveTrackingMap';
import LiveOrderChat from '../components/LiveOrderChat';
import InvoiceModal from '../components/InvoiceModal';
import OrderFeedbackModal from '../components/OrderFeedbackModal';
import { playSuccessChime, playMessagePop } from '../utils/audio';
import {
  Clock,
  MapPin,
  Bike,
  CheckCircle2,
  Phone,
  ShieldCheck,
  Play,
  RotateCcw,
  Sparkles,
  AlertCircle,
  FileText,
  Star
} from 'lucide-react';

export default function OrderTrackingPage() {
  const { id } = useParams();
  const { token, user } = useSelector((state) => state.auth);

  const [trackingData, setTrackingData] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveCourierCoords, setLiveCourierCoords] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const simulationTimerRef = useRef(null);

  const currentOrderId = id || trackingData?.order?._id;

  useEffect(() => {
    fetchTrackingData(id);
  }, [id]);

  useEffect(() => {
    if (!token || !currentOrderId) return;

    const socket = connectSocket(token);

    if (socket) {
      // Join authorized order room
      socket.emit('join:order', { orderId: currentOrderId });

      // Listen for order status updates
      socket.on('order:status_updated', (data) => {
        console.log('[Socket] Order status updated:', data?.status);
        playSuccessChime();
        if (data?.order) {
          setTrackingData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              order: {
                ...prev.order,
                ...data.order,
                status: data.order.status || data.status
              }
            };
          });
          if (data.status === 'delivered' || data.order?.status === 'delivered') {
            stopGpsSimulation();
          }
        }
        fetchTrackingData(currentOrderId);
      });

      // Listen for partner live GPS movement
      socket.on('partner:location_updated', (data) => {
        if (data?.coordinates && Array.isArray(data.coordinates)) {
          setLiveCourierCoords(data.coordinates);
        }
      });
    }

    return () => {
      if (socket && currentOrderId) {
        socket.emit('leave:order', { orderId: currentOrderId });
        socket.off('order:status_updated');
        socket.off('partner:location_updated');
      }
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
      }
    };
  }, [token, currentOrderId]);

  const fetchTrackingData = async (specifiedId = null) => {
    try {
      setLoading(true);
      let targetId = specifiedId || id;

      // Fetch customer orders list to support auto-selection and switching
      const ordersRes = await api.get('/orders');
      if (ordersRes.data?.success && Array.isArray(ordersRes.data.data)) {
        setCustomerOrders(ordersRes.data.data);

        if (!targetId || targetId === 'undefined') {
          const activeStatuses = ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'out_for_delivery'];
          const activeOrder = ordersRes.data.data.find(o => activeStatuses.includes(o.status?.toLowerCase()));
          targetId = activeOrder ? activeOrder._id : ordersRes.data.data[0]?._id;
        }
      }

      if (!targetId) {
        setLoading(false);
        return;
      }

      // Try /orders/:id/tracking first, then fallback to /tracking/:id
      let res;
      try {
        res = await api.get(`/orders/${targetId}/tracking`);
      } catch (e1) {
        res = await api.get(`/tracking/${targetId}`);
      }

      if (res?.data?.success) {
        setTrackingData(res.data);
        if (res.data.partner?.liveLocation?.coordinates) {
          setLiveCourierCoords(res.data.partner.liveLocation.coordinates);
        } else if (res.data.restaurant?.location?.coordinates) {
          setLiveCourierCoords(res.data.restaurant.location.coordinates);
        }
      }
    } catch (err) {
      console.error('Failed to load tracking data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Courier GPS Movement Simulator for Demonstration / Evaluation Viva
  const startGpsSimulation = () => {
    if (!trackingData || isSimulating) return;

    setIsSimulating(true);

    const start = liveCourierCoords || trackingData.restaurant.location.coordinates;
    const dest = trackingData.deliveryAddress.location.coordinates;

    let currentLng = start[0];
    let currentLat = start[1];
    const steps = 15;
    const dLng = (dest[0] - start[0]) / steps;
    const dLat = (dest[1] - start[1]) / steps;
    let stepCount = 0;

    const socket = getSocket();

    simulationTimerRef.current = setInterval(async () => {
      stepCount++;
      currentLng += dLng;
      currentLat += dLat;

      const newCoords = [
        Math.round(currentLng * 10000) / 10000,
        Math.round(currentLat * 10000) / 10000
      ];

      setLiveCourierCoords(newCoords);

      if (socket) {
        socket.emit('partner:location_tick', {
          orderId: trackingData.order._id,
          coordinates: newCoords,
          heading: 65,
          speed: 28,
          isSimulation: true
        });
      }

      if (stepCount >= steps) {
        clearInterval(simulationTimerRef.current);
        setIsSimulating(false);
      }
    }, 2500);
  };

  const stopGpsSimulation = () => {
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
      setIsSimulating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-6 animate-pulse">
        <div className="h-96 bg-stone-200 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-stone-200 rounded-3xl" />
          <div className="h-64 bg-stone-200 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!trackingData) {
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-ivory-200 text-stone-500 flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="font-serif text-2xl font-bold text-charcoal-900">
            No Active Orders to Track
          </h2>
          <p className="text-xs text-stone-500">
            You don't have an in-flight delivery right now. Place a new order or inspect your completed orders below.
          </p>
        </div>

        {customerOrders.length > 0 && (
          <div className="pt-2 pb-4 space-y-2 text-left">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-widest block text-center">
              Your Recent Orders
            </span>
            <div className="space-y-2">
              {customerOrders.slice(0, 3).map((co) => (
                <Link
                  key={co._id}
                  to={`/tracking/${co._id}`}
                  className="p-3 bg-white hover:bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between text-xs transition-colors shadow-2xs"
                >
                  <div>
                    <span className="font-mono font-bold text-charcoal-900 block">#{co.orderNumber}</span>
                    <span className="text-[11px] text-stone-500">{co.restaurantId?.name || 'Restaurant'}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-stone-100 text-stone-700">
                    {co.status.replace('_', ' ')}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <Link
            to="/restaurants"
            className="inline-block px-5 py-2.5 rounded-full bg-citrus-600 hover:bg-citrus-500 text-white font-bold text-xs shadow-sm transition-all"
          >
            Explore Restaurants
          </Link>
          <Link
            to="/orders"
            className="inline-block px-5 py-2.5 rounded-full bg-stone-200 hover:bg-stone-300 text-charcoal-900 font-bold text-xs transition-all"
          >
            Order History
          </Link>
        </div>
      </div>
    );
  }

  const { order, restaurant, deliveryAddress, partner, etaMinutes } = trackingData;

  const statusDisplayNames = {
    placed: 'Order Placed',
    accepted: 'Kitchen Accepted',
    preparing: 'Handcrafting Meal',
    ready_for_pickup: 'Thermal Packed & Ready',
    picked_up: 'Picked Up by Courier',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
  };

  const stages = [
    { key: 'placed', label: 'Placed' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'preparing', label: 'Preparing' },
    { key: 'picked_up', label: 'Picked Up' },
    { key: 'out_for_delivery', label: 'On The Way' },
    { key: 'delivered', label: 'Delivered' }
  ];

  const currentStageIndex = stages.findIndex(s => s.key === order.status);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">

      {/* Multiple Orders Switcher Bar (compact) */}
      {customerOrders.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider whitespace-nowrap">Active Trips:</span>
          {customerOrders.map(co => {
            const isActive = ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'out_for_delivery'].includes(co.status?.toLowerCase());
            const isSelected = co._id === order._id;
            return (
              <Link
                key={co._id}
                to={`/tracking/${co._id}`}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-charcoal-900 text-white shadow-xs'
                    : isActive
                    ? 'bg-citrus-100 text-citrus-800 hover:bg-citrus-200 border border-citrus-200'
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                <span>#{co.orderNumber}</span>
                <span className="text-[10px] opacity-75 capitalize">({co.status.replace('_', ' ')})</span>
              </Link>
            );
          })}
        </div>
      )}
      
      {/* Top Essential Header & Live Telemetry Summary */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-citrus-600 uppercase tracking-widest">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live In-Flight Telemetry
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal-900 mt-0.5">
            Order #{order.orderNumber}
          </h1>
          <p className="text-xs text-stone-500">
            From <strong className="text-charcoal-900">{restaurant.name}</strong> • Placed {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* ETA, OTP & Invoice Button Box */}
        <div className="flex items-center flex-wrap gap-2.5">
          {order.status === 'delivered' ? (
            <div className="px-3.5 py-1.5 rounded-2xl bg-emerald-100 border border-emerald-300 text-center shadow-2xs">
              <span className="text-[9px] font-bold uppercase text-emerald-700 block">Status</span>
              <span className="text-sm font-bold text-emerald-800 font-serif">Delivered</span>
            </div>
          ) : (
            <div className="px-3.5 py-1.5 rounded-2xl bg-ivory-100 border border-ivory-300 text-center shadow-2xs">
              <span className="text-[9px] font-bold uppercase text-stone-500 block">Est. Arrival</span>
              <span className="text-sm font-bold text-citrus-600 font-serif">~{etaMinutes} mins</span>
            </div>
          )}

          <div className="px-3.5 py-1.5 rounded-2xl bg-aubergine-900 text-white text-center shadow-2xs">
            <span className="text-[9px] font-bold uppercase text-citrus-300 block">
              {order.status === 'delivered' ? 'Verified OTP' : 'Delivery OTP'}
            </span>
            <span className="text-sm font-bold tracking-widest font-mono">{order.deliveryOtp}</span>
          </div>

          <button
            onClick={() => setInvoiceModalOpen(true)}
            className="px-3 py-2 rounded-2xl bg-stone-100 hover:bg-stone-200 text-charcoal-900 text-xs font-bold transition-colors flex items-center gap-1.5"
            title="Download Tax Invoice"
          >
            <FileText className="w-3.5 h-3.5 text-citrus-600" />
            <span className="hidden sm:inline">Invoice</span>
          </button>

          {order.status === 'delivered' && (
            <button
              onClick={() => setFeedbackModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-citrus-600 hover:bg-citrus-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm hover:shadow-md animate-pulse"
              title="Rate Culinary and Courier Experience"
            >
              <Star className="w-3.5 h-3.5 fill-white" />
              <span>Review & Rate</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Interactive Map + Status Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Primary Section: Interactive Map Near Top */}
        <div className="lg:col-span-8 space-y-4">
          {order.status === 'delivered' && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-serif text-sm font-bold text-charcoal-900">
                    Handover Complete & Verified!
                  </h3>
                  <p className="text-xs text-stone-600">
                    How was the meal from {restaurant.name} and delivery by {partner?.name || 'your courier'}?
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFeedbackModalOpen(true)}
                className="px-4 py-2 rounded-full bg-citrus-600 hover:bg-citrus-500 text-white text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap shadow-xs"
              >
                Rate Order ★
              </button>
            </div>
          )}

          <LiveTrackingMap
            restaurantLocation={restaurant.location.coordinates}
            deliveryLocation={deliveryAddress.location.coordinates}
            courierLocation={liveCourierCoords}
            restaurantName={restaurant.name}
            customerAddress={deliveryAddress.addressLine}
          />

          {/* Optional Development Testing Simulator */}
          {order.status !== 'delivered' && (
            <div className="bg-ivory-100 p-4 rounded-3xl border border-ivory-300 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-citrus-600" />
                <div>
                  <span className="text-xs font-bold text-charcoal-900 block">Development Testing Mode:</span>
                  <span className="text-[11px] text-stone-500">
                    {partner ? 'Simulate route telemetry for evaluation when physical courier movement is unavailable' : 'Courier dispatch in progress — Live map will track courier location upon assignment'}
                  </span>
                </div>
              </div>

              {partner && (
                <div className="flex items-center gap-2">
                  {!isSimulating ? (
                    <button
                      onClick={startGpsSimulation}
                      className="px-4 py-2 rounded-full bg-stone-200 hover:bg-stone-300 text-charcoal-900 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-current text-citrus-600" />
                      Dev Route Sim
                    </button>
                  ) : (
                    <button
                      onClick={stopGpsSimulation}
                      className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm animate-pulse"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Stop Simulator
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Live In-App Telemetry Chat with Delivery Courier */}
          <LiveOrderChat
            orderId={order._id}
            partnerName={partner?.name || 'Courier Partner'}
          />
        </div>

        {/* Right Column: Status Stepper & Partner Card */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Current Status Headline Card */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full bg-citrus-100 text-citrus-800 text-[11px] font-bold uppercase tracking-wider">
                {statusDisplayNames[order.status] || order.status}
              </span>
              <span className="text-[11px] text-stone-400">
                {order.items.length} items
              </span>
            </div>

            {/* Stepper */}
            <div className="space-y-4 pt-2">
              {stages.map((stage, idx) => {
                const isDelivered = order.status === 'delivered';
                const isPassed = isDelivered || currentStageIndex >= idx;
                const isCurrent = !isDelivered && currentStageIndex === idx;

                return (
                  <div key={idx} className="flex items-start gap-3 relative">
                    {idx < stages.length - 1 && (
                      <div
                        className={`absolute left-3.5 top-7 bottom-0 w-0.5 -mb-2 ${
                          isDelivered || currentStageIndex > idx ? 'bg-emerald-500' : 'bg-stone-200'
                        }`}
                      />
                    )}

                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-xs font-bold transition-colors ${
                        isCurrent
                          ? 'bg-citrus-600 text-white ring-4 ring-citrus-100'
                          : isPassed
                          ? 'bg-emerald-500 text-white'
                          : 'bg-stone-200 text-stone-500'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>

                    <div className="pt-0.5">
                      <p className={`text-xs font-bold ${isPassed ? 'text-charcoal-900' : 'text-stone-400'}`}>
                        {stage.label}
                      </p>
                      {isCurrent && (
                        <p className="text-[11px] text-citrus-600 font-semibold animate-pulse">
                          In Progress...
                        </p>
                      )}
                      {stage.key === 'delivered' && isDelivered && (
                        <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline flex-shrink-0" />
                          <span>
                            {order.deliveredAt
                              ? `Delivered at ${new Date(order.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                              : 'Order Completed'}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delivery Partner Card */}
          {partner ? (
            <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">
                Assigned Fleet Partner
              </span>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-ivory-200 text-citrus-600 flex items-center justify-center shadow-inner">
                  <Bike className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-charcoal-900">{partner.name}</h4>
                  <p className="text-[11px] text-stone-500">
                    {partner.vehicle?.vehicleType} • {partner.vehicle?.vehicleNumber}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-500">Direct Contact:</span>
                <a
                  href={`tel:${partner.phone}`}
                  className="px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-charcoal-900 font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-citrus-600" />
                  {partner.phone}
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-ivory-100 rounded-3xl p-6 border border-ivory-300 text-center space-y-2">
              <Bike className="w-8 h-8 text-stone-400 mx-auto" />
              <h4 className="text-xs font-bold text-charcoal-900">
                Finding Nearest Delivery Partner...
              </h4>
              <p className="text-[11px] text-stone-500">
                Geospatial match will auto-assign once kitchen accepts order.
              </p>
            </div>
          )}

          {/* Destination Address Card */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-2">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">
              Deliver To
            </span>
            <p className="text-xs font-bold text-charcoal-900">{deliveryAddress.addressLine}</p>
            <p className="text-[11px] text-stone-500">{deliveryAddress.city} • {deliveryAddress.pincode}</p>
            <p className="text-[11px] text-stone-500">Contact: {deliveryAddress.contactPhone}</p>
          </div>

        </div>

      </div>

      {/* Tax Invoice Modal */}
      <InvoiceModal
        order={order}
        restaurant={restaurant}
        deliveryAddress={deliveryAddress}
        isOpen={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
      />

      {/* Culinary & Courier Feedback Modal */}
      <OrderFeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        orderId={order._id}
        restaurantName={restaurant.name}
        partnerName={partner?.name}
      />

    </div>
  );
}
