import type { LatLng } from '../types';
import { latLngToMaidenhead, maidenheadToBounds, getZoomForPrecision } from './maidenhead';
import { getBoundsCenter } from './geoUtils';
import type { GridPrecision } from '../types';

/**
 * URL Parameter System:
 *
 * ?qth=KN41kb - Navigation: shows grid square on map
 * ?qth=KN41kb&ant=25 - Coverage link with antenna height
 *
 * Flow:
 * - Click on map → updates to ?qth=...
 * - Start coverage → adds &ant=... to URL
 * - Clear selection → removes all params
 */

interface MapState {
  center: LatLng;
  zoom: number;
  gridSquare: string;
}

/**
 * Get map state from URL parameters
 * @returns Map state if parameters exist, null otherwise
 */
export function getMapStateFromURL(): MapState | null {
  const params = new URLSearchParams(window.location.search);
  const gridSquare = params.get('qth');

  if (!gridSquare) {
    return null;
  }

  try {
    const bounds = maidenheadToBounds(gridSquare);
    const center = getBoundsCenter(bounds);
    const precision = gridSquare.length as GridPrecision;
    const zoom = getZoomForPrecision(precision);

    return { center, zoom, gridSquare: gridSquare.toUpperCase() };
  } catch (error) {
    console.error('Invalid grid square in URL:', error);
    return null;
  }
}

/**
 * Update URL with current map state
 * @param center Map center coordinates
 * @param zoom Map zoom level
 * @param antennaHeight Antenna height in meters
 * @param gridSquare Optional exact grid square to use (skips calculation)
 */
export function updateURLWithMapState(center: LatLng, zoom: number, antennaHeight: number, gridSquare?: string): void {
  let qthValue: string;

  if (gridSquare) {
    // Use the provided grid square directly
    qthValue = gridSquare.toLowerCase();
  } else {
    // Determine precision based on zoom level
    let precision: GridPrecision = 2;
    if (zoom >= 5) precision = 4;
    if (zoom >= 9) precision = 6;
    if (zoom >= 13) precision = 8;
    if (zoom >= 16) precision = 10;

    qthValue = latLngToMaidenhead(center.lat, center.lng, precision).toLowerCase();
  }

  const params = new URLSearchParams();
  params.set('qth', qthValue);
  params.set('ant', antennaHeight.toString());

  const newURL = `${window.location.pathname}?${params.toString()}`;

  // Update URL without reloading the page
  window.history.replaceState({}, '', newURL);
}

/**
 * Clear map state from URL
 */
export function clearMapStateFromURL(): void {
  window.history.replaceState({}, '', window.location.pathname);
}

/**
 * Get antenna height from URL parameters
 * @returns Antenna height if present, null otherwise
 */
export function getAntennaHeightFromURL(): number | null {
  const params = new URLSearchParams(window.location.search);
  const ant = params.get('ant');
  if (!ant) return null;
  const height = parseInt(ant, 10);
  return isNaN(height) ? null : height;
}

/**
 * Update URL with coverage parameters for sharing
 * @param gridSquare Grid square locator
 * @param antennaHeight Antenna height in meters
 */
export function updateURLWithCoverage(gridSquare: string, antennaHeight: number): void {
  const url = new URL(window.location.href);
  url.searchParams.set('qth', gridSquare.toLowerCase());
  url.searchParams.set('ant', antennaHeight.toString());
  window.history.replaceState({}, '', url.toString());
}
