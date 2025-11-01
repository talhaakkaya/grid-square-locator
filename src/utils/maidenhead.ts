import type { GridSquareBounds, GridSquareInfo, GridPrecision } from '../types';

/**
 * Maidenhead Locator System (Grid Square) implementation
 *
 * The system divides the world into a grid with increasing precision:
 * - 2 chars (Field): 20° lon x 10° lat (e.g., "KN")
 * - 4 chars (Square): 2° lon x 1° lat (e.g., "KN41")
 * - 6 chars (Subsquare): 5' lon x 2.5' lat (e.g., "KN41ka")
 * - 8 chars (Extended): 30" lon x 15" lat (e.g., "KN41ka58")
 * - 10 chars (Super Extended): 1.25" lon x 0.625" lat (e.g., "KN41ka58sn")
 */

const UPPERCASE_A = 'A'.charCodeAt(0);
const LOWERCASE_A = 'a'.charCodeAt(0);

/**
 * Convert latitude/longitude to Maidenhead locator
 * @param lat Latitude (-90 to 90)
 * @param lng Longitude (-180 to 180)
 * @param precision Number of characters (2, 4, 6, 8, or 10)
 * @returns Maidenhead locator string
 */
export function latLngToMaidenhead(lat: number, lng: number, precision: GridPrecision = 6): string {
  // Normalize coordinates
  const normLng = lng + 180;
  const normLat = lat + 90;

  let locator = '';

  // Field (2 chars): A-R
  const fieldLng = Math.floor(normLng / 20);
  const fieldLat = Math.floor(normLat / 10);
  locator += String.fromCharCode(UPPERCASE_A + fieldLng);
  locator += String.fromCharCode(UPPERCASE_A + fieldLat);

  if (precision === 2) return locator;

  // Square (4 chars): 0-9
  const squareLng = Math.floor((normLng % 20) / 2);
  const squareLat = Math.floor((normLat % 10) / 1);
  locator += squareLng.toString();
  locator += squareLat.toString();

  if (precision === 4) return locator;

  // Subsquare (6 chars): a-x
  const subsquareLng = Math.floor((normLng % 2) / (2 / 24));
  const subsquareLat = Math.floor((normLat % 1) / (1 / 24));
  locator += String.fromCharCode(LOWERCASE_A + subsquareLng);
  locator += String.fromCharCode(LOWERCASE_A + subsquareLat);

  if (precision === 6) return locator;

  // Extended square (8 chars): 0-9
  const extendedLng = Math.floor((normLng % (2 / 24)) / (2 / 240));
  const extendedLat = Math.floor((normLat % (1 / 24)) / (1 / 240));
  locator += extendedLng.toString();
  locator += extendedLat.toString();

  if (precision === 8) return locator;

  // Super extended (10 chars): a-x
  const superLng = Math.floor((normLng % (2 / 240)) / (2 / 5760));
  const superLat = Math.floor((normLat % (1 / 240)) / (1 / 5760));
  locator += String.fromCharCode(LOWERCASE_A + superLng);
  locator += String.fromCharCode(LOWERCASE_A + superLat);

  return locator;
}

/**
 * Convert Maidenhead locator to latitude/longitude bounds
 * @param locator Maidenhead locator string
 * @returns Grid square bounds with southwest, northeast corners and center point
 */
export function maidenheadToBounds(locator: string): GridSquareBounds {
  const upper = locator.toUpperCase();
  let lng = -180;
  let lat = -90;
  let lngSize = 360;
  let latSize = 180;

  // Field (2 chars)
  if (upper.length >= 2) {
    const fieldLng = upper.charCodeAt(0) - UPPERCASE_A;
    const fieldLat = upper.charCodeAt(1) - UPPERCASE_A;
    lngSize = 20;
    latSize = 10;
    lng += fieldLng * lngSize;
    lat += fieldLat * latSize;
  }

  // Square (4 chars)
  if (upper.length >= 4) {
    const squareLng = parseInt(upper.charAt(2));
    const squareLat = parseInt(upper.charAt(3));
    lngSize = 2;
    latSize = 1;
    lng += squareLng * lngSize;
    lat += squareLat * latSize;
  }

  // Subsquare (6 chars)
  if (upper.length >= 6) {
    const subsquareLng = upper.charCodeAt(4) - UPPERCASE_A;
    const subsquareLat = upper.charCodeAt(5) - UPPERCASE_A;
    lngSize = 2 / 24;
    latSize = 1 / 24;
    lng += subsquareLng * lngSize;
    lat += subsquareLat * latSize;
  }

  // Extended square (8 chars)
  if (upper.length >= 8) {
    const extendedLng = parseInt(upper.charAt(6));
    const extendedLat = parseInt(upper.charAt(7));
    lngSize = 2 / 240;
    latSize = 1 / 240;
    lng += extendedLng * lngSize;
    lat += extendedLat * latSize;
  }

  // Super extended (10 chars)
  if (upper.length >= 10) {
    const superLng = upper.charCodeAt(8) - UPPERCASE_A;
    const superLat = upper.charCodeAt(9) - UPPERCASE_A;
    lngSize = 2 / 5760;
    latSize = 1 / 5760;
    lng += superLng * lngSize;
    lat += superLat * latSize;
  }

  return {
    southwest: { lat, lng },
    northeast: { lat: lat + latSize, lng: lng + lngSize },
    center: { lat: lat + latSize / 2, lng: lng + lngSize / 2 },
  };
}

/**
 * Get complete grid square information from coordinates
 * @param lat Latitude
 * @param lng Longitude
 * @param precision Precision level
 * @returns Grid square information with locator, precision, and bounds
 */
export function getGridSquareInfo(lat: number, lng: number, precision: GridPrecision): GridSquareInfo {
  const locator = latLngToMaidenhead(lat, lng, precision);
  const bounds = maidenheadToBounds(locator);

  return {
    locator,
    precision,
    bounds,
  };
}

/**
 * Determine which grid precision to display based on map zoom level
 * @param zoom Leaflet map zoom level (0-18+)
 * @returns Appropriate grid precision
 */
export function getPrecisionForZoom(zoom: number): GridPrecision {
  if (zoom < 5) return 2;   // Zoom 0-4: Fields (20° x 10°)
  if (zoom < 9) return 4;   // Zoom 5-8: Squares (2° x 1°)
  if (zoom < 13) return 6;  // Zoom 9-12: Subsquares (5' x 2.5')
  if (zoom < 16) return 8;  // Zoom 13-15: Extended (30" x 15")
  return 10;                // Zoom 16+: Super extended (1.25" x 0.625")
}

/**
 * Determine appropriate zoom level for a grid precision
 * Inverse of getPrecisionForZoom - returns the default zoom for a given precision
 * @param precision Grid precision level (2, 4, 6, 8, or 10)
 * @returns Appropriate zoom level
 */
export function getZoomForPrecision(precision: GridPrecision): number {
  switch (precision) {
    case 2: return 4;   // Field: zoom to level 4
    case 4: return 8;   // Square: zoom to level 8
    case 6: return 12;  // Subsquare: zoom to level 12
    case 8: return 15;  // Extended: zoom to level 15
    case 10: return 16; // Super extended: zoom to level 16
    default: return 4;  // Default to field level
  }
}

/**
 * Get all precision levels for a location
 * @param lat Latitude
 * @param lng Longitude
 * @returns Object with all precision levels
 */
export function getAllPrecisions(lat: number, lng: number) {
  return {
    field: latLngToMaidenhead(lat, lng, 2),
    square: latLngToMaidenhead(lat, lng, 4),
    subsquare: latLngToMaidenhead(lat, lng, 6),
    extended: latLngToMaidenhead(lat, lng, 8),
    superExtended: latLngToMaidenhead(lat, lng, 10),
  };
}
