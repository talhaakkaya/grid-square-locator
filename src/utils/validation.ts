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
