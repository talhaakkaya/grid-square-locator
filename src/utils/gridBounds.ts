import type { LatLng, GridPrecision, GridSquareInfo } from '../types';
import { getGridSquareInfo, maidenheadToBounds } from './maidenhead';

/**
 * Calculate grid square dimensions for a given precision
 */
function getGridDimensions(precision: GridPrecision): { lngSize: number; latSize: number } {
  switch (precision) {
    case 2:
      return { lngSize: 20, latSize: 10 };
    case 4:
      return { lngSize: 2, latSize: 1 };
    case 6:
      return { lngSize: 2 / 24, latSize: 1 / 24 };
    case 8:
      return { lngSize: 2 / 240, latSize: 1 / 240 };
    case 10:
      return { lngSize: 2 / 5760, latSize: 1 / 5760 };
  }
}

/**
 * Generate grid squares visible within the given bounds
 * @param southwest Southwest corner of viewport
 * @param northeast Northeast corner of viewport
 * @param precision Grid precision to generate
 * @param maxSquares Maximum number of squares to generate (safety limit)
 * @returns Array of grid square information
 */
export function getVisibleGridSquares(
  southwest: LatLng,
  northeast: LatLng,
  precision: GridPrecision,
  maxSquares: number = 1000
): GridSquareInfo[] {
  const { lngSize, latSize } = getGridDimensions(precision);
  const squares: GridSquareInfo[] = [];

  // Find starting grid square (southwest corner)
  const startSquare = getGridSquareInfo(southwest.lat, southwest.lng, precision);
  const startBounds = startSquare.bounds;

  // Calculate number of grid squares needed
  const lngDiff = northeast.lng - southwest.lng;
  const latDiff = northeast.lat - southwest.lat;

  const numLng = Math.ceil(lngDiff / lngSize) + 2; // +2 for padding
  const numLat = Math.ceil(latDiff / latSize) + 2;

  // Safety check to prevent generating too many squares
  if (numLng * numLat > maxSquares) {
    console.warn(`Would generate ${numLng * numLat} squares, exceeding max of ${maxSquares}. Skipping grid render.`);
    return [];
  }

  // Generate grid squares
  for (let latIdx = -1; latIdx < numLat; latIdx++) {
    for (let lngIdx = -1; lngIdx < numLng; lngIdx++) {
      const lat = startBounds.southwest.lat + latIdx * latSize;
      const lng = startBounds.southwest.lng + lngIdx * lngSize;

      // Skip if outside world bounds
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        continue;
      }

      try {
        const square = getGridSquareInfo(lat, lng, precision);
        squares.push(square);
      } catch (error) {
        console.error(`Error generating grid square at ${lat}, ${lng}:`, error);
      }
    }
  }

  return squares;
}

/**
 * Calculate the center point of a grid square
 * @param locator Maidenhead locator string
 * @returns Center point coordinates
 */
export function getGridSquareCenter(locator: string): LatLng {
  const bounds = maidenheadToBounds(locator);
  return bounds.center;
}
