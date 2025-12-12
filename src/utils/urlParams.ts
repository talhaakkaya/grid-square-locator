import type { LatLng } from '../types';
import { latLngToMaidenhead, maidenheadToBounds, getZoomForPrecision } from './maidenhead';
import type { GridPrecision } from '../types';

/**
 * URL Parameter System:
 *
 * ?qth=KN41kb - Navigation/click: shows grid square on map
 * ?grid=KN41kb&ant=25 - Coverage link: auto-starts coverage calculation
 * ?grid=KN41kb (no ant) - Treated same as qth, just navigation
 *
 * Flow:
 * - Click on map → updates to ?qth=...
 * - Start coverage → updates to ?grid=...&ant=...
 * - Clear selection → removes all params
 */

interface MapState {
  center: LatLng;
  zoom: number;
  gridSquare: string;
}

/**
 * Get map state from URL parameters
 * Supports both 'qth' and 'grid' params for navigation
 * @returns Map state if parameters exist, null otherwise
 */
export function getMapStateFromURL(): MapState | null {
  const params = new URLSearchParams(window.location.search);

  // Check which param is used
  const qthParam = params.get('qth');
  const gridParam = params.get('grid');
  const gridSquare = qthParam || gridParam;

  if (!gridSquare) {
    return null;
  }

  try {
    const bounds = maidenheadToBounds(gridSquare);
    const center = {
      lat: (bounds.southwest.lat + bounds.northeast.lat) / 2,
      lng: (bounds.southwest.lng + bounds.northeast.lng) / 2,
    };

    // Determine zoom based on grid square precision
    const precision = gridSquare.length as GridPrecision;
    let zoom = getZoomForPrecision(precision);

    // For coverage URLs (grid param), use a more zoomed-out view
    // to better see the coverage area
    if (gridParam && zoom > 12) {
      zoom = 12;
    }

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
 * @param gridSquare Optional exact grid square to use (skips calculation)
 */
export function updateURLWithMapState(center: LatLng, zoom: number, gridSquare?: string): void {
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
 * Coverage URL parameters for shareable links
 */
export interface CoverageUrlParams {
  gridSquare: string;
  antennaHeight: number;
}

/**
 * Get coverage parameters from URL for auto-start feature
 * URL format: ?grid=KN41kb36qb&ant=25
 * @returns Coverage params if grid parameter exists, null otherwise
 */
export function getCoverageParamsFromURL(): CoverageUrlParams | null {
  const params = new URLSearchParams(window.location.search);
  const grid = params.get('grid');

  if (!grid) return null;

  const ant = params.get('ant');
  const antennaHeight = ant ? parseInt(ant, 10) : 25; // Default 25m

  return { gridSquare: grid, antennaHeight };
}

/**
 * Update URL with coverage parameters for sharing
 * @param gridSquare Grid square locator
 * @param antennaHeight Antenna height in meters
 */
export function updateURLWithCoverage(gridSquare: string, antennaHeight: number): void {
  const url = new URL(window.location.href);
  url.searchParams.set('grid', gridSquare.toLowerCase());
  url.searchParams.set('ant', antennaHeight.toString());
  // Remove legacy qth param if present
  url.searchParams.delete('qth');
  window.history.replaceState({}, '', url.toString());
}
