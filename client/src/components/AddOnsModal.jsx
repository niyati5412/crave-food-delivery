import React, { useState } from 'react';
import { X, Plus, Minus, Check } from 'lucide-react';

export default function AddOnsModal({ item, restaurant, isOpen, onClose, onAddToCart }) {
  if (!isOpen || !item) return null;

  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [quantity, setQuantity] = useState(1);

  const toggleAddOn = (addOn) => {
    const exists = selectedAddOns.find(a => a.name === addOn.name);
    if (exists) {
      setSelectedAddOns(selectedAddOns.filter(a => a.name !== addOn.name));
    } else {
      setSelectedAddOns([...selectedAddOns, addOn]);
    }
  };

  const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0);
  const totalPrice = (item.price + addOnsTotal) * quantity;

  const handleConfirm = () => {
    onAddToCart({
      restaurant,
      item,
      quantity,
      selectedAddOns
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-stone-100 flex flex-col max-h-[90vh]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 backdrop-blur-md text-stone-700 hover:bg-stone-100 transition-colors shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Image */}
        <div className="relative aspect-[16/9] w-full bg-stone-100 overflow-hidden">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1 ${
              item.isVeg ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            }`}>
              {item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
            </span>
            <h3 className="font-serif text-2xl font-bold leading-tight">{item.name}</h3>
            <p className="text-sm font-semibold text-citrus-400 mt-0.5">₹{item.price}</p>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-grow">
          <p className="text-xs text-stone-600 leading-relaxed">
            {item.description}
          </p>

          {/* Add-ons Section */}
          {item.addOns && item.addOns.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-stone-100 pb-2">
                <h4 className="text-sm font-bold text-charcoal-900 uppercase tracking-wider">
                  Personalize Your Selection
                </h4>
                <span className="text-[11px] text-stone-400">Optional</span>
              </div>

              <div className="space-y-2.5">
                {item.addOns.map((addOn, idx) => {
                  const isChecked = !!selectedAddOns.find(a => a.name === addOn.name);
                  return (
                    <label
                      key={idx}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                        isChecked
                          ? 'border-citrus-500 bg-citrus-50/50'
                          : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                            isChecked
                              ? 'bg-citrus-600 border-citrus-600 text-white'
                              : 'border-stone-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className="text-sm font-medium text-charcoal-900">
                          {addOn.name}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-stone-700">
                        +₹{addOn.price}
                      </span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleAddOn(addOn)}
                        className="sr-only"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity Controls */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm font-bold text-charcoal-900">Quantity</span>
            <div className="flex items-center gap-3 bg-ivory-200 rounded-full px-3 py-1.5 border border-ivory-300">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-7 h-7 rounded-full bg-white text-charcoal-900 flex items-center justify-center shadow-xs hover:bg-stone-100 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-sm font-bold w-4 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-7 h-7 rounded-full bg-white text-charcoal-900 flex items-center justify-center shadow-xs hover:bg-stone-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="p-4 bg-stone-50 border-t border-stone-100">
          <button
            onClick={handleConfirm}
            className="w-full py-3.5 px-6 rounded-2xl bg-citrus-600 hover:bg-citrus-500 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-between"
          >
            <span>Add Item to Order</span>
            <span>₹{totalPrice}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
