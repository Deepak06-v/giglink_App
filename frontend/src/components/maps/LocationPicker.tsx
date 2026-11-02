import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Crosshair, MapPin } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface LocationPickerProps {
  latitude: string;
  longitude: string;
  onCoordinatesChange: (lat: string, lng: string) => void;
  className?: string;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  latitude,
  longitude,
  onCoordinatesChange,
  className,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [geoLocating, setGeoLocating] = useState(false);

  const initialLat = parseFloat(latitude) || 12.9716; // Bangalore default
  const initialLng = parseFloat(longitude) || 77.5946;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 13,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    const markerIcon = L.divIcon({
      className: 'fixmate-picker-marker',
      html: `<div style="background-color: #6C5CE7; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(108, 92, 231, 0.5); border: 3px solid white;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });

    if (latitude && longitude && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude))) {
      markerRef.current = L.marker([parseFloat(latitude), parseFloat(longitude)], {
        icon: markerIcon,
      }).addTo(map);
    }

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const latStr = lat.toFixed(6);
      const lngStr = lng.toFixed(6);
      onCoordinatesChange(latStr, lngStr);

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon: markerIcon }).addTo(map);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocating(false);
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        onCoordinatesChange(lat, lng);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([pos.coords.latitude, pos.coords.longitude], 15);
          if (markerRef.current) {
            markerRef.current.setLatLng([pos.coords.latitude, pos.coords.longitude]);
          }
        }
      },
      () => {
        setGeoLocating(false);
        alert('Could not determine your location. Please tap on the map to pin.');
      },
      { timeout: 10000 },
    );
  };

  return (
    <div className={cn('flex flex-col gap-2.5 w-full', className)}>
      <div className="flex items-center justify-between">
        <label className="text-[13px] font-semibold text-[#5A5F6E] pl-0.5">
          Pin Exact Location (Optional)
        </label>
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={geoLocating}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#6C5CE7] hover:text-[#5A4BD1] disabled:opacity-50"
        >
          <Crosshair className={cn('w-3.5 h-3.5', geoLocating && 'animate-spin')} />
          {geoLocating ? 'Locating...' : 'Use My Current Location'}
        </button>
      </div>

      <div className="relative w-full h-[220px] rounded-2xl overflow-hidden border border-[#E9EAF0] shadow-sm">
        <div ref={mapContainerRef} className="w-full h-full z-0" />
        <div className="absolute top-2.5 left-2.5 z-10 bg-white/90 backdrop-blur-md px-3 py-1 rounded-xl border border-[#E9EAF0] text-[11px] font-medium text-[#5A5F6E] shadow-sm flex items-center gap-1 pointer-events-none">
          <MapPin className="w-3 h-3 text-[#6C5CE7]" />
          <span>Tap on map to place pin</span>
        </div>
      </div>

      {latitude && longitude && (
        <div className="flex items-center justify-between px-3 py-2 bg-[#F2F3F8] rounded-xl text-[12px] text-[#5A5F6E]">
          <span>Coordinates:</span>
          <span className="font-mono font-medium text-[#191B23]">
            {latitude}, {longitude}
          </span>
        </div>
      )}
    </div>
  );
};
