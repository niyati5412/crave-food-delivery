import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Tag, Sparkles, Copy, Check } from 'lucide-react';

export default function OffersPage() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/offers');
      if (res.data.success) {
        setOffers(res.data.offers);
      }
    } catch (err) {
      console.error('Failed to load offers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      <div>
        <span className="text-xs font-bold text-citrus-600 uppercase tracking-widest">
          Culinary Privileges
        </span>
        <h1 className="font-serif text-3xl font-bold text-charcoal-900 mt-1">
          Exclusive Gourmet Offers
        </h1>
        <p className="text-xs text-stone-500">
          Apply promotional coupon codes during checkout to enjoy artisanal gastronomy at privileged pricing.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[1, 2].map(n => <div key={n} className="h-44 bg-stone-200 rounded-3xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {offers.map((offer) => (
            <div
              key={offer._id}
              className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-citrus-100 text-citrus-800 text-[10px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  {offer.discountPercentage}% OFF
                </div>

                <h3 className="font-serif text-xl font-bold text-charcoal-900">
                  {offer.title}
                </h3>

                <p className="text-xs text-stone-600 leading-relaxed">
                  {offer.description}
                </p>

                <p className="text-[11px] text-stone-400">
                  Valid on orders above ₹{offer.minOrderAmount} • Max discount ₹{offer.maxDiscount}
                </p>
              </div>

              {/* Coupon Code Pill & Copy Button */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <div className="px-3.5 py-1.5 rounded-xl bg-ivory-200 border border-ivory-300 font-mono text-xs font-bold text-charcoal-900 tracking-wider">
                  {offer.code}
                </div>

                <button
                  onClick={() => handleCopy(offer.code)}
                  className="px-4 py-1.5 rounded-xl bg-charcoal-900 hover:bg-stone-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                >
                  {copiedCode === offer.code ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
