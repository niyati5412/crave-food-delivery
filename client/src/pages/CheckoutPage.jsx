import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { clearCart } from '../redux/cartSlice';
import api from '../services/api';
import PaymentGatewayModal from '../components/PaymentGatewayModal';
import {
  MapPin,
  CreditCard,
  Banknote,
  ShieldCheck,
  Check,
  Plus,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lock,
  Loader2,
  Navigation,
  Compass
} from 'lucide-react';
import { setLocation } from '../redux/locationSlice';

export default function CheckoutPage() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { restaurant, items, offerCode, discount } = useSelector((state) => state.cart);
  const activeLocation = useSelector((state) => state.location);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Saved Addresses directly from authenticated database user profile
  const savedAddresses = user?.addresses || [];
  const hasSavedAddresses = savedAddresses.length > 0;

  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
  const [paymentMode, setPaymentMode] = useState('ONLINE'); // Default to ONLINE to showcase the payment gateway
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState('');

  // Custom new address toggle - defaulted to true if user has no saved addresses in DB
  const [showNewAddressForm, setShowNewAddressForm] = useState(!hasSavedAddresses);
  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    addressLine: activeLocation?.addressLine || activeLocation?.label || '',
    city: activeLocation?.city || 'New Delhi',
    pincode: activeLocation?.pincode || '',
    contactPhone: user?.phone || ''
  });

  // Automatically keep delivery address synchronized with active location unless user types custom values
  useEffect(() => {
    if (activeLocation?.pincode) {
      setNewAddress(prev => ({
        ...prev,
        pincode: prev.pincode || activeLocation.pincode,
        city: prev.city || activeLocation.city || 'New Delhi',
        addressLine: prev.addressLine || activeLocation.addressLine || activeLocation.label || '',
        contactPhone: prev.contactPhone || user?.phone || ''
      }));
    }
  }, [activeLocation, user?.phone]);

  const handleDetectCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setErrorMessage('Browser geolocation is not supported on this device. Please enter your PIN code manually.');
      return;
    }

    setDetectingLocation(true);
    setErrorMessage('');
    setLocationSuccessMsg('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = [position.coords.longitude, position.coords.latitude];
        // Proximity detection for Delhi cluster or active location
        const isNearDelhi = Math.abs(coords[1] - 28.6) < 1.0 && Math.abs(coords[0] - 77.2) < 1.0;
        const targetPin = isNearDelhi ? (activeLocation?.pincode || '110001') : (activeLocation?.pincode || '110001');
        const targetCity = isNearDelhi ? 'New Delhi' : (activeLocation?.city || 'New Delhi');
        const targetAddress = `Current GPS Location (${coords[1].toFixed(4)}°N, ${coords[0].toFixed(4)}°E)`;

        dispatch(
          setLocation({
            label: `Live GPS (${coords[1].toFixed(3)}°N, ${coords[0].toFixed(3)}°E)`,
            addressLine: targetAddress,
            city: targetCity,
            pincode: targetPin,
            coordinates: coords,
            source: 'browser_gps',
            isDemoCluster: isNearDelhi
          })
        );

        setNewAddress(prev => ({
          ...prev,
          addressLine: targetAddress,
          city: targetCity,
          pincode: targetPin
        }));

        setShowNewAddressForm(true);
        setDetectingLocation(false);
        setLocationSuccessMsg(`Current GPS location applied (${targetCity} • PIN ${targetPin})`);
        setTimeout(() => setLocationSuccessMsg(''), 4500);
      },
      (err) => {
        setDetectingLocation(false);
        // Fallback: If device GPS permission is blocked/denied in browser, apply active location from navbar
        if (activeLocation?.pincode) {
          setNewAddress(prev => ({
            ...prev,
            addressLine: prev.addressLine || activeLocation.addressLine || activeLocation.label || 'Current Delivery Area',
            city: activeLocation.city || prev.city || 'New Delhi',
            pincode: activeLocation.pincode
          }));
          setShowNewAddressForm(true);
          setLocationSuccessMsg(`Applied current area: ${activeLocation.city} (${activeLocation.pincode})`);
          setTimeout(() => setLocationSuccessMsg(''), 4500);
        } else {
          setErrorMessage('Unable to retrieve device GPS. Please check browser location permissions or enter your PIN code manually.');
        }
      },
      { timeout: 8000 }
    );
  };

  const updateAddressField = (field, val) => {
    setErrorMessage('');
    setNewAddress(prev => ({ ...prev, [field]: val }));
  };

  // Serviceability check state
  const [serviceability, setServiceability] = useState({
    checking: false,
    checked: false,
    serviceable: true,
    distanceKm: 0,
    deliveryFee: 35,
    estimatedMins: 25,
    reason: '',
    message: ''
  });

  // Compute Bill Summary
  const itemSubtotal = items.reduce((sum, item) => sum + item.itemTotal, 0);
  const deliveryFee = itemSubtotal > 0 ? (serviceability.deliveryFee || 35) : 0;
  const packagingFee = itemSubtotal > 0 ? 25 : 0;
  const taxes = Math.round(itemSubtotal * 0.05 * 100) / 100;
  const grandTotal = Math.max(0, Math.round((itemSubtotal + deliveryFee + packagingFee + taxes - (discount || 0)) * 100) / 100);

  // Check serviceability when address selection or pincode changes
  useEffect(() => {
    if (!restaurant?._id) return;
    verifyServiceability();
  }, [selectedAddressIndex, showNewAddressForm, newAddress.pincode, restaurant]);

  const verifyServiceability = async () => {
    try {
      setServiceability(prev => ({ ...prev, checking: true }));

      let pincodeToCheck = '';
      let coordsToCheck = null;

      if (showNewAddressForm || !hasSavedAddresses) {
        pincodeToCheck = newAddress.pincode;
        coordsToCheck = activeLocation?.coordinates || restaurant?.location?.coordinates || [77.2180, 28.6310];
      } else {
        const addr = savedAddresses[selectedAddressIndex];
        pincodeToCheck = addr?.pincode || '';
        coordsToCheck = addr?.location?.coordinates || activeLocation?.coordinates || restaurant?.location?.coordinates;
      }

      if (!pincodeToCheck || pincodeToCheck.length < 6) {
        setServiceability({
          checking: false,
          checked: false,
          serviceable: true,
          distanceKm: 0,
          deliveryFee: 35,
          estimatedMins: 25,
          reason: '',
          message: ''
        });
        return;
      }

      const res = await api.post(`/restaurants/${restaurant._id}/check-serviceability`, {
        pincode: pincodeToCheck,
        coordinates: coordsToCheck
      });

      if (res.data.success) {
        setServiceability({
          checking: false,
          checked: true,
          serviceable: res.data.serviceable,
          distanceKm: res.data.distanceKm,
          deliveryFee: res.data.deliveryFee || 35,
          estimatedMins: res.data.estimatedDeliveryMins || 25,
          reason: res.data.reason || '',
          message: res.data.message || ''
        });
      }
    } catch (err) {
      console.warn('Serviceability check failed:', err);
      setServiceability(prev => ({ ...prev, checking: false }));
    }
  };

  const getDeliveryAddressPayload = () => {
    if (showNewAddressForm || !hasSavedAddresses) {
      if (!newAddress.addressLine || !newAddress.city || !newAddress.pincode || !newAddress.contactPhone) {
        throw new Error('Please fill in complete address line, city, 6-digit pincode, and phone number.');
      }

      if (!/^[1-9][0-9]{5}$/.test(newAddress.pincode.trim())) {
        throw new Error('Please enter a valid 6-digit Indian postal PIN code.');
      }

      const defaultCoords = activeLocation?.coordinates || restaurant?.location?.coordinates || [77.2180, 28.6310];

      return {
        addressLine: newAddress.addressLine,
        landmark: newAddress.landmark || '',
        city: newAddress.city,
        pincode: newAddress.pincode.trim(),
        contactPhone: newAddress.contactPhone,
        coordinates: defaultCoords
      };
    } else {
      const addr = savedAddresses[selectedAddressIndex];
      if (!addr) {
        throw new Error('Please select a saved delivery address or enter a new one.');
      }

      return {
        addressLine: addr.addressLine,
        landmark: addr.landmark || '',
        city: addr.city,
        pincode: addr.pincode,
        contactPhone: addr.contactPhone || user?.phone,
        coordinates: addr.location?.coordinates || activeLocation?.coordinates || restaurant?.location?.coordinates || [77.2180, 28.6310]
      };
    }
  };

  // Button Click Handler
  const handleProceed = () => {
    setErrorMessage('');

    try {
      // Validate address first
      getDeliveryAddressPayload();

      // Check serviceability block
      if (serviceability.checked && !serviceability.serviceable) {
        return;
      }

      if (paymentMode === 'ONLINE') {
        // Launch Interactive Razorpay Test Modal
        setShowPaymentModal(true);
      } else {
        // Direct COD Order
        executeOrderPlacement(null);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Please verify your delivery address.');
    }
  };

  const executeOrderPlacement = async (paymentRef) => {
    try {
      setSubmitting(true);
      setErrorMessage('');

      const deliveryAddressPayload = getDeliveryAddressPayload();

      const orderPayload = {
        restaurantId: restaurant._id,
        items: items.map(i => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          selectedAddOns: i.selectedAddOns || []
        })),
        deliveryAddress: deliveryAddressPayload,
        paymentMode,
        paymentReference: paymentRef || null,
        paymentMethod: paymentRef?.method || (paymentMode === 'COD' ? 'CASH' : 'ONLINE'),
        offerCode: offerCode || null
      };

      const res = await api.post('/orders', orderPayload);

      if (res.data.success) {
        // Trigger celebratory confetti
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 }
        });

        // Clear local cart
        dispatch(clearCart());

        // Redirect directly to live tracking screen
        navigate(`/tracking/${res.data.order._id}`);
      }
    } catch (err) {
      console.error('Order creation error:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to place order. Please review your cart.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!items || items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      <div>
        <span className="text-xs font-bold text-citrus-600 uppercase tracking-widest">
          Secure Final Step
        </span>
        <h1 className="font-serif text-3xl font-bold text-charcoal-900 mt-1">
          Delivery Address & Payment
        </h1>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-red-400 hover:text-red-700 font-bold text-sm px-2 py-0.5 leading-none transition-colors"
            title="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Serviceability / Area Verification Banner */}
      {serviceability.checked && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between transition-all ${
          serviceability.serviceable
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-3">
            {serviceability.serviceable ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <div>
              <p className="font-bold">
                {serviceability.serviceable ? 'Serviceable Delivery Area' : 'Outside Serviceable Area'}
              </p>
              <p className="text-[11px] opacity-90">
                {serviceability.serviceable ? serviceability.message : serviceability.reason}
              </p>
            </div>
          </div>
          {serviceability.distanceKm > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-white/80 font-mono font-bold text-[11px] shadow-2xs">
              {serviceability.distanceKm} km away
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Address & Payment Method */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* 1. Delivery Destination */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <h2 className="font-serif text-lg font-bold text-charcoal-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-citrus-600" />
                Delivery Address
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDetectCurrentLocation}
                  disabled={detectingLocation}
                  className="px-3 py-1.5 rounded-xl bg-ivory-100 hover:bg-ivory-200 border border-ivory-300 text-charcoal-900 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  title="Detect live GPS or use current location"
                >
                  {detectingLocation ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-citrus-600" />
                      <span>Detecting GPS...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3.5 h-3.5 text-citrus-600" />
                      <span>Use Current Location</span>
                    </>
                  )}
                </button>

                {hasSavedAddresses && (
                  <button
                    type="button"
                    onClick={() => setShowNewAddressForm(!showNewAddressForm)}
                    className="text-xs font-bold text-citrus-600 hover:text-citrus-700 flex items-center gap-1 cursor-pointer"
                  >
                    {showNewAddressForm ? 'Choose Saved Address' : '+ Add New Address'}
                  </button>
                )}
              </div>
            </div>

            {locationSuccessMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2 animate-fadeIn">
                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{locationSuccessMsg}</span>
              </div>
            )}

            {/* Active Location Banner */}
            {activeLocation?.pincode && showNewAddressForm && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-ivory-100/80 border border-ivory-200 text-xs text-charcoal-800">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-citrus-600 flex-shrink-0" />
                  <span>
                    Current Area: <strong>{activeLocation.city}</strong> (PIN: <strong>{activeLocation.pincode}</strong>)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewAddress(prev => ({
                      ...prev,
                      addressLine: activeLocation.addressLine || activeLocation.label || prev.addressLine || 'Connaught Place Area',
                      city: activeLocation.city || prev.city || 'New Delhi',
                      pincode: activeLocation.pincode
                    }));
                    setLocationSuccessMsg(`Auto-filled from ${activeLocation.city} (${activeLocation.pincode})`);
                    setTimeout(() => setLocationSuccessMsg(''), 4000);
                  }}
                  className="text-[11px] font-bold text-citrus-600 hover:text-citrus-700 hover:underline cursor-pointer"
                >
                  Auto-Fill
                </button>
              </div>
            )}

            {showNewAddressForm ? (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-semibold text-stone-600">Full Address Line *</label>
                  <input
                    type="text"
                    placeholder="e.g. Flat 301, Silver Oak Residences, Sector 4"
                    value={newAddress.addressLine}
                    onChange={(e) => updateAddressField('addressLine', e.target.value)}
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:border-citrus-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-stone-600">City *</label>
                    <input
                      type="text"
                      placeholder="e.g. New Delhi"
                      value={newAddress.city}
                      onChange={(e) => updateAddressField('city', e.target.value)}
                      className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:border-citrus-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-stone-600">Postal PIN Code (6 digits) *</label>
                    <input
                      type="text"
                      maxLength="6"
                      placeholder="e.g. 110001"
                      value={newAddress.pincode}
                      onChange={(e) => updateAddressField('pincode', e.target.value)}
                      className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono font-medium focus:outline-none focus:border-citrus-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-600">Contact Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={newAddress.contactPhone}
                    onChange={(e) => updateAddressField('contactPhone', e.target.value)}
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-none focus:border-citrus-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {savedAddresses.map((addr, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedAddressIndex(idx)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between ${
                      selectedAddressIndex === idx
                        ? 'border-citrus-600 bg-citrus-50/40 shadow-xs'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <span className="inline-block px-2 py-0.5 rounded bg-ivory-300 text-charcoal-900 font-bold text-[10px] uppercase">
                        {addr.label || 'Home'}
                      </span>
                      <p className="text-xs font-bold text-charcoal-900">{addr.addressLine}</p>
                      <p className="text-[11px] text-stone-500">{addr.city} • PIN: {addr.pincode}</p>
                      <p className="text-[11px] text-stone-500">Phone: {addr.contactPhone || user?.phone}</p>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        selectedAddressIndex === idx
                          ? 'bg-citrus-600 border-citrus-600 text-white'
                          : 'border-stone-300'
                      }`}
                    >
                      {selectedAddressIndex === idx && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Payment Method */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-4">
            <h2 className="font-serif text-lg font-bold text-charcoal-900 border-b border-stone-100 pb-3">
              Payment Method
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Online Test Payment Option */}
              <div
                onClick={() => setPaymentMode('ONLINE')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  paymentMode === 'ONLINE'
                    ? 'border-citrus-600 bg-citrus-50/40 shadow-xs'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shadow-2xs">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold text-charcoal-900">Online Payment</h3>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-citrus-100 text-citrus-700 font-bold uppercase">
                        Fast
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500">UPI, QR, Cards, NetBanking</p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    paymentMode === 'ONLINE'
                      ? 'bg-citrus-600 border-citrus-600 text-white'
                      : 'border-stone-300'
                  }`}
                >
                  {paymentMode === 'ONLINE' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

              {/* Cash On Delivery Option */}
              <div
                onClick={() => setPaymentMode('COD')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  paymentMode === 'COD'
                    ? 'border-citrus-600 bg-citrus-50/40 shadow-xs'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-2xs">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-charcoal-900">Cash on Delivery</h3>
                    <p className="text-[11px] text-stone-500">Pay cash/UPI at doorstep</p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    paymentMode === 'COD'
                      ? 'bg-citrus-600 border-citrus-600 text-white'
                      : 'border-stone-300'
                  }`}
                >
                  {paymentMode === 'COD' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Right Column: Order Confirmation Overview */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs space-y-6">
          <div className="border-b border-stone-100 pb-3">
            <span className="text-[10px] font-bold text-citrus-600 uppercase tracking-widest">
              Selected Kitchen
            </span>
            <h3 className="font-serif text-lg font-bold text-charcoal-900">
              {restaurant?.name}
            </h3>
            <p className="text-xs text-stone-500">{restaurant?.address?.city} • Max Delivery Radius {restaurant?.deliveryRadiusKm || 12} km</p>
          </div>

          <div className="space-y-2 text-xs text-stone-600">
            {items.map((i, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{i.quantity}x {i.name}</span>
                <span className="font-bold text-charcoal-900">₹{i.itemTotal}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-stone-100 pt-3 space-y-2 text-xs text-stone-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-bold text-charcoal-900">₹{itemSubtotal}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee ({serviceability.distanceKm > 0 ? `${serviceability.distanceKm} km` : 'Standard'})</span>
              <span className="font-bold text-charcoal-900">₹{deliveryFee}</span>
            </div>
            <div className="flex justify-between">
              <span>Eco Thermal Packaging</span>
              <span className="font-bold text-charcoal-900">₹{packagingFee}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxes (5% GST)</span>
              <span className="font-bold text-charcoal-900">₹{taxes}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Offer Discount</span>
                <span>-₹{discount}</span>
              </div>
            )}
            <div className="border-t border-stone-200 pt-3 flex justify-between text-sm font-bold text-charcoal-900">
              <span>Total Payable</span>
              <span className="text-citrus-600 text-base">₹{grandTotal}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-100 space-y-2 text-xs text-stone-500">
            {serviceability.checked && !serviceability.serviceable && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{serviceability.reason || 'Sorry, this restaurant does not deliver to your selected address yet.'}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 p-2.5 rounded-xl font-medium">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>Contactless thermal packing & tamper seal</span>
            </div>
          </div>

          <button
            onClick={handleProceed}
            disabled={submitting || (serviceability.checked && !serviceability.serviceable)}
            className={`w-full py-4 px-6 rounded-2xl text-white font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 ${
              serviceability.checked && !serviceability.serviceable
                ? 'bg-stone-300 cursor-not-allowed opacity-75'
                : 'bg-citrus-600 hover:bg-citrus-500'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Confirming Order...</span>
              </>
            ) : serviceability.checked && !serviceability.serviceable ? (
              <span>Outside Delivery Zone</span>
            ) : paymentMode === 'ONLINE' ? (
              <>
                <Lock className="w-4 h-4" />
                <span>Pay ₹{grandTotal} & Place Order</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Place Cash on Delivery Order</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </div>

      {/* Interactive Razorpay / UPI Simulator Modal */}
      <PaymentGatewayModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={grandTotal}
        restaurantName={restaurant?.name || 'Gourmet Kitchen'}
        restaurantId={restaurant?._id}
        onPaymentSuccess={(paymentRef) => {
          executeOrderPlacement(paymentRef);
        }}
      />

    </div>
  );
}
