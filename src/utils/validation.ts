/**
 * Validation utilities for grid squares and coordinates
 */

import { GRID_SQUARE_PATTERN } from './constants';

/**
 * Check if a string is a valid Maidenhead grid square locator
 * @param value String to validate
 * @returns True if valid grid square (2-10 characters)
 */
export function isValidGridSquare(value: string): boolean {
  return GRID_SQUARE_PATTERN.test(value.trim());
}

/**
 * Check if coordinates are within valid ranges
 * @param lat Latitude (-90 to 90)
 * @param lng Longitude (-180 to 180)
 * @returns True if coordinates are valid
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Normalize a grid square string to standard format (uppercase, trimmed)
 * @param value Grid square string
 * @returns Normalized grid square string
 */
export function normalizeGridSquare(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * Parse a coordinate pair from a string
 * Supports formats: "lat, lng" or "lat lng"
 * @param value String to parse
 * @returns Parsed coordinates { lat, lng } or null if invalid
 */
export function parseCoordinates(value: string): { lat: number; lng: number } | null {
  const trimmed = value.trim();

  // Try comma-separated format: "41.020833, 28.875000"
  let parts = trimmed.split(',').map(s => s.trim());

  // If no comma, try space-separated: "41.020833 28.875000"
  if (parts.length === 1) {
    parts = trimmed.split(/\s+/);
  }

  // Must have exactly 2 parts
  if (parts.length !== 2) {
    return null;
  }

  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);

  // Check if parsing was successful and values are valid
  if (isNaN(lat) || isNaN(lng) || !isValidCoordinate(lat, lng)) {
    return null;
  }

  return { lat, lng };
}

/**
 * Check if a string looks like a coordinate pair
 * @param value String to check
 * @returns True if the string appears to be coordinates
 */
export function isValidCoordinatePair(value: string): boolean {
  return parseCoordinates(value) !== null;
}
