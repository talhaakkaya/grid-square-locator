import type { LatLng } from '../types';
import { latLngToMaidenhead, maidenheadToBounds, getZoomForPrecision } from './maidenhead';
import type { GridPrecision } from '../types';

interface MapState {
  center: LatLng;
  zoom: number;
}

/**
 * Get map state from URL parameters
 * @returns Map state if parameters exist, null otherwise
 */
export function getMapStateFromURL(): MapState | null {
  const params = new URLSearchParams(window.location.search);

  const qth = params.get('qth');

  if (!qth) {
    return null;
  }

  try {
    const bounds = maidenheadToBounds(qth);
    const center = {
      lat: (bounds.southwest.lat + bounds.northeast.lat) / 2,
      lng: (bounds.southwest.lng + bounds.northeast.lng) / 2,
    };

    // Determine zoom based on grid square precision
    const precision = qth.length as GridPrecision;
    const zoom = getZoomForPrecision(precision);

    return { center, zoom };
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
