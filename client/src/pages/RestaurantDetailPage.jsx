import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import api from '../services/api';
import { addItem } from '../redux/cartSlice';
import AddOnsModal from '../components/AddOnsModal';
import {
  Star,
  Clock,
  MapPin,
  Leaf,
  Plus,
  ShoppingBag,
  Award,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertCircle,
  Search
} from 'lucide-react';

export default function RestaurantDetailPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { restaurant: cartRestaurant, items: cartItems } = useSelector((state) => state.cart);

  const [restaurant, setRestaurant] = useState(null);
  const [categories, setCategories] = useState({});
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedItemForModal, setSelectedItemForModal] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reviews, setReviews] = useState([]);

  // Pincode serviceability widget state
  const [checkPincode, setCheckPincode] = useState('');
  const [pincodeCheckResult, setPincodeCheckResult] = useState(null);
  const [checkingPincode, setCheckingPincode] = useState(false);

  useEffect(() => {
    fetchRestaurantDetails();
    fetchReviews();
  }, [id]);

  const handleVerifyPincode = async (e) => {
    e.preventDefault();
    if (!checkPincode || checkPincode.length < 6) return;
    try {
      setCheckingPincode(true);
      const res = await api.post(`/restaurants/${id}/check-serviceability`, {
        pincode: checkPincode.trim()
      });
      if (res.data.success) {
        setPincodeCheckResult(res.data);
      }
    } catch (err) {
      setPincodeCheckResult({
        serviceable: false,
        reason: err.response?.data?.message || 'Sorry, this restaurant does not deliver to your selected address yet.'
      });
    } finally {
      setCheckingPincode(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await api.get(`/reviews/${id}`);
      if (res.data.success) {
        setReviews(res.data.reviews || []);
      }
    } catch (err) {
      console.warn('Reviews fetch:', err);
    }
  };

  const fetchRestaurantDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/restaurants/${id}`);
      if (res.data.success) {
        setRestaurant(res.data.restaurant);
        setCategories(res.data.categories || {});
        setActiveCategory('all');
      }
    } catch (err) {
      console.error('Failed to load restaurant details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleItemAddClick = (item) => {
    if (item.addOns && item.addOns.length > 0) {
      setSelectedItemForModal(item);
      setIsModalOpen(true);
    } else {
      // Add directly
      dispatch(addItem({
        restaurant,
        item,
        quantity: 1,
        selectedAddOns: []
      }));
    }
  };

  const handleModalAddToCart = (payload) => {
    dispatch(addItem(payload));
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-8 animate-pulse">
        <div className="w-full h-72 bg-stone-200 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-36 bg-stone-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center py-24 space-y-4">
        <h2 className="font-serif text-3xl font-bold text-charcoal-900">Restaurant Not Found</h2>
        <Link to="/restaurants" className="inline-block px-6 py-2.5 rounded-full bg-citrus-600 text-white font-bold text-xs">
          Return to Marketplace
        </Link>
      </div>
    );
  }

  const categoryNames = Object.keys(categories);
  const cartItemCount = cartRestaurant?._id === restaurant._id
    ? cartItems.reduce((acc, curr) => acc + curr.quantity, 0)
    : 0;

  return (
    <div className="pb-24">
      
      {/* Restaurant Hero Section */}
      <div className="relative bg-aubergine-900 text-white">
        <div className="absolute inset-0 opacity-30">
          <img
            src={restaurant.images?.cover}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-950/70 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row gap-6 md:items-end justify-between">
            <div className="space-y-3 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                {restaurant.featuredBadge && (
                  <span className="px-3 py-1 rounded-full bg-citrus-600/90 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <Award className="w-3.5 h-3.5" />
                    {restaurant.featuredBadge}
                  </span>
                )}
                {restaurant.isPureVeg && (
                  <span className="px-3 py-1 rounded-full bg-emerald-800 text-emerald-100 text-[11px] font-bold flex items-center gap-1">
                    <Leaf className="w-3.5 h-3.5" /> Pure Veg
                  </span>
                )}
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
                {restaurant.name}
              </h1>

              <p className="text-xs sm:text-sm text-stone-300 italic">
                {restaurant.tagline}
              </p>

              <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                {restaurant.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-stone-300 pt-2">
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  {restaurant.rating?.toFixed(1)} ({restaurant.totalRatings} ratings)
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-stone-400" />
                  {restaurant.prepTimeMins} mins prep
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-stone-400" />
                  {restaurant.address?.landmark || restaurant.address?.city}
                </span>
                <span>•</span>
                <span className="text-citrus-400 font-bold">
                  ₹{restaurant.priceForTwo} for two
                </span>
              </div>
            </div>

            {/* Kitchen Status Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-xs text-white space-y-1 self-start md:self-auto">
              <div className="flex items-center gap-2 font-bold">
                <span className={`h-2.5 w-2.5 rounded-full ${restaurant.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                <span>{restaurant.isOpen ? 'Accepting Orders' : 'Kitchen Closed'}</span>
              </div>
              <p className="text-[11px] text-stone-300">Min. order ₹{restaurant.minimumOrderAmount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Category Navigation Bar */}
      <div className="sticky top-20 z-30 bg-ivory-50/95 backdrop-blur-md border-b border-ivory-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto py-3 no-scrollbar">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeCategory === 'all'
                  ? 'bg-charcoal-900 text-white shadow-xs'
                  : 'bg-ivory-100 hover:bg-ivory-200 text-stone-700 border border-ivory-300'
              }`}
            >
              All Items ({Object.values(categories).reduce((sum, arr) => sum + (arr?.length || 0), 0)})
            </button>
            {categoryNames.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-charcoal-900 text-white shadow-xs'
                    : 'bg-ivory-100 hover:bg-ivory-200 text-stone-700 border border-ivory-300'
                }`}
              >
                {cat} ({categories[cat]?.length || 0})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pincode & Area Serviceability Verification Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-citrus-50 text-citrus-600 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-charcoal-900">Check Area Serviceability</h4>
              <p className="text-[11px] text-stone-500">
                Delivering within {restaurant.deliveryRadiusKm || 12} km radius of {restaurant.address?.city}
              </p>
            </div>
          </div>

          <form onSubmit={handleVerifyPincode} className="flex items-center gap-2">
            <input
              type="text"
              maxLength="6"
              placeholder="Enter 6-digit PIN"
              value={checkPincode}
              onChange={(e) => setCheckPincode(e.target.value)}
              className="px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono font-medium text-charcoal-900 w-36 focus:outline-none focus:border-citrus-500"
            />
            <button
              type="submit"
              disabled={checkingPincode || checkPincode.length < 6}
              className="px-4 py-2 rounded-xl bg-charcoal-900 hover:bg-charcoal-800 disabled:bg-stone-300 text-white text-xs font-bold transition-all shadow-xs"
            >
              {checkingPincode ? 'Checking...' : 'Verify'}
            </button>
          </form>

          {pincodeCheckResult && (
            <div className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 ${
              pincodeCheckResult.serviceable
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {pincodeCheckResult.serviceable ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Deliverable to {checkPincode}! (ETA: {pincodeCheckResult.estimatedDeliveryMins || 25} mins)</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{pincodeCheckResult.reason || 'Outside active delivery radius'}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Menu Items Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {categoryNames
          .filter((cat) => !activeCategory || activeCategory === 'all' || activeCategory === cat)
          .map((categoryTitle, cIdx) => (
            <div key={cIdx} className="space-y-4">
              <div className="border-b border-stone-200 pb-2">
                <h2 className="font-serif text-2xl font-bold text-charcoal-900">
                  {categoryTitle}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories[categoryTitle]?.map((item) => (
                  <div
                    key={item._id}
                    className="flex justify-between gap-4 p-4 rounded-3xl bg-white border border-stone-200/80 shadow-xs hover:shadow-md transition-shadow"
                  >
                    {/* Item Details */}
                    <div className="space-y-1.5 flex-grow pr-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                            item.isVeg ? 'border-emerald-600' : 'border-red-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.isVeg ? 'bg-emerald-600' : 'bg-red-600'
                            }`}
                          />
                        </span>
                        {item.isPopular && (
                          <span className="text-[10px] font-bold text-citrus-600 uppercase tracking-wider">
                            ★ Signature
                          </span>
                        )}
                      </div>

                      <h3 className="font-serif text-base font-bold text-charcoal-900 leading-snug">
                        {item.name}
                      </h3>

                      <p className="text-xs font-bold text-charcoal-900">
                        ₹{item.price}
                      </p>

                      <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      {item.addOns && item.addOns.length > 0 && (
                        <span className="inline-block text-[10px] text-stone-400 font-medium">
                          Customizable add-ons available
                        </span>
                      )}
                    </div>

                    {/* Image & Add Button */}
                    <div className="relative flex-shrink-0 w-28 h-28 rounded-2xl overflow-hidden bg-stone-100 flex flex-col items-center justify-end">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                      {/* ADD Button */}
                      <button
                        onClick={() => handleItemAddClick(item)}
                        disabled={!item.isAvailable || !restaurant.isOpen}
                        className={`relative z-10 mb-2 px-4 py-1.5 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1 ${
                          !item.isAvailable || !restaurant.isOpen
                            ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                            : 'bg-white text-citrus-600 hover:bg-citrus-600 hover:text-white'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        {item.isAvailable ? 'ADD' : 'SOLD OUT'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Verified Diner Reviews Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-stone-200 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-citrus-600 uppercase tracking-widest block">
              Culinary Accolades & Critique
            </span>
            <h2 className="font-serif text-2xl font-bold text-charcoal-900 mt-1">
              Verified Diner Experiences ({reviews.length})
            </h2>
          </div>
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>{restaurant.rating?.toFixed(1)} Overall Rating</span>
          </div>
        </div>

        {reviews.length === 0 ? (
          <p className="text-xs text-stone-500 italic py-4">No reviews yet for this culinary kitchen.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((rev) => (
              <div
                key={rev._id}
                className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-ivory-300 text-charcoal-900 font-bold text-xs flex items-center justify-center">
                      {rev.customerId?.name?.charAt(0) || 'D'}
                    </div>
                    <span className="text-xs font-bold text-charcoal-900">
                      {rev.customerId?.name || 'Verified Diner'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-stone-700 leading-relaxed italic">
                  "{rev.comment}"
                </p>

                {rev.tags && rev.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {rev.tags.map((t, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[10px] font-medium">
                        ✓ {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart Pill (Shows if customer has items in cart) */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-md animate-slideUp">
          <Link
            to="/cart"
            className="flex items-center justify-between p-4 rounded-2xl bg-charcoal-900 text-white shadow-2xl hover:bg-stone-900 transition-all border border-charcoal-800"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-citrus-600 flex items-center justify-center text-xs font-bold">
                {cartItemCount}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold uppercase tracking-wider text-citrus-400">
                  {cartRestaurant?.name || 'Selected Items'}
                </p>
                <p className="text-[11px] text-stone-300">
                  View Basket & Proceed to Checkout
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-bold text-white">
              <span>View Cart</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      )}

      {/* Add-ons Customization Dialog */}
      <AddOnsModal
        item={selectedItemForModal}
        restaurant={restaurant}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddToCart={handleModalAddToCart}
      />

    </div>
  );
}
