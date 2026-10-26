import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { connectSocket } from '../services/socket';
import { playKitchenChime } from '../utils/audio';
import {
  Utensils,
  Power,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  PackageCheck,
  ShoppingBag,
  Bell,
  RefreshCw,
  AlertCircle,
  Bike
} from 'lucide-react';

export default function RestaurantDashboardPage() {
  const { token, user } = useSelector((state) => state.auth);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialRestId = queryParams.get('restaurantId') || '';

  const [dashboardData, setDashboardData] = useState(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(initialRestId);
  const [menuItems, setMenuItems] = useState([]);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'menu' | 'service-area'
  const [loading, setLoading] = useState(true);
  const [prepTimeInput, setPrepTimeInput] = useState(25);
  const [acceptingOrderId, setAcceptingOrderId] = useState(null);
  const [assigningPartnerId, setAssigningPartnerId] = useState(null);

  // Delivery Zone Configuration State
  const [radiusInput, setRadiusInput] = useState('12');
  const [pincodesInput, setPincodesInput] = useState('');
  const [savingServiceArea, setSavingServiceArea] = useState(false);
  const [serviceAreaMsg, setServiceAreaMsg] = useState('');

  useEffect(() => {
    fetchDashboard(selectedRestaurantId, true);
  }, [selectedRestaurantId]);

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);
    if (socket) {
      if (dashboardData?.restaurant?._id) {
        socket.emit('join:restaurant', { restaurantId: dashboardData.restaurant._id });
      }

      socket.on('order:new', (data) => {
        console.log('[Socket] New incoming order:', data);
        playKitchenChime();

        if (data?.order) {
          // Optimistically update active orders without full page flash
          setDashboardData(prev => {
            if (!prev) return prev;
            const currentRestId = prev.restaurant?._id?.toString();
            const orderRestId = (data.order.restaurantId?._id || data.order.restaurantId)?.toString();

            // Only append if belongs to current kitchen view
            if (currentRestId && orderRestId && currentRestId !== orderRestId) {
              return prev;
            }

            const exists = (prev.activeOrders || []).some(o => o._id === data.order._id);
            if (exists) return prev;

            const updatedActive = [data.order, ...(prev.activeOrders || [])];
            return {
              ...prev,
              activeOrders: updatedActive,
              stats: {
                ...(prev.stats || {}),
                activeOrdersCount: updatedActive.length,
                todayOrdersCount: ((prev.stats?.todayOrdersCount || 0) + 1)
              }
            };
          });
        }

        // Silent background refetch
        fetchDashboard(selectedRestaurantId, false);
      });

      socket.on('order:status_updated', (data) => {
        if (data?.order) {
          setDashboardData(prev => {
            if (!prev) return prev;
            const updatedActive = (prev.activeOrders || []).map(o => 
              o._id === data.order._id ? { ...o, ...data.order } : o
            );
            return {
              ...prev,
              activeOrders: updatedActive
            };
          });
        }
        fetchDashboard(selectedRestaurantId, false);
      });
    }

    return () => {
      if (socket) {
        socket.off('order:new');
        socket.off('order:status_updated');
      }
    };
  }, [token, dashboardData?.restaurant?._id, selectedRestaurantId]);

  const fetchDashboard = async (restaurantId = selectedRestaurantId, showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await api.get('/restaurants/my/dashboard', {
        params: restaurantId ? { restaurantId } : {}
      });

      if (res.data.success) {
        setDashboardData(res.data);
        if (res.data.restaurant) {
          if (!selectedRestaurantId) {
            setSelectedRestaurantId(res.data.restaurant._id);
          }
          setRadiusInput(res.data.restaurant.deliveryRadiusKm?.toString() || '12');
          setPincodesInput((res.data.restaurant.serviceablePincodes || []).join(', '));
        }

        // Also fetch menu items for management
        if (res.data.restaurant?._id) {
          const menuRes = await api.get(`/restaurants/${res.data.restaurant._id}`);
          if (menuRes.data.success) {
            setMenuItems(menuRes.data.menuItems || []);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load restaurant dashboard:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleRetryAssignPartner = async (orderId) => {
    try {
      setAssigningPartnerId(orderId);
      const res = await api.post(`/orders/${orderId}/assign-partner`);
      if (res.data.success && res.data.partnerAssigned) {
        alert(`Partner assigned: ${res.data.partner?.name || 'Courier'}`);
        fetchDashboard(selectedRestaurantId, false);
      } else {
        alert(res.data.message || 'No couriers currently available. System will keep searching.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to dispatch partner search');
    } finally {
      setAssigningPartnerId(null);
    }
  };

  const handleSaveServiceArea = async (e) => {
    e.preventDefault();
    try {
      setSavingServiceArea(true);
      setServiceAreaMsg('');

      const parsedRadius = parseFloat(radiusInput);
      const parsedPincodes = pincodesInput
        .split(',')
        .map(p => p.trim())
        .filter(p => /^[1-9][0-9]{5}$/.test(p));

      const res = await api.patch('/restaurants/my/service-area', {
        deliveryRadiusKm: parsedRadius,
        serviceablePincodes: parsedPincodes
      });

      if (res.data.success) {
        setServiceAreaMsg('Delivery coverage updated successfully!');
        setDashboardData({
          ...dashboardData,
          restaurant: {
            ...dashboardData.restaurant,
            deliveryRadiusKm: res.data.deliveryRadiusKm,
            serviceablePincodes: res.data.serviceablePincodes
          }
        });
      }
    } catch (err) {
      setServiceAreaMsg(err.response?.data?.message || 'Failed to update service area.');
    } finally {
      setSavingServiceArea(false);
    }
  };

  const handleToggleOpen = async () => {
    try {
      const res = await api.patch('/restaurants/my/toggle-status', {
        restaurantId: dashboardData?.restaurant?._id
      });
      if (res.data.success) {
        setDashboardData({
          ...dashboardData,
          restaurant: { ...dashboardData.restaurant, isOpen: res.data.isOpen }
        });
      }
    } catch (err) {
      console.error('Failed to toggle open state:', err);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus, prepTime) => {
    try {
      await api.patch(`/orders/${orderId}/status`, {
        status: newStatus,
        prepTimeMins: prepTime || undefined
      });
      setAcceptingOrderId(null);
      fetchDashboard(selectedRestaurantId, false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update order status');
    }
  };

  const handleToggleMenuAvailability = async (itemId) => {
    try {
      const res = await api.patch(`/menu/${itemId}/availability`);
      if (res.data.success) {
        setMenuItems(menuItems.map(item => item._id === itemId ? { ...item, isAvailable: res.data.isAvailable } : item));
      }
    } catch (err) {
      alert('Failed to update item availability');
    }
  };

  if (loading && !dashboardData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-6 animate-pulse">
        <div className="h-44 bg-stone-200 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => <div key={n} className="h-28 bg-stone-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const { restaurant, stats, activeOrders } = dashboardData || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Pending Application Review Banner */}
      {restaurant?.status === 'pending' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl flex items-center gap-3 text-xs text-amber-800 shadow-2xs">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <div>
            <p className="font-bold">Restaurant Application Under Administrative Review</p>
            <p className="text-[11px] text-amber-700">
              Your kitchen profile has been submitted and is currently awaiting approval by the CRAVE curation team. Once approved, your kitchen will go live on the diner discovery network.
            </p>
          </div>
        </div>
      )}
      
      {/* Restaurant Header & Kitchen Status Toggle */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold text-citrus-600 uppercase tracking-widest block">
            Kitchen Partner Console
          </span>
          <h1 className="font-serif text-3xl font-bold text-charcoal-900 mt-1">
            {restaurant?.name}
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            {restaurant?.address?.addressLine}, {restaurant?.address?.city}
          </p>

          {/* Multi-Restaurant Switcher if owner manages multiple kitchens */}
          {dashboardData?.ownedRestaurants?.length > 1 && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[11px] font-bold text-citrus-600 uppercase tracking-wider">Switch Kitchen:</span>
              <select
                value={selectedRestaurantId}
                onChange={(e) => setSelectedRestaurantId(e.target.value)}
                className="px-3 py-1 bg-ivory-100 border border-ivory-300 rounded-xl text-xs font-bold text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-citrus-500"
              >
                {dashboardData.ownedRestaurants.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Kitchen Status Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => playKitchenChime()}
            className="px-3 py-2.5 rounded-2xl bg-ivory-100 hover:bg-ivory-200 text-charcoal-900 border border-ivory-300 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Demonstrate Kitchen Bell"
          >
            <Bell className="w-3.5 h-3.5 text-citrus-600 animate-bounce" />
            <span className="hidden sm:inline">Test Kitchen Chime</span>
          </button>

          <button
            onClick={fetchDashboard}
            className="p-3 rounded-2xl bg-ivory-100 hover:bg-ivory-200 text-charcoal-900 border border-ivory-300 transition-colors"
            title="Refresh Orders"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleToggleOpen}
            className={`px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm ${
              restaurant?.isOpen
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
          >
            <Power className="w-4 h-4" />
            {restaurant?.isOpen ? 'Kitchen Open (Accepting)' : 'Kitchen Closed'}
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-stone-400 uppercase block">Active Kitchen Orders</span>
          <p className="font-serif text-3xl font-bold text-citrus-600 mt-1">{stats?.activeOrdersCount || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-stone-400 uppercase block">Today's Orders</span>
          <p className="font-serif text-3xl font-bold text-charcoal-900 mt-1">{stats?.todayOrdersCount || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-stone-400 uppercase block">Delivered Today</span>
          <p className="font-serif text-3xl font-bold text-emerald-600 mt-1">{stats?.todayDeliveredCount || 0}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-stone-400 uppercase block">Today's Gross Revenue</span>
          <p className="font-serif text-3xl font-bold text-charcoal-900 mt-1">₹{stats?.todayRevenue || 0}</p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex border-b border-stone-200 gap-6">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'orders'
              ? 'border-citrus-600 text-citrus-600'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          Live Orders Queue ({activeOrders?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'menu'
              ? 'border-citrus-600 text-citrus-600'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          Menu Stock Management ({menuItems.length})
        </button>
        <button
          onClick={() => setActiveTab('service-area')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'service-area'
              ? 'border-citrus-600 text-citrus-600'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          Delivery Zone & PIN Codes
        </button>
      </div>

      {/* TAB 1: Live Orders Queue */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {(!activeOrders || activeOrders.length === 0) ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 text-stone-500 space-y-2">
              <PackageCheck className="w-12 h-12 text-stone-300 mx-auto" />
              <h3 className="font-serif text-xl font-bold text-charcoal-900">No Active Kitchen Orders</h3>
              <p className="text-xs">Incoming orders from customers will chime here automatically.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeOrders.map((ord) => (
                <div
                  key={ord._id}
                  className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-charcoal-900">
                        #{ord.orderNumber}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        ord.status === 'placed'
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : ord.status === 'accepted'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-citrus-100 text-citrus-800'
                      }`}>
                        {ord.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-xs text-stone-600 space-y-1.5 border-t border-stone-100 pt-2">
                      <p className="font-semibold text-charcoal-900">Customer: {ord.customerId?.name || 'Customer'}</p>
                      
                      {ord.partnerId ? (
                        <p className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                          <Bike className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Courier: {ord.partnerId.name} ({ord.partnerId.phone || 'Assigned'})</span>
                        </p>
                      ) : ord.status !== 'placed' && ord.status !== 'cancelled' && ord.status !== 'rejected' ? (
                        <div className="flex items-center justify-between text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200 text-[11px]">
                          <span>Courier: Finding available partner...</span>
                          <button
                            onClick={() => handleRetryAssignPartner(ord._id)}
                            disabled={assigningPartnerId === ord._id}
                            className="font-bold underline text-citrus-700 hover:text-citrus-900 ml-2"
                          >
                            {assigningPartnerId === ord._id ? 'Dispatching...' : 'Retry Dispatch'}
                          </button>
                        </div>
                      ) : null}

                      <p className="text-stone-400 text-[11px]">{new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>

                    {/* Items List */}
                    <div className="bg-stone-50 p-3 rounded-2xl space-y-1.5 text-xs text-stone-700">
                      {ord.items?.map((it, idx) => (
                        <div key={idx} className="flex justify-between font-medium">
                          <span>{it.quantity}x {it.name}</span>
                          <span className="font-bold">₹{it.itemTotal}</span>
                        </div>
                      ))}
                      <div className="border-t border-stone-200 pt-1.5 flex justify-between font-bold text-charcoal-900">
                        <span>Total Food Value</span>
                        <span>₹{ord.amountBreakup?.itemSubtotal}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Stage Progression Buttons */}
                  <div className="pt-2 border-t border-stone-100 space-y-2">
                    {ord.status === 'placed' && (
                      <div className="space-y-2">
                        {acceptingOrderId === ord._id ? (
                          <div className="p-3 bg-ivory-100 rounded-2xl border border-ivory-300 space-y-2">
                            <label className="text-[11px] font-bold text-stone-600 block">
                              Preparation Time (Minutes):
                            </label>
                            <input
                              type="number"
                              min="10"
                              max="60"
                              value={prepTimeInput}
                              onChange={(e) => setPrepTimeInput(Number(e.target.value))}
                              className="w-full px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-bold"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateOrderStatus(ord._id, 'accepted', prepTimeInput)}
                                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                              >
                                Confirm Accept
                              </button>
                              <button
                                onClick={() => setAcceptingOrderId(null)}
                                className="px-3 py-1.5 bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setAcceptingOrderId(ord._id)}
                              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Accept Order
                            </button>
                            <button
                              onClick={() => handleUpdateOrderStatus(ord._id, 'rejected')}
                              className="px-3 py-2.5 rounded-xl bg-stone-100 hover:bg-red-50 hover:text-red-600 text-stone-600 font-bold text-xs"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {ord.status === 'accepted' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(ord._id, 'preparing')}
                        className="w-full py-2.5 rounded-xl bg-citrus-600 hover:bg-citrus-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs"
                      >
                        <Clock className="w-3.5 h-3.5" /> Start Preparing Meal
                      </button>
                    )}

                    {ord.status === 'preparing' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(ord._id, 'ready_for_pickup')}
                        className="w-full py-2.5 rounded-xl bg-aubergine-800 hover:bg-aubergine-900 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs"
                      >
                        <PackageCheck className="w-3.5 h-3.5" /> Mark Ready for Pickup
                      </button>
                    )}

                    {ord.status === 'ready_for_pickup' && (
                      <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800 text-xs font-semibold text-center border border-amber-200">
                        Packed & awaiting courier pickup
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Menu Stock Management */}
      {activeTab === 'menu' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
          <h2 className="font-serif text-lg font-bold text-charcoal-900 border-b border-stone-100 pb-3">
            Item Availability Controls
          </h2>

          <div className="divide-y divide-stone-100">
            {menuItems.map((item) => (
              <div key={item._id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-charcoal-900">{item.name}</h4>
                    <p className="text-[11px] text-stone-500">{item.category} • ₹{item.price}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleMenuAvailability(item._id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    item.isAvailable
                      ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      : 'bg-red-100 text-red-800 hover:bg-red-200'
                  }`}
                >
                  {item.isAvailable ? 'In Stock (Available)' : 'Sold Out'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Delivery Service Area & PIN Codes */}
      {activeTab === 'service-area' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-6">
          <div className="border-b border-stone-100 pb-3">
            <h2 className="font-serif text-lg font-bold text-charcoal-900">
              Delivery Coverage & Service Area Configuration
            </h2>
            <p className="text-xs text-stone-500">
              Manage your kitchen's delivery radius and explicitly serviceable postal PIN codes.
            </p>
          </div>

          {serviceAreaMsg && (
            <div className={`p-3 rounded-2xl text-xs font-medium ${
              serviceAreaMsg.includes('success')
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {serviceAreaMsg}
            </div>
          )}

          <form onSubmit={handleSaveServiceArea} className="space-y-5 max-w-xl">
            <div>
              <label className="text-xs font-bold text-charcoal-900 block mb-1">
                Maximum Delivery Radius (km)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                step="0.5"
                value={radiusInput}
                onChange={(e) => setRadiusInput(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs font-bold focus:outline-none focus:border-citrus-500"
              />
              <span className="text-[11px] text-stone-400 block mt-1">
                Orders outside this distance from your kitchen location will be rejected.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-charcoal-900 block mb-1">
                Serviceable 6-Digit PIN Codes (Comma-separated)
              </label>
              <textarea
                rows="3"
                value={pincodesInput}
                onChange={(e) => setPincodesInput(e.target.value)}
                placeholder="110001, 110002, 110003, 110011"
                className="w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs font-mono focus:outline-none focus:border-citrus-500"
              />
              <span className="text-[11px] text-stone-400 block mt-1">
                Leave empty to allow all addresses within the delivery radius, or list specific PIN codes to enforce postal boundary limits.
              </span>
            </div>

            <button
              type="submit"
              disabled={savingServiceArea}
              className="px-6 py-3 rounded-2xl bg-citrus-600 hover:bg-citrus-500 disabled:bg-stone-300 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs"
            >
              {savingServiceArea ? 'Saving Changes...' : 'Save Delivery Service Area'}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
