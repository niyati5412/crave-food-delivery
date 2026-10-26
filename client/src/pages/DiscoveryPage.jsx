import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../services/api';
import RestaurantCard from '../components/RestaurantCard';
import {
  Compass,
  MapPin,
  SlidersHorizontal,
  Search,
  Filter,
  Star,
  Leaf,
  Navigation,
  RefreshCw
} from 'lucide-react';

export default function DiscoveryPage() {
  const { user } = useSelector((state) => state.auth);
  const activeLocation = useSelector((state) => state.location);
  const [searchParams, setSearchParams] = useSearchParams();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cuisinesList, setCuisinesList] = useState(['All Cuisines']);

  // Filters state
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCuisine, setSelectedCuisine] = useState(searchParams.get('cuisine') || '');
  const [radiusKm, setRadiusKm] = useState(15);
  const [isPureVeg, setIsPureVeg] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [sortOption, setSortOption] = useState('rating');
  
  // Dynamic user coordinates from activeLocation Redux state or user's saved address in DB
  const effectiveCoords = activeLocation?.coordinates || user?.addresses?.[0]?.location?.coordinates || [77.2205, 28.6328];
  const [userCoords, setUserCoords] = useState(effectiveCoords);
  const [isGeolocating, setIsGeolocating] = useState(false);

  useEffect(() => {
    if (activeLocation?.coordinates) {
      setUserCoords(activeLocation.coordinates);
    }
  }, [activeLocation]);

  useEffect(() => {
    fetchCuisines();
  }, []);

  const fetchCuisines = async () => {
    try {
      const res = await api.get('/restaurants/cuisines');
      if (res.data.success && res.data.cuisines) {
        setCuisinesList(['All Cuisines', ...res.data.cuisines]);
      }
    } catch (err) {
      console.warn('Could not fetch dynamic cuisines:', err);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [selectedCuisine, radiusKm, isPureVeg, minRating, sortOption, userCoords]);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);

      // If userCoords is set, invoke MongoDB 2dsphere $near geospatial discovery
      let url = `/restaurants/nearby?lat=${userCoords[1]}&lng=${userCoords[0]}&radius=${radiusKm}`;

      if (selectedCuisine && selectedCuisine !== 'All Cuisines') {
        url += `&cuisine=${encodeURIComponent(selectedCuisine)}`;
      }
      if (isPureVeg) {
        url += `&isVeg=true`;
      }
      if (minRating > 0) {
        url += `&rating=${minRating}`;
      }
      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }

      const res = await api.get(url);
      if (res.data.success) {
        let results = res.data.data;

        // Apply sort
        if (sortOption === 'deliveryTime') {
          results.sort((a, b) => (a.estimatedDeliveryMins || 0) - (b.estimatedDeliveryMins || 0));
        } else if (sortOption === 'priceLow') {
          results.sort((a, b) => a.priceForTwo - b.priceForTwo);
        } else if (sortOption === 'priceHigh') {
          results.sort((a, b) => b.priceForTwo - a.priceForTwo);
        } else {
          results.sort((a, b) => b.rating - a.rating);
        }

        setRestaurants(results);
      }
    } catch (err) {
      console.error('Failed to fetch nearby restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if ('geolocation' in navigator) {
      setIsGeolocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords([position.coords.longitude, position.coords.latitude]);
          setIsGeolocating(false);
        },
        (error) => {
          console.warn('Geolocation failed or denied, using demo central coordinates:', error);
          setUserCoords([77.2205, 28.6328]);
          setIsGeolocating(false);
        }
      );
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRestaurants();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header & Geospatial Controller */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-citrus-600 uppercase tracking-widest">
              <Compass className="w-4 h-4" />
              Geospatial Engine (MongoDB 2dsphere)
            </div>
            <h1 className="font-serif text-3xl font-bold text-charcoal-900 mt-1">
              Discover Artisanal Kitchens Nearby
            </h1>
          </div>

          {/* Location Trigger */}
          <button
            onClick={handleGetCurrentLocation}
            disabled={isGeolocating}
            className="self-start md:self-auto px-4 py-2.5 rounded-full bg-ivory-100 hover:bg-ivory-200 border border-ivory-300 text-xs font-bold text-charcoal-900 flex items-center gap-2 transition-all shadow-xs"
          >
            <Navigation className={`w-3.5 h-3.5 text-citrus-600 ${isGeolocating ? 'animate-spin' : ''}`} />
            {isGeolocating ? 'Detecting GPS...' : 'Use Precise GPS Location'}
          </button>
        </div>

        {/* Active Location Telemetry Banner */}
        <div className={`p-3 rounded-2xl flex items-center justify-between text-xs ${
          activeLocation?.isDemoCluster
            ? 'bg-amber-50/80 border border-amber-200/80 text-amber-900'
            : 'bg-blue-50/80 border border-blue-200/80 text-blue-900'
        }`}>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-citrus-600 flex-shrink-0" />
            <span>
              <strong>Active Proximity Center:</strong> {activeLocation?.label || activeLocation?.city || 'New Delhi'}
              {userCoords && ` (${userCoords[1].toFixed(3)}°N, ${userCoords[0].toFixed(3)}°E)`}
              {activeLocation?.isDemoCluster && ' — Demo Kitchen Cluster'}
            </span>
          </div>
          <span className="text-[11px] text-stone-500 hidden sm:inline">
            Tap top-bar location to switch city/PIN
          </span>
        </div>

        {/* Search & Radius Controller */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 border-t border-stone-100 items-center">
          
          {/* Keyword Search */}
          <form onSubmit={handleSearchSubmit} className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search kitchen or dish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-charcoal-900 placeholder-stone-400 focus:outline-none focus:border-citrus-500"
            />
          </form>

          {/* Search Radius Slider ($near query bound) */}
          <div className="md:col-span-4 bg-stone-50 px-4 py-2 rounded-2xl border border-stone-200 flex flex-col justify-center">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-600 mb-1">
              <span>Delivery Radius</span>
              <span className="text-citrus-600 font-bold">{radiusKm} km</span>
            </div>
            <input
              type="range"
              min="2"
              max="25"
              step="1"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full accent-citrus-600 h-1.5 bg-stone-200 rounded-lg cursor-pointer"
            />
          </div>

          {/* Sort Selector */}
          <div className="md:col-span-3">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="w-full py-2.5 px-3 rounded-2xl bg-stone-50 border border-stone-200 text-xs font-semibold text-charcoal-900 focus:outline-none focus:border-citrus-500"
            >
              <option value="rating">Top Rated First</option>
              <option value="deliveryTime">Fastest Delivery (ETA)</option>
              <option value="priceLow">Price: Low to High</option>
              <option value="priceHigh">Price: High to Low</option>
            </select>
          </div>

        </div>

        {/* Cuisine Filter Pills & Veg Toggle */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {cuisinesList.map((c, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedCuisine(c === 'All Cuisines' ? '' : c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                (selectedCuisine === c || (!selectedCuisine && c === 'All Cuisines'))
                  ? 'bg-charcoal-900 text-white shadow-xs'
                  : 'bg-ivory-100 hover:bg-ivory-200 text-stone-700 border border-ivory-300'
              }`}
            >
              {c}
            </button>
          ))}

          {/* Pure Veg Toggle */}
          <button
            onClick={() => setIsPureVeg(!isPureVeg)}
            className={`ml-auto px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
              isPureVeg
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <Leaf className="w-3.5 h-3.5" />
            Pure Vegetarian
          </button>
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-stone-500 font-medium px-1">
        <span>
          Showing <strong className="text-charcoal-900 font-bold">{restaurants.length}</strong> artisanal kitchens within {radiusKm} km of your location
        </span>
        <button
          onClick={fetchRestaurants}
          className="flex items-center gap-1 text-citrus-600 hover:text-citrus-700 font-bold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Restaurant Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white rounded-3xl h-84 animate-pulse border border-stone-200" />
          ))}
        </div>
      ) : restaurants.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 p-8 space-y-4">
          <Compass className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="font-serif text-xl font-bold text-charcoal-900">
            No kitchens found in this location radius
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
            {activeLocation && !activeLocation.isDemoCluster
              ? `Your active location is currently set to ${activeLocation.city || activeLocation.label}. CRAVE's demo kitchens are currently clustered in Delhi NCR. Try switching back to the demo cluster or expanding your search radius.`
              : 'Try expanding your delivery radius slider or clearing specific cuisine filters to explore more culinary selections.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setSelectedCuisine('');
                setRadiusKm(25);
                setIsPureVeg(false);
                setSearch('');
              }}
              className="px-4 py-2 rounded-full bg-stone-100 text-charcoal-900 text-xs font-bold hover:bg-stone-200 transition-colors"
            >
              Expand Radius (25km)
            </button>
            <button
              onClick={() => {
                setUserCoords([77.2205, 28.6328]);
                setRadiusKm(15);
                setSelectedCuisine('');
                setSearch('');
              }}
              className="px-4 py-2 rounded-full bg-citrus-600 text-white text-xs font-bold hover:bg-citrus-500 transition-colors"
            >
              Reset to Delhi Demo Cluster
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((restaurant) => (
            <RestaurantCard key={restaurant._id} restaurant={restaurant} />
          ))}
        </div>
      )}

    </div>
  );
}
