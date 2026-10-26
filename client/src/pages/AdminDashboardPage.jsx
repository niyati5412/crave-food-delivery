import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { connectSocket } from '../services/socket';
import {
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Users,
  Utensils,
  Bike,
  Package,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Sliders,
  Edit3,
  CheckCircle2,
  XCircle,
  X,
  MapPin,
  Eye,
  Check,
  Info,
  Flame
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { token } = useSelector((state) => state.auth);
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState('all'); // 'all' | 'active' | 'delivered' | 'cancelled'
  const [orderSearch, setOrderSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState('all'); // 'all' | 'customer' | 'restaurant' | 'delivery_partner'
  const [userStatusFilter, setUserStatusFilter] = useState('all'); // 'all' | 'active' | 'pending' | 'suspended'
  const [userSearch, setUserSearch] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantFilter, setRestaurantFilter] = useState('all'); // 'all' | 'approved' | 'pending' | 'suspended'
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [settlements, setSettlements] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'restaurants' | 'users' | 'settlements' | 'tickets'
  const [loading, setLoading] = useState(true);
  const [updatingTicketId, setUpdatingTicketId] = useState(null);
  const [adminNoteInput, setAdminNoteInput] = useState({});

  // Coverage Modal State
  const [selectedCoverageModal, setSelectedCoverageModal] = useState(null);
  const [coverageRadiusInput, setCoverageRadiusInput] = useState(12);
  const [coveragePincodesInput, setCoveragePincodesInput] = useState('');
  const [savingCoverage, setSavingCoverage] = useState(false);

  // Menu Modal State
  const [selectedMenuModal, setSelectedMenuModal] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);

  useEffect(() => {
    fetchAdminData(true);
  }, []);

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);
    if (socket) {
      socket.on('order:new', (data) => {
        console.log('[Admin Socket] Live order:new received:', data);
        if (data?.order) {
          setRecentOrders(prev => {
            const exists = prev.some(o => o._id === data.order._id);
            if (exists) return prev;
            return [data.order, ...prev];
          });
          setStats(prev => prev ? ({
            ...prev,
            totalOrders: (prev.totalOrders || 0) + 1,
            activeOrdersCount: (prev.activeOrdersCount || 0) + 1
          }) : prev);
        }
        fetchAdminData(false);
      });

      socket.on('order:status_updated', (data) => {
        console.log('[Admin Socket] Live order:status_updated received:', data);
        if (data?.order) {
          setRecentOrders(prev => prev.map(o => o._id === data.order._id ? { ...o, ...data.order } : o));
        }
        fetchAdminData(false);
      });
    }

    return () => {
      if (socket) {
        socket.off('order:new');
        socket.off('order:status_updated');
      }
    };
  }, [token]);

  const fetchAdminData = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const [statsRes, usersRes, settlementsRes, ticketsRes, restRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/settlements'),
        api.get('/support/admin').catch(() => ({ data: { success: false, tickets: [] } })),
        api.get('/admin/restaurants').catch(() => ({ data: { success: false, restaurants: [] } }))
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
        setRecentOrders(statsRes.data.recentOrders || []);
      }
      if (usersRes.data.success) {
        setUsers(usersRes.data.users || []);
      }
      if (settlementsRes.data.success) {
        setSettlements(settlementsRes.data.settlements || []);
      }
      if (ticketsRes?.data?.success) {
        setTickets(ticketsRes.data.tickets || []);
      }
      if (restRes?.data?.success) {
        setRestaurants(restRes.data.restaurants || []);
      }
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleUpdateRestaurantStatus = async (restaurantId, newStatus, isOpen) => {
    try {
      const payload = {};
      if (newStatus) payload.status = newStatus;
      if (typeof isOpen === 'boolean') payload.isOpen = isOpen;
      const res = await api.patch(`/admin/restaurants/${restaurantId}/status`, payload);
      if (res.data.success) {
        setRestaurants(restaurants.map(r => r._id === restaurantId ? { ...r, ...res.data.restaurant } : r));
        // Refresh users list to reflect owner accountStatus synchronization
        const usersRes = await api.get('/admin/users');
        if (usersRes.data?.success) {
          setUsers(usersRes.data.users || []);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update restaurant status');
    }
  };

  const handleOpenCoverageModal = (restaurant) => {
    setSelectedCoverageModal(restaurant);
    setCoverageRadiusInput(restaurant.deliveryRadiusKm || 12);
    setCoveragePincodesInput((restaurant.serviceablePincodes || []).join(', '));
  };

  const handleSaveCoverage = async () => {
    if (!selectedCoverageModal) return;
    try {
      setSavingCoverage(true);
      const pins = coveragePincodesInput.split(',').map(p => p.trim()).filter(Boolean);
      const res = await api.patch(`/admin/restaurants/${selectedCoverageModal._id}/coverage`, {
        deliveryRadiusKm: Number(coverageRadiusInput),
        serviceablePincodes: pins
      });
      if (res.data.success) {
        setRestaurants(restaurants.map(r => r._id === selectedCoverageModal._id ? { ...r, ...res.data.restaurant } : r));
        setSelectedCoverageModal(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update delivery coverage');
    } finally {
      setSavingCoverage(false);
    }
  };

  const handleOpenMenuModal = async (restaurant) => {
    setSelectedMenuModal(restaurant);
    try {
      setLoadingMenu(true);
      const res = await api.get(`/admin/restaurants/${restaurant._id}/menu`);
      if (res.data.success) {
        setMenuItems(res.data.items || []);
      }
    } catch (err) {
      console.error('Failed to load restaurant menu:', err);
      setMenuItems([]);
    } finally {
      setLoadingMenu(false);
    }
  };

  const handleTogglePartnerApproval = async (userId, newStatus, isVerified) => {
    try {
      const res = await api.patch(`/admin/users/${userId}/partner-approval`, {
        accountStatus: newStatus,
        isVerified
      });
      if (res.data.success) {
        setUsers(users.map(u => u._id === userId ? {
          ...u,
          accountStatus: newStatus,
          partnerDetails: { ...(u.partnerDetails || {}), isVerified }
        } : u));
      }
    } catch (err) {
      alert('Failed to update partner approval status');
    }
  };

  const handleUpdateTicket = async (ticketId, nextStatus) => {
    try {
      setUpdatingTicketId(ticketId);
      const note = adminNoteInput[ticketId] || '';
      const res = await api.patch(`/support/${ticketId}`, {
        status: nextStatus,
        adminNotes: note
      });
      if (res.data.success) {
        setTickets(tickets.map(t => t._id === ticketId ? res.data.ticket : t));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update ticket');
    } finally {
      setUpdatingTicketId(null);
    }
  };

  const handleToggleUserStatus = async (userId, targetStatus) => {
    try {
      const payload = targetStatus ? { accountStatus: targetStatus } : {};
      const res = await api.patch(`/admin/users/${userId}/status`, payload);
      if (res.data.success) {
        setUsers(users.map(u => u._id === userId ? { ...u, accountStatus: res.data.user.accountStatus } : u));
        // Refresh restaurants to reflect owner accountStatus synchronization
        const restRes = await api.get('/admin/restaurants');
        if (restRes.data?.success) {
          setRestaurants(restRes.data.restaurants || []);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user account status');
    }
  };

  if (loading && !stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-6 animate-pulse">
        <div className="h-40 bg-stone-200 rounded-3xl" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => <div key={n} className="h-28 bg-stone-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Admin Header */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-citrus-600 uppercase tracking-widest block">
            Executive Governance
          </span>
          <h1 className="font-serif text-3xl font-bold text-charcoal-900 mt-1">
            Platform Master Console
          </h1>
          <p className="text-xs text-stone-500">
            Real-time multi-tenant health, geospatial auditing, and settlement reconciliation.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="self-start sm:self-auto p-3 rounded-2xl bg-ivory-100 hover:bg-ivory-200 text-charcoal-900 border border-ivory-300 transition-colors"
          title="Refresh Metrics"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-stone-400 uppercase block">Platform GMV</span>
          <p className="font-serif text-3xl font-bold text-charcoal-900 mt-1">₹{stats?.platformGMV || 0}</p>
          <span className="text-[10px] text-emerald-600 font-semibold">Total Gross Marketplace Volume</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-stone-400 uppercase block">Platform Take (15%)</span>
          <p className="font-serif text-3xl font-bold text-citrus-600 mt-1">₹{stats?.platformCommission || 0}</p>
          <span className="text-[10px] text-stone-500 font-semibold">Commission Accrued</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-stone-400 uppercase block">Total Orders</span>
          <p className="font-serif text-3xl font-bold text-charcoal-900 mt-1">{stats?.totalOrders || 0}</p>
          <span className="text-[10px] text-stone-500">{stats?.activeOrdersCount || 0} active in-flight</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-stone-400 uppercase block">Network Nodes</span>
          <p className="font-serif text-3xl font-bold text-charcoal-900 mt-1">
            {stats?.totalRestaurants || 0}K / {stats?.totalPartners || 0}P
          </p>
          <span className="text-[10px] text-stone-500">Kitchens & Delivery Fleet</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-stone-200 gap-6 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-citrus-600 text-citrus-600'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          Recent Orders Audit ({recentOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('restaurants')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'restaurants'
              ? 'border-citrus-600 text-citrus-600'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          Kitchens & Applications ({restaurants.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-citrus-600 text-citrus-600'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          Users & Fleet Governance ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('settlements')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'settlements'
              ? 'border-citrus-600 text-citrus-600'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          Kitchen Settlement Records ({settlements.length})
        </button>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'tickets'
              ? 'border-citrus-600 text-citrus-600'
              : 'border-transparent text-stone-400 hover:text-stone-700'
          }`}
        >
          Customer Support Tickets ({tickets.length})
        </button>
      </div>

      {/* TAB 1: Recent Orders */}
      {activeTab === 'overview' && (() => {
        const activeStatuses = ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'picked_up', 'out_for_delivery'];
        const filtered = recentOrders.filter(ord => {
          if (orderFilter === 'active' && !activeStatuses.includes(ord.status)) return false;
          if (orderFilter === 'delivered' && ord.status !== 'delivered') return false;
          if (orderFilter === 'cancelled' && !['cancelled', 'rejected'].includes(ord.status)) return false;
          if (orderSearch) {
            const q = orderSearch.toLowerCase();
            const orderNum = (ord.orderNumber || '').toLowerCase();
            const custName = (ord.customerId?.name || '').toLowerCase();
            const restName = (ord.restaurantId?.name || '').toLowerCase();
            if (!orderNum.includes(q) && !custName.includes(q) && !restName.includes(q)) return false;
          }
          return true;
        });

        return (
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
              <div>
                <h2 className="font-serif text-lg font-bold text-charcoal-900">
                  Real-Time Order Lifecycle Stream
                </h2>
                <p className="text-xs text-stone-500">Live Socket.IO stream of incoming and in-flight marketplace orders</p>
              </div>

              {/* Filter Tabs & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search order #, customer..."
                    className="px-3 py-1.5 pl-8 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:border-citrus-500 w-44 sm:w-52"
                  />
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                <div className="flex items-center bg-stone-100 p-0.5 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setOrderFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${orderFilter === 'all' ? 'bg-white text-charcoal-900 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-800'}`}
                  >
                    All ({recentOrders.length})
                  </button>
                  <button
                    onClick={() => setOrderFilter('active')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${orderFilter === 'active' ? 'bg-white text-citrus-600 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-800'}`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setOrderFilter('delivered')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${orderFilter === 'delivered' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-800'}`}
                  >
                    Delivered
                  </button>
                  <button
                    onClick={() => setOrderFilter('cancelled')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${orderFilter === 'cancelled' ? 'bg-white text-red-600 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-800'}`}
                  >
                    Cancelled
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Order Number</th>
                    <th className="py-3 px-4">Kitchen</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Partner</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-stone-400 text-xs">
                        No orders match current criteria.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((ord) => (
                      <tr key={ord._id} className="hover:bg-stone-50">
                        <td className="py-3.5 px-4 font-mono font-bold text-charcoal-900">
                          #{ord.orderNumber}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-stone-800">
                          {ord.restaurantId?.name || 'Kitchen'}
                        </td>
                        <td className="py-3.5 px-4 text-stone-600">
                          {ord.customerId?.name || 'Customer'}
                        </td>
                        <td className="py-3.5 px-4 text-stone-600">
                          {ord.partnerId?.name || (
                            <span className="text-amber-600 font-medium">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            ord.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ord.status === 'out_for_delivery'
                              ? 'bg-citrus-100 text-citrus-800'
                              : ['placed', 'accepted', 'preparing'].includes(ord.status)
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-stone-100 text-stone-700'
                          }`}>
                            {ord.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-charcoal-900">
                          ₹{ord.amountBreakup?.totalAmount}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            to={`/restaurant-dashboard?restaurantId=${ord.restaurantId?._id || ord.restaurantId}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-citrus-50 hover:bg-citrus-100 text-citrus-700 text-[11px] font-bold border border-citrus-200 transition-all shadow-2xs"
                            title="Open Kitchen Console to accept, prepare or dispatch"
                          >
                            <Flame className="w-3 h-3 text-citrus-600" />
                            <span>Kitchen Console →</span>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* TAB: Kitchens & Applications */}
      {activeTab === 'restaurants' && (() => {
        const filteredRestaurants = restaurants.filter((r) => {
          if (restaurantFilter === 'approved' && (r.status !== 'approved' || !r.isOpen)) return false;
          if (restaurantFilter === 'pending' && r.status !== 'pending') return false;
          if (restaurantFilter === 'suspended' && r.status !== 'suspended') return false;
          if (restaurantSearch) {
            const q = restaurantSearch.toLowerCase();
            const name = (r.name || '').toLowerCase();
            const city = (r.address?.city || '').toLowerCase();
            const cuisines = (r.cuisines || []).join(' ').toLowerCase();
            if (!name.includes(q) && !city.includes(q) && !cuisines.includes(q)) return false;
          }
          return true;
        });

        return (
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
              <div>
                <h2 className="font-serif text-lg font-bold text-charcoal-900">
                  Kitchen Partner Governance & Curation
                </h2>
                <p className="text-xs text-stone-500">
                  Manage restaurant approvals, delivery radius, serviceable PINs, and real-time live availability
                </p>
              </div>

              {/* Filter Tabs & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={restaurantSearch}
                    onChange={(e) => setRestaurantSearch(e.target.value)}
                    placeholder="Search kitchen, city, cuisine..."
                    className="px-3 py-1.5 pl-8 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:border-citrus-500 w-44 sm:w-56"
                  />
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                <div className="flex items-center bg-stone-100 p-0.5 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setRestaurantFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${restaurantFilter === 'all' ? 'bg-white text-charcoal-900 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-800'}`}
                  >
                    All ({restaurants.length})
                  </button>
                  <button
                    onClick={() => setRestaurantFilter('approved')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${restaurantFilter === 'approved' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-800'}`}
                  >
                    Live ({restaurants.filter(r => r.status === 'approved' && r.isOpen).length})
                  </button>
                  <button
                    onClick={() => setRestaurantFilter('pending')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${restaurantFilter === 'pending' ? 'bg-white text-amber-700 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-800'}`}
                  >
                    Pending ({restaurants.filter(r => r.status === 'pending').length})
                  </button>
                  <button
                    onClick={() => setRestaurantFilter('suspended')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${restaurantFilter === 'suspended' ? 'bg-white text-red-600 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-800'}`}
                  >
                    Suspended ({restaurants.filter(r => r.status === 'suspended').length})
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">Restaurant</th>
                    <th className="py-3 px-4">Owner Contact</th>
                    <th className="py-3 px-4">Cuisines</th>
                    <th className="py-3 px-4">Delivery Coverage</th>
                    <th className="py-3 px-4">Menu Items</th>
                    <th className="py-3 px-4">Status & Live State</th>
                    <th className="py-3 px-4 text-right">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {filteredRestaurants.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-stone-400 text-xs">
                        No restaurant partners found matching current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRestaurants.map((rest) => (
                      <tr key={rest._id} className="hover:bg-stone-50">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-charcoal-900 block">{rest.name}</span>
                          <span className="text-[11px] text-stone-500">{rest.address?.city} • PIN {rest.address?.pincode}</span>
                        </td>
                        <td className="py-3.5 px-4 text-stone-600">
                          <span className="block font-semibold text-charcoal-900">{rest.ownerId?.name || 'Chef Owner'}</span>
                          <span className="text-[11px] block">{rest.ownerId?.email}</span>
                          <span className="text-[11px] text-stone-400">{rest.ownerId?.phone}</span>
                        </td>
                        <td className="py-3.5 px-4 text-stone-600">
                          <div className="flex flex-wrap gap-1">
                            {(rest.cuisines || []).slice(0, 3).map((c, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded bg-ivory-200 text-[10px] text-stone-700 font-medium">
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-charcoal-900">{rest.deliveryRadiusKm || 12} km</span>
                            <span className="text-[10px] text-stone-400">({(rest.serviceablePincodes || []).length} PINs)</span>
                            <button
                              type="button"
                              onClick={() => handleOpenCoverageModal(rest)}
                              className="p-1 rounded-md hover:bg-stone-200 text-citrus-600 transition-colors"
                              title="Edit Delivery Radius & Serviceable PIN Codes"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => handleOpenMenuModal(rest)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-charcoal-900 text-xs font-bold transition-colors"
                          >
                            <Utensils className="w-3 h-3 text-citrus-600" />
                            <span>{rest.menuItemCount || 0} Dishes</span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-block ${
                              rest.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rest.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {rest.status || 'approved'}
                            </span>
                            <div>
                              <span className={`text-[10px] font-bold ${rest.isOpen ? 'text-emerald-700' : 'text-stone-400'}`}>
                                {rest.isOpen ? '● Kitchen Open' : '○ Kitchen Closed'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {rest.status === 'pending' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateRestaurantStatus(rest._id, 'approved', true)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateRestaurantStatus(rest._id, 'rejected', false)}
                                  className="px-2.5 py-1 rounded-lg bg-stone-200 hover:bg-stone-300 text-charcoal-900 text-[11px] font-bold transition-all"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <>
                                <Link
                                  to={`/restaurant-dashboard?restaurantId=${rest._id}`}
                                  className="px-2 py-1 rounded-lg bg-citrus-50 hover:bg-citrus-100 text-citrus-700 text-[11px] font-bold border border-citrus-200 transition-all inline-flex items-center gap-1 shadow-2xs"
                                  title="Open Kitchen Console to view and manage live orders"
                                >
                                  <Flame className="w-3 h-3 text-citrus-600" />
                                  <span>Console</span>
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateRestaurantStatus(rest._id, null, !rest.isOpen)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                    rest.isOpen
                                      ? 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                                      : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                                  }`}
                                >
                                  {rest.isOpen ? 'Close' : 'Open'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateRestaurantStatus(rest._id, rest.status === 'suspended' ? 'approved' : 'suspended', rest.status === 'suspended')}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                    rest.status === 'suspended'
                                      ? 'bg-citrus-100 text-citrus-800 hover:bg-citrus-200'
                                      : 'bg-red-50 text-red-600 hover:bg-red-100'
                                  }`}
                                >
                                  {rest.status === 'suspended' ? 'Activate' : 'Suspend'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* TAB 3: Users Governance */}
      {activeTab === 'users' && (() => {
        const filteredUsers = users.filter((u) => {
          if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
          if (userStatusFilter !== 'all' && u.accountStatus !== userStatusFilter) return false;
          if (userSearch) {
            const q = userSearch.toLowerCase();
            const matchName = (u.name || '').toLowerCase().includes(q);
            const matchEmail = (u.email || '').toLowerCase().includes(q);
            const matchPhone = (u.phone || '').toLowerCase().includes(q);
            if (!matchName && !matchEmail && !matchPhone) return false;
          }
          return true;
        });

        const pendingCount = users.filter(u => u.accountStatus === 'pending').length;

        return (
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <h2 className="font-serif text-lg font-bold text-charcoal-900">
                  Multi-Tenant Account Directory & Fleet Verification
                </h2>
                <p className="text-xs text-stone-500">
                  Review, approve, or suspend platform accounts across customers, kitchens, and courier fleets.
                </p>
              </div>

              {pendingCount > 0 && (
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200 flex items-center gap-1.5 self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  {pendingCount} Application{pendingCount > 1 ? 's' : ''} Pending Review
                </span>
              )}
            </div>

            {/* Controls Bar: Search & Filters */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-stone-50 p-3 rounded-2xl border border-stone-200/60">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search user by name, email, or phone..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-stone-200 text-xs focus:outline-none focus:border-citrus-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Role Filter */}
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs font-medium text-stone-700 focus:outline-none focus:border-citrus-500"
                >
                  <option value="all">All Roles ({users.length})</option>
                  <option value="customer">Customers ({users.filter(u => u.role === 'customer').length})</option>
                  <option value="restaurant">Kitchen Owners ({users.filter(u => u.role === 'restaurant').length})</option>
                  <option value="delivery_partner">Delivery Couriers ({users.filter(u => u.role === 'delivery_partner').length})</option>
                </select>

                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-stone-200/60 p-1 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => setUserStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${userStatusFilter === 'all' ? 'bg-white text-charcoal-900 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-800'}`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserStatusFilter('active')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${userStatusFilter === 'active' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-800'}`}
                  >
                    Active ({users.filter(u => u.accountStatus === 'active').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserStatusFilter('pending')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${userStatusFilter === 'pending' ? 'bg-white text-amber-700 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-800'}`}
                  >
                    Pending ({users.filter(u => u.accountStatus === 'pending').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserStatusFilter('suspended')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${userStatusFilter === 'suspended' ? 'bg-white text-red-600 shadow-2xs font-bold' : 'text-stone-500 hover:text-stone-800'}`}
                  >
                    Suspended ({users.filter(u => u.accountStatus === 'suspended').length})
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider font-bold">
                    <th className="py-3 px-4">User Details</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4">Partner Details</th>
                    <th className="py-3 px-4 text-right">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-stone-400 text-xs">
                        No accounts found matching the current search & filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u._id} className="hover:bg-stone-50">
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-charcoal-900 block">{u.name}</span>
                          <span className="text-[11px] text-stone-500 block">{u.email}</span>
                          <span className="text-[11px] text-stone-400 font-mono">{u.phone}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-900'
                              : u.role === 'restaurant'
                              ? 'bg-citrus-100 text-citrus-900'
                              : u.role === 'delivery_partner'
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-stone-100 text-stone-700'
                          }`}>
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase inline-block ${
                            u.accountStatus === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : u.accountStatus === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {u.accountStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-stone-600">
                          {u.role === 'delivery_partner' ? (
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-mono block font-bold text-charcoal-800">
                                {u.partnerDetails?.vehicleNumber || 'Vehicle Unregistered'}
                              </span>
                              <span className={`text-[10px] font-bold block ${u.partnerDetails?.isVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                                {u.partnerDetails?.isVerified ? 'Fleet Verified ✓' : 'Verification Required'}
                              </span>
                            </div>
                          ) : u.role === 'restaurant' ? (
                            <span className="text-[11px] text-stone-500 italic">
                              Associated Kitchen in Registry
                            </span>
                          ) : (
                            <span className="text-[11px] text-stone-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {u.accountStatus === 'pending' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserStatus(u._id, 'active')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all shadow-2xs"
                                >
                                  Approve & Activate
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserStatus(u._id, 'suspended')}
                                  className="px-2.5 py-1 rounded-lg bg-stone-200 hover:bg-stone-300 text-charcoal-900 text-[11px] font-bold transition-all"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <>
                                {u.role === 'delivery_partner' && (
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePartnerApproval(u._id, u.partnerDetails?.isVerified ? 'suspended' : 'active', !u.partnerDetails?.isVerified)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                                      u.partnerDetails?.isVerified
                                        ? 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                        : 'bg-emerald-600 text-white hover:bg-emerald-500'
                                    }`}
                                  >
                                    {u.partnerDetails?.isVerified ? 'Revoke Fleet' : 'Verify Fleet'}
                                  </button>
                                )}
                                {u.role !== 'admin' && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleUserStatus(u._id)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                      u.accountStatus === 'active'
                                        ? 'text-red-600 hover:bg-red-50'
                                        : 'text-emerald-700 hover:bg-emerald-50'
                                    }`}
                                  >
                                    {u.accountStatus === 'active' ? 'Suspend' : 'Reactivate'}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* TAB 3: Settlements */}
      {activeTab === 'settlements' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
          <h2 className="font-serif text-lg font-bold text-charcoal-900 border-b border-stone-100 pb-3">
            Restaurant Settlement Ledger
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Restaurant</th>
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Gross Total</th>
                  <th className="py-3 px-4">CRAVE Commission</th>
                  <th className="py-3 px-4">Net Payout</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {settlements.map((s) => (
                  <tr key={s._id} className="hover:bg-stone-50">
                    <td className="py-3.5 px-4 font-bold text-charcoal-900">{s.restaurantId?.name}</td>
                    <td className="py-3.5 px-4 font-mono font-semibold">#{s.orderId?.orderNumber}</td>
                    <td className="py-3.5 px-4">₹{s.grossAmount}</td>
                    <td className="py-3.5 px-4 text-citrus-600 font-bold">₹{s.platformCommission}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700">₹{s.netSettlementAmount}</td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                        {s.settlementStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Support Tickets */}
      {activeTab === 'tickets' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h2 className="font-serif text-lg font-bold text-charcoal-900">
              Customer Support Ticket Console ({tickets.length})
            </h2>
            <button
              onClick={fetchAdminData}
              className="text-xs font-bold text-citrus-600 hover:underline"
            >
              Refresh Tickets
            </button>
          </div>

          {tickets.length === 0 ? (
            <div className="py-12 text-center text-stone-500 text-xs">
              No support tickets found. All customer inquiries are clear.
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((t) => {
                const statusStyles = {
                  open: 'bg-amber-100 text-amber-800',
                  in_progress: 'bg-blue-100 text-blue-800',
                  resolved: 'bg-emerald-100 text-emerald-800',
                  closed: 'bg-stone-100 text-stone-700'
                };

                return (
                  <div
                    key={t._id}
                    className="p-5 rounded-2xl border border-stone-200 space-y-3 bg-stone-50/50"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/60 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-charcoal-900 text-sm">{t.subject}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyles[t.status] || 'bg-stone-100 text-stone-800'}`}>
                            {t.status?.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          From: <strong>{t.customerId?.name || 'Customer'}</strong> ({t.customerId?.email || 'N/A'}) • Category: <span className="capitalize">{t.category?.replace('_', ' ')}</span> {t.orderId ? `• Order: #${t.orderId}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {t.status !== 'in_progress' && t.status !== 'resolved' && (
                          <button
                            type="button"
                            disabled={updatingTicketId === t._id}
                            onClick={() => handleUpdateTicket(t._id, 'in_progress')}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition-all"
                          >
                            Mark In Progress
                          </button>
                        )}
                        {t.status !== 'resolved' && (
                          <button
                            type="button"
                            disabled={updatingTicketId === t._id}
                            onClick={() => handleUpdateTicket(t._id, 'resolved')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all"
                          >
                            Resolve Ticket
                          </button>
                        )}
                        {t.status === 'resolved' && (
                          <button
                            type="button"
                            disabled={updatingTicketId === t._id}
                            onClick={() => handleUpdateTicket(t._id, 'closed')}
                            className="px-2.5 py-1 rounded-lg bg-stone-600 hover:bg-stone-500 text-white text-[11px] font-bold transition-all"
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-wrap">
                      {t.message}
                    </p>

                    {/* Admin Resolution Input Box */}
                    <div className="pt-2 border-t border-stone-200/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        placeholder={t.adminNotes ? `Current note: ${t.adminNotes}` : 'Add administrative resolution note for customer...'}
                        value={adminNoteInput[t._id] || ''}
                        onChange={(e) => setAdminNoteInput({ ...adminNoteInput, [t._id]: e.target.value })}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-stone-200 text-xs bg-white focus:outline-none focus:border-citrus-500"
                      />
                      <button
                        type="button"
                        disabled={updatingTicketId === t._id || !adminNoteInput[t._id]}
                        onClick={() => handleUpdateTicket(t._id, t.status)}
                        className="px-3 py-1.5 rounded-lg bg-charcoal-900 hover:bg-stone-800 disabled:opacity-40 text-white text-xs font-bold transition-all"
                      >
                        Save Note
                      </button>
                    </div>

                    {t.adminNotes && (
                      <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                        <strong>Logged Resolution Note:</strong> {t.adminNotes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Edit Coverage (Delivery Radius & Serviceable PIN Codes) */}
      {selectedCoverageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col">
            <div className="bg-aubergine-900 text-ivory-50 p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-citrus-600 flex items-center justify-center text-white">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm">Delivery Service Coverage</h3>
                  <p className="text-[11px] text-stone-300">{selectedCoverageModal.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCoverageModal(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-stone-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Maximum Delivery Radius (Kilometers)
                </label>
                <input
                  type="number"
                  min="1"
                  max="40"
                  value={coverageRadiusInput}
                  onChange={(e) => setCoverageRadiusInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono font-bold text-charcoal-900 focus:outline-none focus:border-citrus-500"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">
                  Authoritative limit for geospatial dispatch radius from kitchen coordinates.
                </span>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  Serviceable Indian Postal PIN Codes (Comma Separated)
                </label>
                <textarea
                  rows="3"
                  value={coveragePincodesInput}
                  onChange={(e) => setCoveragePincodesInput(e.target.value)}
                  placeholder="110001, 110002, 110003, 110024"
                  className="w-full px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono text-charcoal-900 focus:outline-none focus:border-citrus-500"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">
                  Orders to PIN codes outside this configured list will be authoritatively rejected.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCoverageModal(null)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-charcoal-900 font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingCoverage}
                  onClick={handleSaveCoverage}
                  className="px-5 py-2 rounded-xl bg-citrus-600 hover:bg-citrus-500 text-white font-bold transition-all"
                >
                  {savingCoverage ? 'Saving Coverage...' : 'Save Service Area'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: View Menu Dishes */}
      {selectedMenuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-aubergine-900 text-ivory-50 p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-citrus-600 flex items-center justify-center text-white">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm">
                    {selectedMenuModal.name} — Menu Catalog
                  </h3>
                  <p className="text-[11px] text-stone-300">
                    {menuItems.length} curated culinary offerings
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMenuModal(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-stone-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3">
              {loadingMenu ? (
                <div className="py-8 text-center text-stone-400 text-xs">
                  Loading menu offerings from MongoDB...
                </div>
              ) : menuItems.length === 0 ? (
                <div className="py-8 text-center text-stone-400 text-xs">
                  No menu items currently configured for this kitchen.
                </div>
              ) : (
                <div className="divide-y divide-stone-100 text-xs">
                  {menuItems.map((item) => (
                    <div key={item._id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          <span className="font-bold text-charcoal-900">{item.name}</span>
                          <span className="px-2 py-0.5 rounded bg-stone-100 text-[10px] text-stone-600 font-semibold">
                            {item.category}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">{item.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="font-bold text-charcoal-900 font-mono">₹{item.price}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-500'
                        }`}>
                          {item.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
