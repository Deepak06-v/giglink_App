export function openInMaps(
  location: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    coordinates?: { latitude: number; longitude: number };
  },
  label?: string,
): void {
  let url = '';
  if (location.coordinates && location.coordinates.latitude && location.coordinates.longitude) {
    const { latitude, longitude } = location.coordinates;
    url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  } else {
    const parts = [location.address, location.city, location.state, location.pincode].filter(Boolean);
    const query = parts.length > 0 ? parts.join(', ') : label || 'India';
    url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}
