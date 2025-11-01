/**
 * Application-wide constants
 */

import type { GridPrecision } from '../types';

/**
 * Regular expression pattern for validating Maidenhead grid square locators
 * Matches 2-10 character grid squares (e.g., "FN", "FN31", "FN31pr", "FN31pr45", "FN31pr45ab")
 */
export const GRID_SQUARE_PATTERN = /^[a-zA-Z]{2}[0-9]{2}([a-zA-Z]{2}([0-9]{2}([a-zA-Z]{2})?)?)?$/;

/**
 * Zoom level configuration for different grid precisions
 */
export const ZOOM_LEVELS = {
  FIELD: { min: 0, max: 4, precision: 2 as GridPrecision },
  SQUARE: { min: 5, max: 8, precision: 4 as GridPrecision },
  SUBSQUARE: { min: 9, max: 12, precision: 6 as GridPrecision },
  EXTENDED: { min: 13, max: 15, precision: 8 as GridPrecision },
  SUPER_EXTENDED: { min: 16, max: 20, precision: 10 as GridPrecision },
} as const;

/**
 * Cache duration settings in milliseconds
 */
export const CACHE_DURATIONS = {
  NOMINATIM: 30 * 24 * 60 * 60 * 1000, // 30 days
  ELEVATION: 24 * 60 * 60 * 1000, // 24 hours
  QUERY_STALE: 60 * 60 * 1000, // 1 hour
  QUERY_GC: 24 * 60 * 60 * 1000, // 24 hours
} as const;

/**
 * Debounce delay settings in milliseconds
 */
export const DEBOUNCE_DELAYS = {
  SEARCH: 300,
  NOMINATIM: 500,
} as const;

/**
 * Unit conversion factors
 */
export const CONVERSION_FACTORS = {
  METERS_TO_FEET: 3.28084,
} as const;

/**
 * API configuration
 */
export const API_CONFIG = {
  NOMINATIM_RATE_LIMIT: 1000, // 1 request per second
  ELEVATION_API_URL: 'https://elevation.qso.app/api/v1/lookup',
  NOMINATIM_API_URL: 'https://nominatim.openstreetmap.org/search',
} as const;

/**
 * Cache key prefixes
 */
export const CACHE_KEYS = {
  NOMINATIM: 'nominatim_',
} as const;
