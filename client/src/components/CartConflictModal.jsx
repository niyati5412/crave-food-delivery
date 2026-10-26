import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { confirmReplaceCart, cancelReplaceCart } from '../redux/cartSlice';
import { AlertCircle, Trash2, ArrowRight } from 'lucide-react';

export default function CartConflictModal() {
  const { conflictModalOpen, restaurant, pendingItem } = useSelector((state) => state.cart);
  const dispatch = useDispatch();

  if (!conflictModalOpen || !pendingItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-inner">
          <AlertCircle className="w-8 h-8" />
        </div>

        <h3 className="font-serif text-2xl font-bold text-charcoal-900">
          Start a New Basket?
        </h3>

        <p className="text-xs text-stone-600 leading-relaxed">
          Your current order contains items from{' '}
          <strong className="text-charcoal-900">{restaurant?.name || 'another restaurant'}</strong>.
          To ensure peak culinary quality and single-courier delivery, CRAVE enforces one kitchen per order.
        </p>

        <p className="text-xs font-semibold text-citrus-600">
          Switch order to {pendingItem?.restaurant?.name}?
        </p>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => dispatch(cancelReplaceCart())}
            className="flex-1 py-3 px-4 rounded-xl border border-stone-300 font-semibold text-xs text-stone-700 hover:bg-stone-50 transition-colors"
          >
            Keep Existing
          </button>
          <button
            onClick={() => dispatch(confirmReplaceCart())}
            className="flex-1 py-3 px-4 rounded-xl bg-citrus-600 hover:bg-citrus-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear & Replace
          </button>
        </div>
      </div>
    </div>
  );
}
