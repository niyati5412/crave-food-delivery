import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Star,
  Utensils,
  Bike,
  Sparkles,
  CheckCircle2,
  X,
  AlertCircle,
  MessageSquare
} from 'lucide-react';

export default function OrderFeedbackModal({
  isOpen,
  onClose,
  orderId,
  restaurantName,
  partnerName
}) {
  const [restaurantRating, setRestaurantRating] = useState(5);
  const [deliveryRating, setDeliveryRating] = useState(partnerName ? 5 : null);
  const [comment, setComment] = useState('');
  const [deliveryComment, setDeliveryComment] = useState('');
  const [selectedTags, setSelectedTags] = useState(['Hot & Fresh', 'Exceptional Flavor']);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [hasReviewed, setHasReviewed] = useState(false);
  const [existingReview, setExistingReview] = useState(null);

  const availableTags = [
    'Hot & Fresh',
    'Exceptional Flavor',
    'Perfect Temperature',
    'Artisanal Presentation',
    'Eco Packaging',
    'Courteous Courier'
  ];

  useEffect(() => {
    if (isOpen && orderId) {
      checkExistingReview();
    }
  }, [isOpen, orderId]);

  const checkExistingReview = async () => {
    try {
      const res = await api.get(`/reviews/order/${orderId}`);
      if (res.data?.hasReviewed) {
        setHasReviewed(true);
        setExistingReview(res.data.review);
      } else {
        setHasReviewed(false);
        setExistingReview(null);
      }
    } catch (e) {
      // Not yet reviewed
    }
  };

  if (!isOpen) return null;

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!restaurantRating || restaurantRating < 1 || restaurantRating > 5) {
      setErrorMsg('Please select a restaurant rating between 1 and 5 stars.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        orderId,
        restaurantRating: Number(restaurantRating),
        deliveryRating: partnerName && deliveryRating ? Number(deliveryRating) : undefined,
        comment: comment.trim(),
        deliveryComment: deliveryComment.trim(),
        tags: selectedTags
      };

      const res = await api.post('/reviews', payload);
      if (res.data.success) {
        setHasReviewed(true);
        setExistingReview(res.data.review);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-aubergine-900 text-ivory-50 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-citrus-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-base tracking-wide">
                Culinary & Courier Feedback
              </h2>
              <p className="text-xs text-stone-300">
                Order #{orderId?.slice(-6)?.toUpperCase()}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-stone-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {hasReviewed ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
              <h3 className="font-serif text-xl font-bold text-charcoal-900">
                Thank You for Your Feedback!
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                Your ratings help us maintain CRAVE's culinary standards and celebrate exceptional restaurant partners and couriers.
              </p>

              {existingReview && (
                <div className="mt-4 p-4 bg-ivory-100 rounded-2xl border border-ivory-300 text-left text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-charcoal-900">{restaurantName || 'Restaurant'}</span>
                    <span className="text-citrus-600 font-bold">★ {existingReview.restaurantRating || existingReview.rating} / 5</span>
                  </div>
                  {existingReview.deliveryRating && (
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-charcoal-900">{partnerName || 'Courier Partner'}</span>
                      <span className="text-citrus-600 font-bold">★ {existingReview.deliveryRating} / 5</span>
                    </div>
                  )}
                  {existingReview.comment && (
                    <p className="text-stone-600 italic pt-1 border-t border-ivory-300/80">
                      "{existingReview.comment}"
                    </p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="mt-4 px-6 py-2.5 rounded-full bg-citrus-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-citrus-500 transition-all"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. Restaurant Rating */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-citrus-600" />
                    <span className="text-xs font-bold text-charcoal-900">
                      Food & Kitchen: {restaurantName || 'Restaurant'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-citrus-600 font-mono">
                    {restaurantRating} / 5 Stars
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRestaurantRating(star)}
                      className="p-1 hover:scale-110 transition-transform focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= restaurantRating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-stone-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Share details about the flavor, temperature, or packaging..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full mt-2 px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs text-charcoal-900 focus:outline-none focus:border-citrus-500"
                />
              </div>

              {/* 2. Delivery Partner Rating (if courier was assigned) */}
              {partnerName && (
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bike className="w-4 h-4 text-citrus-600" />
                      <span className="text-xs font-bold text-charcoal-900">
                        Delivery Experience: {partnerName}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-citrus-600 font-mono">
                      {deliveryRating || 5} / 5 Stars
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setDeliveryRating(star)}
                        className="p-1 hover:scale-110 transition-transform focus:outline-none"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            star <= (deliveryRating || 5)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-stone-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Feedback on delivery speed, communication, or courier courtesy..."
                    value={deliveryComment}
                    onChange={(e) => setDeliveryComment(e.target.value)}
                    className="w-full mt-2 px-3 py-2 rounded-xl bg-white border border-stone-200 text-xs text-charcoal-900 focus:outline-none focus:border-citrus-500"
                  />
                </div>
              )}

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                  Quick Compliments
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-charcoal-900 text-white shadow-2xs font-semibold'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-2xl bg-citrus-600 hover:bg-citrus-500 disabled:bg-stone-300 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
              >
                {loading ? 'Submitting Review...' : 'Submit Verified Review'}
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
