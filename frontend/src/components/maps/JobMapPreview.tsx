import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ExternalLink, MapPin } from 'lucide-react';
import { openInMaps } from '@/utils/maps';
import { cn } from '@/utils/cn';

export interface JobMapPreviewProps {
  coordinates?: { latitude: number; longitude: number };
  latitude?: number;
  longitude?: number;
  title?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  height?: number | string;
  className?: string;
}

export const JobMapPreview: React.FC<JobMapPreviewProps> = ({
  coordinates,
  latitude,
  longitude,
  title,
  address,
  city,
  state,
  pincode,
  height = 180,
  className,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const effectiveCoords = coordinates || (latitude && longitude ? { latitude, longitude } : undefined);

  const hasCoords =
    effectiveCoords &&
    typeof effectiveCoords.latitude === 'number' &&
    typeof effectiveCoords.longitude === 'number' &&
    !isNaN(effectiveCoords.latitude) &&
    !isNaN(effectiveCoords.longitude);

  useEffect(() => {
    if (!hasCoords || !mapContainerRef.current) return;

    const lat = effectiveCoords!.latitude;
    const lng = effectiveCoords!.longitude;

    // Clean up existing map if re-rendering
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Custom FixMate brand pin icon
    const icon = L.divIcon({
      className: 'fixmate-marker',
      html: `<div style="background-color: #6C5CE7; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(108, 92, 231, 0.4); border: 2px solid white;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    L.marker([lat, lng], { icon }).addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [hasCoords, coordinates?.latitude, coordinates?.longitude]);

  const handleOpenMaps = () => {
    openInMaps({ address, city, state, pincode, coordinates });
  };

  if (!hasCoords) {
    return (
      <div
        style={{ height }}
        className={cn(
          'w-full rounded-2xl border border-[#E9EAF0] bg-[#F2F3F8] p-4 flex flex-col items-center justify-center text-center gap-2',
          className,
        )}
      >
        <MapPin className="w-6 h-6 text-[#9BA1AE]" />
        <span className="text-[13px] text-[#5A5F6E] font-medium">
          {[address, city, state, pincode].filter(Boolean).join(', ') || 'Location details'}
        </span>
        <button
          onClick={handleOpenMaps}
          type="button"
          className="text-[12px] font-semibold text-[#6C5CE7] hover:underline flex items-center gap-1"
        >
          Open in Maps <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn('relative w-full rounded-2xl overflow-hidden border border-[#E9EAF0] shadow-sm group', className)}>
      <div ref={mapContainerRef} style={{ height }} className="w-full z-0" />
      <button
        onClick={handleOpenMaps}
        type="button"
        className="absolute bottom-2.5 right-2.5 z-10 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#E9EAF0] text-[12px] font-semibold text-[#191B23] shadow-md flex items-center gap-1.5 hover:bg-white transition-colors"
      >
        <span>Open Maps</span>
        <ExternalLink className="w-3.5 h-3.5 text-[#6C5CE7]" />
      </button>
    </div>
  );
};
