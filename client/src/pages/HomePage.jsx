import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../services/api';
import { connectSocket, getSocket } from '../services/socket';
import RestaurantCard from '../components/RestaurantCard';
import {
  Compass,
  Search,
  Sparkles,
  MapPin,
  Clock,
  ShieldCheck,
  ChevronRight,
  Award,
  Zap,
  ArrowRight,
  Radio,
  Bike,
  Utensils,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function HomePage() {
  const { user, isAuthenticated, token } = useSelector((state) => state.auth);

  const [restaurants, setRestaurants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Current Active Order State for Logged-In Customer
  const [currentOrderData, setCurrentOrderData] = useState({
    checked: false,
    hasActiveOrder: false,
    order: null,
    estimateAvailable: false,
    estimatedDeliveryTime: null,
    allActiveOrders: []
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchFeaturedRestaurants();
    fetchCategories();
  }, []);

  // Fetch current active order for authenticated customer
  useEffect(() => {
    if (isAuthenticated && user?.role === 'customer') {
      fetchCurrentOrder();
    } else {
      setCurrentOrderData({
        checked: true,
        hasActiveOrder: false,
        order: null,
        estimateAvailable: false,
        estimatedDeliveryTime: null,
        allActiveOrders: []
      });
    }
  }, [isAuthenticated, user]);

  // Real-time socket listener for customer's in-flight order
  useEffect(() => {
    if (!token || !isAuthenticated || user?.role !== 'customer') return;

    const socket = connectSocket(token);
    if (socket) {
      const activeId = currentOrderData.order?._id;
      if (activeId) {
        socket.emit('join:order', { orderId: activeId });
      }

      socket.on('order:status_updated', () => {
        fetchCurrentOrder();
      });

      socket.on('order:new', () => {
        fetchCurrentOrder();
      });
    }

    return () => {
      if (socket) {
        socket.off('order:status_updated');
        socket.off('order:new');
      }
    };
  }, [token, isAuthenticated, user, currentOrderData.order?._id]);

  const fetchCurrentOrder = async () => {
    try {
      const res = await api.get('/orders/my/current');
      if (res.data.success) {
        setCurrentOrderData({
          checked: true,
          hasActiveOrder: res.data.hasActiveOrder,
          order: res.data.order,
          estimateAvailable: res.data.estimateAvailable,
          estimatedDeliveryTime: res.data.estimatedDeliveryTime,
          allActiveOrders: res.data.allActiveOrders || []
        });
      }
    } catch (err) {
      console.warn('Failed to fetch current customer order:', err);
      setCurrentOrderData(prev => ({ ...prev, checked: true }));
    }
  };

  const fetchFeaturedRestaurants = async () => {
    try {
      setLoading(true);
      const res = await api.get('/restaurants?sort=rating');
      if (res.data.success) {
        setRestaurants(res.data.data.slice(0, 4));
      }
    } catch (err) {
      console.error('Failed to load restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/restaurants/categories');
      if (res.data.success && res.data.categories) {
        setCategories(res.data.categories.slice(0, 5));
      }
    } catch (err) {
      console.warn('Categories fetch failed:', err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/restaurants?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/restaurants');
    }
  };

  return (
    <div className="space-y-20 pb-20">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-aubergine-900 text-ivory-50 pt-16 pb-24 md:py-28">
        {/* Subtle patterned background */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#E85A2A_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Narrative */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-citrus-400 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                The New Standard in Fine Dining Delivery
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1]">
                Extraordinary dining, <br />
                <span className="italic font-normal text-citrus-400">delivered with</span> live precision.
              </h1>

              <p className="text-stone-300 text-sm sm:text-base max-w-xl leading-relaxed">
                Experience award-winning master chefs, artisanal bakeries, and heritage kitchens at your residence. Fully synchronized with live courier telemetry and server-enforced lifecycle tracking.
              </p>

              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit} className="pt-2">
                <div className="p-2 bg-white rounded-3xl shadow-2xl flex flex-col sm:flex-row gap-2 max-w-xl">
                  <div className="flex items-center gap-3 px-4 py-2 flex-grow">
                    <Search className="w-5 h-5 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Cuisine, artisan kitchen, or favorite dish..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full text-xs sm:text-sm text-charcoal-900 placeholder-stone-400 focus:outline-none bg-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    className="py-3 px-6 rounded-2xl bg-citrus-600 hover:bg-citrus-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md"
                  >
                    Explore
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {/* Feature Highlights */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-white/10 text-xs text-stone-300">
                <div>
                  <p className="font-serif text-2xl font-bold text-white">100%</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">Kitchen-to-Door Audit</p>
                </div>
                <div>
                  <p className="font-serif text-2xl font-bold text-white">&lt;30m</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">Average Urban Dispatch</p>
                </div>
                <div>
                  <p className="font-serif text-2xl font-bold text-white">4.8★</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">Chef Culinary Rating</p>
                </div>
              </div>
            </div>

            {/* Right Hero Editorial Visual */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto w-full max-w-md aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10">
                <img
                  src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80"
                  alt="Fine dining preparation"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/80 via-transparent to-transparent" />

                {/* Floating Telemetry Badge */}
                <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-white/95 backdrop-blur-md text-charcoal-900 shadow-xl border border-white/50 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Live Order Telemetry
                    </span>
                    <span className="text-citrus-600">{restaurants[0] ? `${restaurants[0].name.slice(0, 10).toUpperCase()}` : 'ACTIVE'}</span>
                  </div>
                  <p className="text-xs text-stone-600 font-medium truncate">
                    {restaurants[0] ? `${restaurants[0].name} • ${restaurants[0].cuisines.slice(0, 2).join(' & ')}` : 'Fine Dining Kitchen Dispatch'}
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[11px] text-stone-500 border-t border-stone-200 mt-2">
                    <span>ETA: {restaurants[0]?.prepTimeMins ? `${restaurants[0].prepTimeMins} mins` : '20 mins'}</span>
                    <span className="font-semibold text-charcoal-900">Live GPS Stream</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Logged-In Customer's Current Active Order Card */}
      {isAuthenticated && user?.role === 'customer' && currentOrderData.hasActiveOrder && currentOrderData.order && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-12 relative z-20 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-citrus-500/80 shadow-2xl space-y-4">
            
            {/* Top Bar: Live telemetry indicator & multi-order switcher if applicable */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-bold text-citrus-600 uppercase tracking-widest">
                  Active In-Flight Delivery
                </span>
              </div>

              {currentOrderData.allActiveOrders.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <span className="text-[11px] font-medium text-stone-500">Other In-Flight:</span>
                  {currentOrderData.allActiveOrders.map((ao) => (
                    <button
                      key={ao._id}
                      type="button"
                      onClick={() => setCurrentOrderData(prev => ({ ...prev, order: ao }))}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                        ao._id === currentOrderData.order._id
                          ? 'bg-charcoal-900 text-white'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      #{ao.orderNumber}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Main Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              
              {/* Restaurant & Items summary */}
              <div className="md:col-span-5 space-y-1.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-charcoal-900">
                    {currentOrderData.order.restaurantId?.name || 'Artisanal Kitchen'}
                  </h3>
                  <span className="text-xs font-mono font-bold text-stone-500">
                    #{currentOrderData.order.orderNumber}
                  </span>
                </div>
                <p className="text-xs text-stone-600 line-clamp-1">
                  {currentOrderData.order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                </p>
                <p className="text-xs font-bold text-charcoal-900">
                  Total Payable: ₹{currentOrderData.order.amountBreakup?.totalAmount} • <span className="font-semibold text-stone-500 uppercase text-[10px]">{currentOrderData.order.paymentMode}</span>
                </p>
              </div>

              {/* Status & Estimated Arrival */}
              <div className="md:col-span-4 p-3.5 bg-ivory-100/90 rounded-2xl border border-ivory-300 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500 text-[11px]">Current Status:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-citrus-100 text-citrus-800">
                    {currentOrderData.order.status?.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="pt-1 flex items-center justify-between text-xs">
                  <span className="text-stone-500 text-[11px]">Est. Arrival:</span>
                  <span className="font-bold text-charcoal-900 font-mono text-[11px]">
                    {currentOrderData.estimateAvailable && currentOrderData.estimatedDeliveryTime ? (
                      `~${new Date(currentOrderData.estimatedDeliveryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    ) : (
                      'Estimate temporarily unavailable'
                    )}
                  </span>
                </div>
              </div>

              {/* Action: Prominent Track Live Order Button */}
              <div className="md:col-span-3 flex justify-start md:justify-end">
                <Link
                  to={`/tracking/${currentOrderData.order._id}`}
                  className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-citrus-600 hover:bg-citrus-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
                >
                  <Radio className="w-4 h-4 animate-pulse" />
                  <span>Track Live Order</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

            </div>

          </div>
        </section>
      )}

      {/* Culinary Category Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold text-citrus-600 uppercase tracking-widest">
              Curated Gastronomy
            </span>
            <h2 className="font-serif text-3xl font-bold text-charcoal-900 mt-1">
              Explore by Culinary Tradition
            </h2>
          </div>
          <Link
            to="/restaurants"
            className="hidden sm:flex items-center gap-1 text-xs font-bold text-citrus-600 hover:text-citrus-700"
          >
            Browse All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((cat, idx) => (
            <Link
              key={idx}
              to={`/restaurants?cuisine=${encodeURIComponent(cat.query)}`}
              className="group relative rounded-2xl overflow-hidden aspect-[4/5] bg-stone-100 shadow-sm hover:shadow-md transition-all"
            >
              <img
                src={cat.image}
                alt={cat.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/80 via-black/20 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <span className="text-xs font-bold block">{cat.name}</span>
                <span className="text-[10px] text-citrus-300 font-medium">Explore &rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Artisanal Kitchens */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold text-citrus-600 uppercase tracking-widest">
              Chef Selection
            </span>
            <h2 className="font-serif text-3xl font-bold text-charcoal-900 mt-1">
              Top Rated Artisanal Kitchens
            </h2>
          </div>
          <Link
            to="/restaurants"
            className="flex items-center gap-1 text-xs font-bold text-citrus-600 hover:text-citrus-700"
          >
            View Map & Radius <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-3xl h-80 animate-pulse border border-stone-200" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {restaurants.map((restaurant) => (
              <RestaurantCard key={restaurant._id} restaurant={restaurant} />
            ))}
          </div>
        )}
      </section>

      {/* The CRAVE Experience Promise */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-ivory-100 rounded-3xl p-8 sm:p-12 border border-ivory-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-aubergine-900 text-citrus-400 flex items-center justify-center shadow-md">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-charcoal-900">
                Uncompromising Provenance
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Every kitchen undergoes rigid gastronomic curation. Zero generic ghost-kitchens; only verified master culinary artisans.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-aubergine-900 text-citrus-400 flex items-center justify-center shadow-md">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-charcoal-900">
                Live Courier Telemetry
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                MongoDB 2dsphere indexing and Socket.IO rooms stream live courier GPS updates directly to your screen with zero guesswork.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-aubergine-900 text-citrus-400 flex items-center justify-center shadow-md">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-xl font-bold text-charcoal-900">
                Single-Kitchen Integrity
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Strict single-restaurant order grouping guarantees dishes travel directly from heat to dining table without cross-route delays.
              </p>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
