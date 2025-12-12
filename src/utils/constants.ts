/**
 * Application-wide constants
 */

import type { GridPrecision } from '../types';

/**
 * Regular expression pattern for validating Maidenhead grid square locators
 * Matches 2-10 character grid squares (e.g., "FN", "FN31", "FN31pr", "FN31pr45", "FN31pr45ab")
 */
export const GRID_SQUARE_PATTERN = /^[a-zA-Z]{2}([0-9]{2}([a-zA-Z]{2}([0-9]{2}([a-zA-Z]{2})?)?)?)?$/;

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

/**
 * Line-of-Sight calculation configuration
 */
export const LOS_CONFIG = {
  MAX_DISTANCE_KM: 300,
  SAMPLE_INTERVAL_KM: 1,
  EARTH_RADIUS_KM: 6371,
  K_FACTOR: 4 / 3,
  BATCH_SIZE: 100,
  MAX_CONCURRENT_REQUESTS: 5,
  REQUEST_DELAY_MS: 100,
  NUM_RADIALS: 720,
} as const;

/**
 * Default values
 */
export const DEFAULTS = {
  ANTENNA_HEIGHT_M: 10,
} as const;

/**
 * LocalStorage keys
 */
export const STORAGE_KEYS = {
  ANTENNA_HEIGHT: 'antenna_height',
} as const;

/**
 * Color schemes for multiple coverage overlays
 * Each scheme defines start and end hue for the gradient (short range to long range)
 */
export const COVERAGE_COLORS = [
  { name: 'red-green', startHue: 0, endHue: 120 },
  { name: 'purple-blue', startHue: 280, endHue: 240 },
  { name: 'orange-yellow', startHue: 30, endHue: 60 },
  { name: 'pink-magenta', startHue: 330, endHue: 300 },
  { name: 'cyan-teal', startHue: 180, endHue: 160 },
  { name: 'lime-green', startHue: 90, endHue: 140 },
] as const;
