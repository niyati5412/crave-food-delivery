import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, AlertCircle, Compass } from 'lucide-react';

export default function LiveTrackingMap({
  restaurantLocation, // [longitude, latitude]
  deliveryLocation,   // [longitude, latitude]
  courierLocation,    // [longitude, latitude]
  restaurantName = 'Kitchen',
  customerAddress = 'Drop-off Location',
  courierName = 'Courier Partner',
  routeCoordinates = null // Optional real road polyline geometry: [[lat, lng], ...]
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const courierMarkerRef = useRef(null);
  const polylineRef = useRef(null);
  const [mapError, setMapError] = useState(false);

  // Validate coordinates
  const hasValidRestCoords = Array.isArray(restaurantLocation) &&
    restaurantLocation.length >= 2 &&
    !isNaN(restaurantLocation[0]) &&
    !isNaN(restaurantLocation[1]) &&
    restaurantLocation[0] !== 0;

  const hasValidDropCoords = Array.isArray(deliveryLocation) &&
    deliveryLocation.length >= 2 &&
    !isNaN(deliveryLocation[0]) &&
    !isNaN(deliveryLocation[1]) &&
    deliveryLocation[0] !== 0;

  const hasValidCourierCoords = Array.isArray(courierLocation) &&
    courierLocation.length >= 2 &&
    !isNaN(courierLocation[0]) &&
    !isNaN(courierLocation[1]) &&
    courierLocation[0] !== 0;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // If completely missing both locations, don't initialize a blank broken map
    if (!hasValidRestCoords && !hasValidDropCoords && !hasValidCourierCoords) {
      return;
    }

    try {
      // Determine initial center: Courier -> Restaurant -> Drop-off -> Default (New Delhi)
      let initialCenter = [28.6139, 77.2090];
      if (hasValidCourierCoords) {
        initialCenter = [courierLocation[1], courierLocation[0]];
      } else if (hasValidRestCoords) {
        initialCenter = [restaurantLocation[1], restaurantLocation[0]];
      } else if (hasValidDropCoords) {
        initialCenter = [deliveryLocation[1], deliveryLocation[0]];
      }

      // Initialize Leaflet map
      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 14,
        zoomControl: false,
        attributionControl: true
      });
      mapInstanceRef.current = map;

      // Clean Zoom control in top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Official standard OpenStreetMap TileLayer — No API Key Required, compliant with OSM policy
      const osmTileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
      });

      osmTileLayer.on('tileerror', (error) => {
        console.warn('[Leaflet] Tile load issue:', error);
      });

      osmTileLayer.addTo(map);

      // Helper to build branded HTML marker icons
      const createMarkerIcon = (emoji, bgColor, label, subtitle) => {
        return L.divIcon({
          className: 'custom-crave-marker',
          html: `
            <div style="display: flex; flex-direction: column; align-items: center; pointer-events: auto;">
              <div style="
                width: 42px; height: 42px;
                background-color: ${bgColor};
                border: 3px solid #ffffff;
                border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                box-shadow: 0 4px 14px rgba(0,0,0,0.3);
                font-size: 20px;
              ">
                ${emoji}
              </div>
              <div style="
                margin-top: 4px;
                background: #1C1A18;
                color: #ffffff;
                font-size: 10px;
                font-weight: 700;
                padding: 3px 8px;
                border-radius: 12px;
                white-space: nowrap;
                box-shadow: 0 2px 6px rgba(0,0,0,0.25);
                border: 1px solid rgba(255,255,255,0.2);
                text-align: center;
              ">
                ${label}
              </div>
            </div>
          `,
          iconSize: [44, 62],
          iconAnchor: [22, 42]
        });
      };

      const boundsPoints = [];

      // 1. Restaurant Marker
      if (hasValidRestCoords) {
        const restLatLng = [restaurantLocation[1], restaurantLocation[0]];
        boundsPoints.push(restLatLng);
        L.marker(restLatLng, {
          icon: createMarkerIcon('🍳', '#3A142D', restaurantName, 'Pickup Kitchen')
        })
          .addTo(map)
          .bindPopup(`<strong>${restaurantName}</strong><br/><span style="font-size:11px;color:#666;">Pickup Kitchen</span>`);
      }

      // 2. Customer Destination Marker
      if (hasValidDropCoords) {
        const dropLatLng = [deliveryLocation[1], deliveryLocation[0]];
        boundsPoints.push(dropLatLng);
        L.marker(dropLatLng, {
          icon: createMarkerIcon('📍', '#10B981', 'Your Drop-off', 'Delivery Destination')
        })
          .addTo(map)
          .bindPopup(`<strong>Delivery Destination</strong><br/><span style="font-size:11px;color:#666;">${customerAddress}</span>`);
      }

      // 3. Delivery Partner Marker
      if (hasValidCourierCoords) {
        const courierLatLng = [courierLocation[1], courierLocation[0]];
        boundsPoints.push(courierLatLng);

        const courierIcon = L.divIcon({
          className: 'custom-courier-marker',
          html: `
            <div style="display: flex; flex-direction: column; align-items: center;">
              <div style="position:relative; width: 48px; height: 48px; display:flex; align-items:center; justify-content:center;">
                <div style="
                  position: absolute;
                  width: 48px; height: 48px;
                  border-radius: 50%;
                  background: rgba(232, 90, 42, 0.35);
                  animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
                "></div>
                <div style="
                  width: 40px; height: 40px;
                  background: linear-gradient(135deg, #FF6B35, #E85A2A);
                  border: 3px solid #ffffff;
                  border-radius: 50%;
                  display: flex; align-items: center; justify-content: center;
                  box-shadow: 0 4px 16px rgba(232, 90, 42, 0.5);
                  font-size: 20px;
                  z-index: 2;
                ">
                  🛵
                </div>
              </div>
              <div style="
                margin-top: 2px;
                background: #E85A2A;
                color: #ffffff;
                font-size: 10px;
                font-weight: 700;
                padding: 2px 8px;
                border-radius: 10px;
                white-space: nowrap;
                box-shadow: 0 2px 6px rgba(0,0,0,0.25);
              ">
                ${courierName}
              </div>
            </div>
          `,
          iconSize: [48, 64],
          iconAnchor: [24, 48]
        });

        courierMarkerRef.current = L.marker(courierLatLng, { icon: courierIcon })
          .addTo(map)
          .bindPopup(`<strong>${courierName}</strong><br/><span style="font-size:11px;color:#666;">Courier Partner En Route</span>`);
      }

      // 4. Draw Route ONLY when valid road route coordinates are explicitly available
      // (Never draw an invented straight line through buildings)
      if (Array.isArray(routeCoordinates) && routeCoordinates.length >= 2) {
        polylineRef.current = L.polyline(routeCoordinates, {
          color: '#E85A2A',
          weight: 4,
          opacity: 0.85
        }).addTo(map);
      }

      // Fit map bounds to show available markers neatly
      if (boundsPoints.length > 1) {
        map.fitBounds(boundsPoints, { padding: [50, 50], maxZoom: 16 });
      } else if (boundsPoints.length === 1) {
        map.setView(boundsPoints[0], 15);
      }

    } catch (err) {
      console.error('[Leaflet] Map initialization error:', err);
      setMapError(true);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [restaurantLocation, deliveryLocation]);

  // Dynamically update or create courier marker position on real-time Socket.IO tick
  useEffect(() => {
    if (!hasValidCourierCoords || !mapInstanceRef.current) return;

    const newLatLng = [courierLocation[1], courierLocation[0]];

    const courierIcon = L.divIcon({
      className: 'custom-courier-marker',
      html: `
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div style="position:relative; width: 48px; height: 48px; display:flex; align-items:center; justify-content:center;">
            <div style="
              position: absolute;
              width: 48px; height: 48px;
              border-radius: 50%;
              background: rgba(232, 90, 42, 0.35);
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <div style="
              width: 40px; height: 40px;
              background: linear-gradient(135deg, #FF6B35, #E85A2A);
              border: 3px solid #ffffff;
              border-radius: 50%;
              display: flex; align-items: center; justify-content: center;
              box-shadow: 0 4px 16px rgba(232, 90, 42, 0.5);
              font-size: 20px;
              z-index: 2;
            ">
              🛵
            </div>
          </div>
          <div style="
            margin-top: 2px;
            background: #E85A2A;
            color: #ffffff;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 10px;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          ">
            ${courierName}
          </div>
        </div>
      `,
      iconSize: [48, 64],
      iconAnchor: [24, 48]
    });

    if (courierMarkerRef.current) {
      courierMarkerRef.current.setLatLng(newLatLng);
    } else {
      courierMarkerRef.current = L.marker(newLatLng, { icon: courierIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`<strong>${courierName}</strong><br/><span style="font-size:11px;color:#666;">Courier Partner En Route</span>`);
    }
  }, [courierLocation, courierName]);

  // Fallback UI when coordinates or map cannot be initialized
  if (mapError || (!hasValidRestCoords && !hasValidDropCoords)) {
    return (
      <div className="relative w-full h-[380px] md:h-[460px] rounded-3xl bg-ivory-100 border border-ivory-300 flex flex-col items-center justify-center p-8 text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-citrus-100 text-citrus-700 flex items-center justify-center">
          <Compass className="w-8 h-8" />
        </div>
        <div className="max-w-md space-y-1">
          <h3 className="font-serif text-lg font-bold text-charcoal-900">
            Map Telemetry Standby
          </h3>
          <p className="text-xs text-stone-600">
            Geographic coordinates are currently syncing with local dispatch nodes. Street address details remain verified:
          </p>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-stone-200 text-left text-xs space-y-2 max-w-sm w-full">
          <div>
            <span className="text-[10px] font-bold uppercase text-citrus-600">Kitchen Pickup</span>
            <p className="font-bold text-charcoal-900">{restaurantName}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-emerald-600">Customer Destination</span>
            <p className="font-bold text-charcoal-900">{customerAddress}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[340px] sm:h-[400px] md:h-[460px] lg:h-[500px] min-h-[320px] rounded-3xl overflow-hidden shadow-lg border border-stone-200">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      
      {/* Live Indicator Overlay */}
      <div className="absolute top-4 left-4 z-10 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-stone-200/80 shadow-md flex items-center gap-2">
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <span className="text-xs font-bold text-charcoal-900 tracking-wide uppercase">
          OpenStreetMap Live Telemetry
        </span>
      </div>

      {/* Legend Pill */}
      <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-charcoal-900/90 backdrop-blur-md text-white text-[11px] shadow-md border border-white/10">
        <span className="flex items-center gap-1"><span>🍳</span> {restaurantName.slice(0, 14)}</span>
        <span>•</span>
        <span className="flex items-center gap-1"><span>📍</span> Drop-off</span>
        {hasValidCourierCoords && (
          <>
            <span>•</span>
            <span className="flex items-center gap-1 text-citrus-300"><span>🛵</span> {courierName}</span>
          </>
        )}
      </div>
    </div>
  );
}
