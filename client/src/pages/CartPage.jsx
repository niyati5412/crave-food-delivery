import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { updateQuantity, removeItem, applyDiscount, removeDiscount, clearCart } from '../redux/cartSlice';
import api from '../services/api';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Tag,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function CartPage() {
  const { restaurant, items, offerCode, discount } = useSelector((state) => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [inputCoupon, setInputCoupon] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const itemSubtotal = items.reduce((sum, item) => sum + item.itemTotal, 0);
  const deliveryFee = itemSubtotal > 0 ? 35 : 0;
  const packagingFee = itemSubtotal > 0 ? 25 : 0;
  const taxes = Math.round(itemSubtotal * 0.05 * 100) / 100;
  const grandTotal = Math.max(0, Math.round((itemSubtotal + deliveryFee + packagingFee + taxes - discount) * 100) / 100);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!inputCoupon.trim()) return;

    try {
      setValidatingCoupon(true);
      setCouponError('');
      setCouponSuccess('');

      const res = await api.post('/offers/validate', {
        code: inputCoupon.trim().toUpperCase(),
        cartAmount: itemSubtotal
      });

      if (res.data.success) {
        dispatch(applyDiscount({
          code: res.data.offer.code,
          discount: res.data.calculatedDiscount
        }));
        setCouponSuccess(res.data.message);
        setInputCoupon('');
      }
    } catch (err) {
      setCouponError(err.response?.data?.message || 'Invalid or ineligible coupon code.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    dispatch(removeDiscount());
    setCouponSuccess('');
    setCouponError('');
  };

  if (!items || items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-ivory-200 text-stone-500 flex items-center justify-center">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="font-serif text-3xl font-bold text-charcoal-900">
          Your Culinary Basket is Empty
        </h2>
        <p className="text-xs text-stone-500 max-w-sm mx-auto">
          Explore our handpicked curation of master kitchens and compose your next extraordinary meal.
        </p>
        <div className="pt-2">
          <Link
            to="/restaurants"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-citrus-600 hover:bg-citrus-500 text-white font-bold text-xs shadow-md transition-all"
          >
            Explore Kitchens
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Title */}
      <div>
        <span className="text-xs font-bold text-citrus-600 uppercase tracking-widest">
          Checkout Review
        </span>
        <h1 className="font-serif text-3xl font-bold text-charcoal-900 mt-1">
          Your Order from {restaurant?.name}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Items list */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h2 className="font-serif text-lg font-bold text-charcoal-900">
              Selected Dishes ({items.length})
            </h2>
            <button
              onClick={() => dispatch(clearCart())}
              className="text-xs text-stone-400 hover:text-red-600 font-semibold flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Cart
            </button>
          </div>

          <div className="divide-y divide-stone-100">
            {items.map((item, index) => (
              <div key={index} className="py-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                        item.isVeg ? 'border-emerald-600' : 'border-red-600'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-emerald-600' : 'bg-red-600'}`} />
                    </span>
                    <h3 className="font-serif text-base font-bold text-charcoal-900">
                      {item.name}
                    </h3>
                  </div>

                  <p className="text-xs font-bold text-stone-700">
                    ₹{item.price} each
                  </p>

                  {/* Add-ons List */}
                  {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                    <div className="text-[11px] text-stone-500 pl-5 space-y-0.5">
                      {item.selectedAddOns.map((addOn, aIdx) => (
                        <p key={aIdx}>+ {addOn.name} (₹{addOn.price})</p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Quantity & Item Total */}
                <div className="flex flex-col items-end gap-2">
                  <span className="text-sm font-bold text-charcoal-900">
                    ₹{item.itemTotal}
                  </span>

                  <div className="flex items-center gap-2 bg-ivory-200 rounded-full px-2 py-1 border border-ivory-300">
                    <button
                      onClick={() => dispatch(updateQuantity({ index, quantity: item.quantity - 1 }))}
                      className="w-5 h-5 rounded-full bg-white text-charcoal-900 flex items-center justify-center shadow-xs hover:bg-stone-100 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => dispatch(updateQuantity({ index, quantity: item.quantity + 1 }))}
                      className="w-5 h-5 rounded-full bg-white text-charcoal-900 flex items-center justify-center shadow-xs hover:bg-stone-100 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <Link
              to={`/restaurants/${restaurant?._id}`}
              className="text-xs font-bold text-citrus-600 hover:text-citrus-700 flex items-center gap-1"
            >
              + Add more items from {restaurant?.name}
            </Link>
          </div>
        </div>

        {/* Right: Bill Summary & Promo Code */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Coupon Code Section */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-3">
            <h3 className="font-serif text-base font-bold text-charcoal-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-citrus-600" />
              Promotional Offer
            </h3>

            {offerCode ? (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs">
                <div>
                  <p className="font-bold text-emerald-800 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Coupon '{offerCode}' Applied
                  </p>
                  <p className="text-[11px] text-emerald-600">You saved ₹{discount} on this meal</p>
                </div>
                <button
                  onClick={handleRemoveCoupon}
                  className="text-xs font-bold text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter coupon (e.g. CRAVE50)"
                    value={inputCoupon}
                    onChange={(e) => setInputCoupon(e.target.value)}
                    className="flex-grow px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs uppercase font-semibold text-charcoal-900 focus:outline-none focus:border-citrus-500"
                  />
                  <button
                    type="submit"
                    disabled={validatingCoupon}
                    className="px-4 py-2 rounded-xl bg-charcoal-900 hover:bg-stone-800 text-white font-bold text-xs uppercase transition-colors"
                  >
                    {validatingCoupon ? 'Checking...' : 'Apply'}
                  </button>
                </div>
                {couponError && (
                  <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {couponError}
                  </p>
                )}
                {couponSuccess && (
                  <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> {couponSuccess}
                  </p>
                )}
                <div className="text-[11px] text-stone-400">
                  Try test coupons: <strong className="text-stone-600">CRAVE50</strong> (50% off up to ₹150) or <strong className="text-stone-600">FEAST20</strong>
                </div>
              </form>
            )}
          </div>

          {/* Bill Summary */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
            <h3 className="font-serif text-base font-bold text-charcoal-900 border-b border-stone-100 pb-2">
              Bill Summary
            </h3>

            <div className="space-y-2 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Item Subtotal</span>
                <span className="font-bold text-charcoal-900">₹{itemSubtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className="font-bold text-charcoal-900">₹{deliveryFee}</span>
              </div>
              <div className="flex justify-between">
                <span>Eco Thermal Packaging</span>
                <span className="font-bold text-charcoal-900">₹{packagingFee}</span>
              </div>
              <div className="flex justify-between">
                <span>Government Taxes (5% GST)</span>
                <span className="font-bold text-charcoal-900">₹{taxes}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Offer Discount ({offerCode})</span>
                  <span>-₹{discount}</span>
                </div>
              )}

              <div className="border-t border-stone-200 pt-3 flex justify-between text-sm font-bold text-charcoal-900">
                <span>To Pay</span>
                <span className="text-citrus-600 text-base">₹{grandTotal}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full py-3.5 px-6 rounded-2xl bg-citrus-600 hover:bg-citrus-500 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-between"
            >
              <span>Proceed to Delivery</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
