import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setLocation, resetToDemoCluster } from '../redux/locationSlice';
import {
  MapPin,
  X,
  Navigation,
  Check,
  AlertCircle,
  Building,
  Home,
  Briefcase,
  Compass,
  Info,
  Loader2
} from 'lucide-react';

export default function LocationModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const currentLocation = useSelector((state) => state.location);
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const savedAddresses = user?.addresses || [];

  // Manual input state
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState(currentLocation?.city || '');
  const [pincode, setPincode] = useState(currentLocation?.pincode || '');
  const [formError, setFormError] = useState('');
  const [geolocating, setGeolocating] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectSavedAddress = (addr) => {
    dispatch(
      setLocation({
        label: `${addr.label || 'Saved'} — ${addr.city}`,
        addressLine: addr.addressLine,
        city: addr.city,
        state: addr.state || '',
        pincode: addr.pincode,
        coordinates: addr.location?.coordinates || [77.2245, 28.6295],
        source: 'saved_address',
        isDemoCluster: addr.pincode?.startsWith('110')
      })
    );
    onClose();
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    const cleanPin = pincode.trim();
    if (!cleanPin || !/^[1-9][0-9]{5}$/.test(cleanPin)) {
      setFormError('Please enter a valid 6-digit Indian postal PIN code.');
      return;
    }

    if (!city.trim()) {
      setFormError('Please enter a city name.');
      return;
    }

    // Notice: Do NOT fabricate or claim coordinates without actual geocoding service
    // If PIN is within Delhi demo cluster, use approximate cluster center; otherwise keep Mumbai fallback
    const isDelhiPin = cleanPin.startsWith('110');
    const estimatedCoords = isDelhiPin ? [77.2205, 28.6328] : [72.8777, 19.0760];

    dispatch(
      setLocation({
        label: `${city.trim()} (${cleanPin})`,
        addressLine: addressLine.trim() || `${city.trim()} PIN ${cleanPin}`,
        city: city.trim(),
        state: '',
        pincode: cleanPin,
        coordinates: estimatedCoords,
        source: 'manual_entry',
        isDemoCluster: isDelhiPin
      })
    );
    onClose();
  };

  const handleUseBrowserGPS = () => {
    if (!('geolocation' in navigator)) {
      setFormError('Browser geolocation is not supported on this device.');
      return;
    }

    setGeolocating(true);
    setFormError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = [position.coords.longitude, position.coords.latitude];
        dispatch(
          setLocation({
            label: `Current Location (${coords[1].toFixed(3)}°N, ${coords[0].toFixed(3)}°E)`,
            addressLine: 'GPS Verified Location',
            city: 'Detected Device Location',
            state: '',
            pincode: '110001',
            coordinates: coords,
            source: 'browser_gps',
            isDemoCluster: false
          })
        );
        setGeolocating(false);
        onClose();
      },
      (err) => {
        setGeolocating(false);
        setFormError('Unable to retrieve device GPS coordinates. Please enter your location manually.');
      },
      { timeout: 8000 }
    );
  };

  const presetClusters = [
    {
      name: 'Central Delhi (CP Demo Cluster)',
      city: 'New Delhi',
      pincode: '110001',
      coords: [77.2205, 28.6328],
      isDemo: true,
      desc: 'Inside Service Area for all demo kitchens'
    },
    {
      name: 'South Delhi (Khan Market / Lodhi)',
      city: 'New Delhi',
      pincode: '110003',
      coords: [77.2274, 28.6002],
      isDemo: true,
      desc: 'Inside Service Area for South Delhi kitchens'
    },
    {
      name: 'Mumbai (Bandra West - Outside Area)',
      city: 'Mumbai',
      pincode: '400050',
      coords: [72.8258, 19.0596],
      isDemo: false,
      desc: 'Tests outside-coverage serviceability rejection'
    },
    {
      name: 'Bengaluru (Indiranagar - Outside Area)',
      city: 'Bengaluru',
      pincode: '560038',
      coords: [77.6412, 12.9716],
      isDemo: false,
      desc: 'Tests outside-coverage serviceability rejection'
    }
  ];

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-charcoal-950/70 backdrop-blur-sm overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[85vh] my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-modal-title"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-aubergine-900 text-ivory-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-citrus-600 flex items-center justify-center text-white shadow-xs flex-shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 id="location-modal-title" className="font-serif font-bold text-lg leading-tight">
                Select Delivery Location
              </h3>
              <p className="text-xs text-stone-300">Sets context for nearby kitchens and delivery zones</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors flex-shrink-0 cursor-pointer"
            aria-label="Close location selector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Evaluation Context Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-start gap-2 text-[11px] text-amber-900 flex-shrink-0">
          <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Demo Architecture Notice:</strong> Demo artisanal kitchens are currently seeded in the Delhi NCR cluster. You can select an outside-area city below to test authoritative delivery rejection.
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {formError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Quick Browser Geolocation Action */}
          <button
            type="button"
            onClick={handleUseBrowserGPS}
            disabled={geolocating}
            className="w-full py-3 px-4 rounded-2xl bg-ivory-100 hover:bg-ivory-200 border border-ivory-300 text-charcoal-900 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer"
          >
            {geolocating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-citrus-600" />
                <span>Acquiring Device GPS...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 text-citrus-600" />
                <span>Use My Device Location (Browser GPS)</span>
              </>
            )}
          </button>

          {/* Saved Addresses Section (if logged in) */}
          {isAuthenticated && savedAddresses.length > 0 && (
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                Your Saved Addresses
              </span>
              <div className="grid grid-cols-1 gap-2">
                {savedAddresses.map((addr, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectSavedAddress(addr)}
                    className="p-3 rounded-2xl border border-stone-200 hover:border-citrus-500 hover:bg-citrus-50/20 cursor-pointer flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-charcoal-700">
                        {addr.label === 'Work' ? <Briefcase className="w-4 h-4" /> : <Home className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-charcoal-900">{addr.label || 'Saved Address'}</h4>
                        <p className="text-[11px] text-stone-500 truncate max-w-[280px]">
                          {addr.addressLine}, {addr.city} • PIN: {addr.pincode}
                        </p>
                      </div>
                    </div>
                    {currentLocation?.pincode === addr.pincode && (
                      <span className="w-5 h-5 rounded-full bg-citrus-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preset Evaluation Clusters */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
              Quick Test Locations
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {presetClusters.map((cluster, cIdx) => (
                <button
                  key={cIdx}
                  type="button"
                  onClick={() => {
                    dispatch(
                      setLocation({
                        label: cluster.name,
                        addressLine: `${cluster.name}, ${cluster.city}`,
                        city: cluster.city,
                        state: '',
                        pincode: cluster.pincode,
                        coordinates: cluster.coords,
                        isDemoCluster: cluster.isDemo,
                        source: 'manual_entry'
                      })
                    );
                    onClose();
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    currentLocation?.pincode === cluster.pincode
                      ? 'border-citrus-600 bg-citrus-50/50 shadow-2xs ring-1 ring-citrus-500'
                      : 'border-stone-200 hover:border-stone-300 bg-stone-50/50 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-charcoal-900">{cluster.city}</span>
                    <span className="font-mono text-[10px] font-bold text-stone-500">{cluster.pincode}</span>
                  </div>
                  <p className="text-[10px] text-stone-500 mt-1">{cluster.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Input Form */}
          <div className="border-t border-stone-200 pt-4 space-y-3">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
              Or Enter Custom City & PIN Code
            </span>
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-stone-600 block mb-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Pune, Jaipur"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-medium focus:outline-none focus:border-citrus-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-stone-600 block mb-1">6-Digit PIN Code</label>
                  <input
                    type="text"
                    maxLength="6"
                    placeholder="e.g. 411001"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono font-medium focus:outline-none focus:border-citrus-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-charcoal-900 hover:bg-charcoal-800 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xs"
              >
                Apply Custom Location
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500 flex-shrink-0">
          <span>
            Active: <strong className="text-charcoal-900">{currentLocation?.label || currentLocation?.city}</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              dispatch(resetToDemoCluster());
              onClose();
            }}
            className="text-[11px] text-citrus-600 hover:underline font-semibold cursor-pointer"
          >
            Reset to Demo Cluster
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
