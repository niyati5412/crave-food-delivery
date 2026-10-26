import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, MapPin, Award, Leaf } from 'lucide-react';

export default function RestaurantCard({ restaurant }) {
  const {
    _id,
    name,
    tagline,
    cuisines,
    images,
    rating,
    totalRatings,
    prepTimeMins,
    priceForTwo,
    distanceKm,
    featuredBadge,
    isPureVeg,
    isOpen
  } = restaurant;

  return (
    <Link
      to={`/restaurants/${_id}`}
      className="group relative flex flex-col bg-white rounded-3xl overflow-hidden border border-stone-200/80 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-stone-100">
        <img
          src={images?.cover || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'}
          alt={name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          {featuredBadge && (
            <span className="px-2.5 py-1 rounded-full bg-aubergine-900/90 backdrop-blur-md text-ivory-50 text-[11px] font-semibold tracking-wider flex items-center gap-1 shadow-sm">
              <Award className="w-3 h-3 text-citrus-400" />
              {featuredBadge}
            </span>
          )}
          {isPureVeg && (
            <span className="px-2.5 py-1 rounded-full bg-emerald-800/90 backdrop-blur-md text-emerald-100 text-[11px] font-semibold flex items-center gap-1 shadow-sm">
              <Leaf className="w-3 h-3 text-emerald-300" />
              Pure Veg
            </span>
          )}
        </div>

        {/* Rating Floating Badge */}
        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-xl bg-white/95 backdrop-blur-md text-charcoal-900 text-xs font-bold flex items-center gap-1 shadow-md">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
          <span>{rating?.toFixed(1) || '4.5'}</span>
          <span className="text-stone-400 text-[10px] font-normal">({totalRatings || 100}+)</span>
        </div>

        {/* Closed Overlay */}
        {!isOpen && (
          <div className="absolute inset-0 bg-charcoal-900/80 backdrop-blur-sm flex items-center justify-center">
            <span className="px-4 py-1.5 rounded-full bg-red-600 text-white text-xs font-bold uppercase tracking-wider">
              Currently Closed
            </span>
          </div>
        )}
      </div>

      {/* Restaurant Content */}
      <div className="p-5 flex flex-col flex-grow justify-between">
        <div>
          <h3 className="font-serif text-xl font-bold text-charcoal-900 group-hover:text-citrus-600 transition-colors line-clamp-1">
            {name}
          </h3>
          <p className="text-xs text-stone-500 mt-1 line-clamp-1 italic">
            {tagline}
          </p>

          {/* Cuisines */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {cuisines?.slice(0, 3).map((cuisine, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-ivory-200 text-stone-700 text-[11px] font-medium"
              >
                {cuisine}
              </span>
            ))}
          </div>
        </div>

        {/* Info Footer */}
        <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600 font-medium">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              {prepTimeMins || 25} mins
            </span>
            {distanceKm !== undefined && (
              <span className="flex items-center gap-1 text-citrus-600 font-semibold">
                <MapPin className="w-3.5 h-3.5" />
                {distanceKm} km
              </span>
            )}
          </div>

          <span className="text-charcoal-900 font-bold">
            ₹{priceForTwo} for two
          </span>
        </div>
      </div>
    </Link>
  );
}
