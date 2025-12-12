import type { LatLng, GridSquareBounds } from '../types';

/**
 * Calculate center point from GridSquareBounds
 */
export function getBoundsCenter(bounds: GridSquareBounds): LatLng {
  return {
    lat: (bounds.southwest.lat + bounds.northeast.lat) / 2,
    lng: (bounds.southwest.lng + bounds.northeast.lng) / 2,
  };
}

/**
 * Convert GridSquareBounds to Leaflet-compatible bounds array
 */
export function boundsToLeafletArray(
  bounds: GridSquareBounds
): [[number, number], [number, number]] {
  return [
    [bounds.southwest.lat, bounds.southwest.lng],
    [bounds.northeast.lat, bounds.northeast.lng],
  ];
}

/**
 * Constrain a point to stay within bounds
 */
export function constrainToBounds(
  pos: LatLng,
  bounds: [[number, number], [number, number]]
): LatLng {
  const [[swLat, swLng], [neLat, neLng]] = bounds;
  return {
    lat: Math.max(swLat, Math.min(neLat, pos.lat)),
    lng: Math.max(swLng, Math.min(neLng, pos.lng)),
  };
}

/**
 * Check if a point is inside bounds
 */
export function isInsideBounds(
  point: LatLng,
  bounds: [[number, number], [number, number]] | null
): boolean {
  if (!bounds) return false;
  const [[swLat, swLng], [neLat, neLng]] = bounds;
  return (
    point.lat >= swLat &&
    point.lat <= neLat &&
    point.lng >= swLng &&
    point.lng <= neLng
  );
}
