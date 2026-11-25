import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setCartState } from '../redux/cartSlice';
import api from '../services/api';
import {
  Sparkles,
  Lock,
  Unlock,
  Dices,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  Eye,
  EyeOff,
  Flame,
  Utensils,
  RefreshCw,
  Gift,
  Award
} from 'lucide-react';

const DIET_OPTIONS = [
  { id: 'pure_veg', label: '🥗 Pure Vegetarian', desc: '100% Plant & Dairy Based' },
  { id: 'all', label: '🥩 Chef\'s Mixed (Non-Veg)', desc: 'Artisanal Meats & Seafood' },
  { id: 'vegan', label: '🌱 100% Vegan Only', desc: 'Zero Dairy, Meat or Honey' }
];

const TIERS = [
  {
    id: 'discovery',
    name: 'Bistro Discovery Vault',
    price: 599,
    valueNote: 'Worth ~₹850',
    savings: 'Save ~30%',
    desc: '1 Artisan Main + 1 Secret Dessert or Savory Side'
  },
  {
    id: 'masterchef',
    name: 'Masterchef Tasting Platter',
    price: 999,
    valueNote: 'Worth ~₹1,450',
    savings: 'Save ~32%',
    desc: '1 Signature Main + 1 Hot Starter + 1 Craft Cooler + 1 Dessert',
    isPopular: true
  },
  {
    id: 'omakase',
    name: 'Grand Michelin Omakase',
    price: 1499,
    valueNote: 'Worth ~₹2,250',
    savings: 'Save ~35%',
    desc: 'Multi-Course Luxury Feast (2 Mains + 2 Starters + Cooler + Dessert)'
  }
];

export default function MysteryBoxPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [diet, setDiet] = useState('pure_veg');
  const [selectedTier, setSelectedTier] = useState('masterchef');
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinStep, setSpinStep] = useState(0);
  const [mysteryData, setMysteryData] = useState(null);
  const [revealSecrets, setRevealSecrets] = useState(false);

  // Auto-generate initial mystery vault on first render
  useEffect(() => {
    generateVault(diet, selectedTier, false);
  }, []);

  const generateVault = async (dietPref, tierId, withAnimation = true) => {
    try {
      if (withAnimation) {
        setIsSpinning(true);
        setSpinStep(1);
        setTimeout(() => setSpinStep(2), 600);
        setTimeout(() => setSpinStep(3), 1200);
      }

      const res = await api.post('/mystery/generate', {
        dietPreference: dietPref,
        budgetTier: tierId
      });

      if (withAnimation) {
        setTimeout(() => {
          if (res.data?.success) {
            setMysteryData(res.data.mysteryVault);
          }
          setIsSpinning(false);
          setRevealSecrets(false);
        }, 1800);
      } else {
        if (res.data?.success) {
          setMysteryData(res.data.mysteryVault);
        }
      }
    } catch (err) {
      console.error('Mystery Box generation error:', err);
      setIsSpinning(false);
    }
  };

  const handleSpinRoulette = () => {
    generateVault(diet, selectedTier, true);
  };

  const handleCheckoutMysteryVault = () => {
    if (!mysteryData || !mysteryData.secretDishes || mysteryData.secretDishes.length === 0) return;

    const restaurant = mysteryData.restaurant;
    const tier = mysteryData.tier;

    // Apply mystery tier flat pricing across items
    const totalOriginal = mysteryData.secretDishes.reduce((sum, d) => sum + d.price, 0);
    const scaleFactor = tier.price / Math.max(1, totalOriginal);

    const standardItems = mysteryData.secretDishes.map(d => ({
      menuItemId: d._id,
      name: `🎁 [Mystery Vault] ${d.name}`,
      price: Math.round(d.price * scaleFactor),
      isVeg: d.isVeg,
      quantity: 1,
      selectedAddOns: [],
      itemTotal: Math.round(d.price * scaleFactor)
    }));

    dispatch(setCartState({
      restaurant: {
        _id: restaurant._id,
        name: restaurant.name,
        images: { cover: restaurant.image }
      },
      items: standardItems,
      deliveryNotes: `[Chef's Mystery Tasting Vault: ${tier.name}] - Clues: ${mysteryData.clues.map(c => c.slot).join(', ')}`
    }));

    navigate('/checkout');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-charcoal-950 via-aubergine-950 to-charcoal-900 border border-amber-500/30 p-8 sm:p-12 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Decision-Free Haute Dining
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl font-black text-white leading-tight">
            Chef’s Culinary Roulette & Mystery Tasting Vault
          </h1>

          <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
            Tired of scrolling menus for 30 minutes? Set your dietary lifestyle and budget tier, spin the roulette vault, and let our Michelin-pedigree chefs hand-select a surprise gourmet feast with a <strong className="text-amber-300">guaranteed 30%+ privilege discount</strong>.
          </p>
        </div>
      </div>

      {/* Step 1: Interactive Settings (Diet + Tier) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Roulette Controllers */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-6">
            
            {/* Diet Preference */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                1. Dietary Guard
              </label>
              <div className="space-y-2">
                {DIET_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setDiet(opt.id);
                      generateVault(opt.id, selectedTier, false);
                    }}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      diet === opt.id
                        ? 'bg-amber-50/70 border-amber-500 text-charcoal-900 ring-1 ring-amber-500'
                        : 'bg-stone-50/60 border-stone-200 text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{opt.label}</div>
                      <div className="text-[10px] text-stone-500 mt-0.5">{opt.desc}</div>
                    </div>
                    {diet === opt.id && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget Tier Selector */}
            <div className="space-y-3 pt-4 border-t border-stone-100">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                2. Select Tasting Vault Tier
              </label>
              <div className="space-y-2.5">
                {TIERS.map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => {
                      setSelectedTier(tier.id);
                      generateVault(diet, tier.id, false);
                    }}
                    className={`w-full p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${
                      selectedTier === tier.id
                        ? 'bg-charcoal-900 border-charcoal-900 text-white shadow-md'
                        : 'bg-white border-stone-200 text-charcoal-900 hover:border-amber-400'
                    }`}
                  >
                    {tier.isPopular && (
                      <span className="absolute top-2.5 right-3 px-2 py-0.5 rounded-full bg-amber-500 text-charcoal-950 text-[9px] font-black uppercase tracking-wider">
                        Most Popular
                      </span>
                    )}
                    <div className="flex items-center justify-between pr-14">
                      <h4 className="font-serif font-bold text-sm">{tier.name}</h4>
                      <span className="font-mono font-bold text-base text-amber-400">₹{tier.price}</span>
                    </div>
                    <p className={`text-[11px] mt-1 ${selectedTier === tier.id ? 'text-stone-300' : 'text-stone-500'}`}>
                      {tier.desc}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-[10px] font-bold">
                      <span className={selectedTier === tier.id ? 'text-amber-300' : 'text-citrus-600'}>
                        {tier.valueNote}
                      </span>
                      <span className="text-stone-400">•</span>
                      <span className="text-emerald-500">{tier.savings}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Roulette Trigger Button */}
            <button
              type="button"
              onClick={handleSpinRoulette}
              disabled={isSpinning}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-citrus-500 to-amber-600 hover:from-amber-400 hover:to-citrus-400 text-charcoal-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <Dices className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>{isSpinning ? 'Spinning Culinary Roulette...' : 'Spin Roulette & Reshuffle Vault'}</span>
            </button>

          </div>
        </div>

        {/* Right Column: The Unlocked Mystery Tasting Vault */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
            
            {/* Spinning Animation Overlay */}
            {isSpinning ? (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-400 flex items-center justify-center text-amber-600 animate-bounce">
                  <Gift className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-xl text-charcoal-900">
                    {spinStep === 1 && 'Shuffling Michelin Reserve Kitchens...'}
                    {spinStep === 2 && 'Balancing Palate & Flavor Harmony...'}
                    {spinStep === 3 && 'Sealing Cryptic Chef Tasting Clues...'}
                  </h3>
                  <p className="text-xs text-stone-500">Unlocking your surprise artisanal feast</p>
                </div>
              </div>
            ) : mysteryData ? (
              <>
                {/* Vault Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono text-[10px] font-bold">
                        {mysteryData.vaultId}
                      </span>
                      <span className="text-xs text-stone-500">
                        Curated by <strong className="text-charcoal-900">{mysteryData.restaurant.name}</strong>
                      </span>
                    </div>
                    <h3 className="font-serif font-bold text-2xl text-charcoal-900">
                      {mysteryData.tier.name}
                    </h3>
                  </div>

                  {/* Sneak Peek Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setRevealSecrets(!revealSecrets)}
                    className="self-start sm:self-center px-3.5 py-2 rounded-xl border border-stone-200 hover:border-stone-300 text-stone-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                  >
                    {revealSecrets ? (
                      <>
                        <EyeOff className="w-4 h-4 text-citrus-600" />
                        <span>Hide Secret Dishes</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 text-citrus-600" />
                        <span>Sneak Peek Dishes</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Secret Tasting Clues or Revealed Dishes */}
                <div className="space-y-4">
                  {revealSecrets ? (
                    // Revealed Secret Dishes
                    <div className="space-y-3">
                      <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/80 text-xs text-amber-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span><strong>Chef’s Secret Revealed:</strong> Here are the exact artisan courses curated inside your mystery vault:</span>
                      </div>

                      {mysteryData.secretDishes.map((dish, idx) => (
                        <div
                          key={dish._id}
                          className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/60 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-stone-200 text-charcoal-800 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${dish.isVeg ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                <h4 className="font-bold text-charcoal-900 text-sm">{dish.name}</h4>
                              </div>
                              <p className="text-[11px] text-stone-500">{dish.category}</p>
                            </div>
                          </div>
                          <span className="font-mono text-xs font-bold text-citrus-600 flex-shrink-0">
                            ₹{dish.price}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Cryptic Mystery Clues
                    <div className="space-y-3">
                      <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs text-stone-600 flex items-center justify-between">
                        <span className="flex items-center gap-2 font-bold text-charcoal-900">
                          <Lock className="w-4 h-4 text-amber-600" />
                          Cryptic Chef Clues (Sealed Vault)
                        </span>
                        <span className="text-[10px] text-stone-400 uppercase tracking-wider">
                          Unboxes on delivery
                        </span>
                      </div>

                      {mysteryData.clues.map((clue, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl border border-stone-200 bg-white hover:border-amber-400 transition-all space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 font-mono">
                              {clue.slot}
                            </span>
                            <span className="text-[10px] text-stone-400 font-medium">
                              Category: {clue.categoryHint}
                            </span>
                          </div>
                          <p className="text-xs text-charcoal-900 italic font-serif">
                            "{clue.clue}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Price & Guaranteed Savings Banner */}
                <div className="pt-6 border-t border-stone-200 space-y-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-citrus-500/10 to-amber-500/10 border border-amber-300 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                        Guaranteed Vault Value
                      </span>
                      <span className="font-mono text-sm text-stone-400 line-through">
                        ₹{mysteryData.tier.guaranteedValue}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block mb-0.5">
                        Saved ₹{mysteryData.tier.savingsAmount} ({mysteryData.tier.savingsPercent}% OFF)
                      </span>
                      <div className="font-mono text-2xl font-black text-citrus-600">
                        ₹{mysteryData.tier.price}
                      </div>
                    </div>
                  </div>

                  {/* 1-Click Vault Checkout */}
                  <button
                    type="button"
                    onClick={handleCheckoutMysteryVault}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-citrus-600 via-amber-600 to-citrus-700 hover:from-citrus-500 hover:to-amber-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Claim Mystery Vault & Proceed to Checkout</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-400/40 flex items-center justify-center text-amber-600">
                  <Gift className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-lg text-charcoal-900">
                    Vault Ready to Unveil
                  </h3>
                  <p className="text-xs text-stone-500 max-w-sm">
                    Select your preferred dietary guard and budget tier on the left, then spin the roulette to generate your curated mystery tasting feast.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSpinRoulette}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-citrus-500 text-charcoal-950 font-bold text-xs uppercase tracking-wider hover:from-amber-400 hover:to-citrus-400 transition-all cursor-pointer shadow-md"
                >
                  Spin Roulette & Unlock Vault
                </button>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
