import axios from 'axios';

export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Converts a free-text address into lat/lng using Google Geocoding API.
 * Requires GOOGLE_MAPS_API_KEY in .env (a Geocoding-enabled Google Cloud API key —
 * this can be the SAME Google Cloud project as your Gemini key, just make sure
 * "Geocoding API" is enabled for it in Google Cloud Console).
 *
 * Returns null if geocoding fails, so callers can fall back gracefully
 * instead of crashing the whole order flow.
 */
export const geocodeAddress = async (address: string): Promise<GeoPoint | null> => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn('[geocodingService] GOOGLE_MAPS_API_KEY not set — skipping geocoding, using fallback distance.');
    return null;
  }
  if (!address || !address.trim()) return null;

  try {
    const res = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: { address, key: apiKey },
      timeout: 8000,
    });

    if (res.data.status !== 'OK' || !res.data.results?.length) {
      console.warn(`[geocodingService] Geocoding failed for "${address}": ${res.data.status}`);
      return null;
    }

    const loc = res.data.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng };
  } catch (err: any) {
    console.error('[geocodingService] Geocoding request error:', err.message);
    return null;
  }
};

/**
 * Haversine distance in kilometers between two lat/lng points.
 */
export const haversineDistanceKm = (a: GeoPoint, b: GeoPoint): number => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
};

/**
 * Standard tiered delivery pricing. Adjust bands/prices per your business,
 * or better — move this into GlobalSetting / Client so each tenant can
 * configure their own tiers from the portal (see calculateDeliveryChargeForClient).
 */
export const calculateDeliveryCharge = (distanceKm: number): number => {
  if (distanceKm <= 1) return 0;
  if (distanceKm <= 3) return 2.99;
  if (distanceKm <= 5) return 4.99;
  if (distanceKm <= 10) return 7.99;
  return 9.99 + (distanceKm - 10) * 0.5;
};

/**
 * Full pipeline: given the client's origin point and the customer's
 * delivery address text, returns distance + charge. Falls back to a
 * flat mid-tier charge (and null distance) if geocoding isn't available,
 * so the order flow never breaks even without a Maps API key configured.
 */
export const resolveDeliveryForAddress = async (
  origin: GeoPoint | null,
  deliveryAddress: string
): Promise<{ distanceKm: number | null; deliveryCharge: number; deliveryPoint: GeoPoint | null }> => {
  if (!origin || origin.lat === undefined || origin.lng === undefined) {
    return { distanceKm: null, deliveryCharge: 2.99, deliveryPoint: null };
  }

  const point = await geocodeAddress(deliveryAddress);
  if (!point) {
    return { distanceKm: null, deliveryCharge: 2.99, deliveryPoint: null };
  }

  const distanceKm = haversineDistanceKm(origin, point);
  const deliveryCharge = calculateDeliveryCharge(distanceKm);

  return { distanceKm, deliveryCharge, deliveryPoint: point };
};
