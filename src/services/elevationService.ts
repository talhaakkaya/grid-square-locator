import type { ElevationData, LatLng } from '../types';
import { API_CONFIG, CONVERSION_FACTORS } from '../utils/constants';

/**
 * Fetch elevation data from Elevation API
 * @param location Location to get elevation for
 * @returns Elevation data with altitude in meters
 */
export async function getElevation(location: LatLng): Promise<ElevationData> {
  try {
    const response = await fetch(API_CONFIG.ELEVATION_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locations: [
          {
            latitude: location.lat,
            longitude: location.lng,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Elevation API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error('No elevation data returned');
    }

    const elevationData: ElevationData = data.results[0];

    return elevationData;
  } catch (error) {
    console.error('Error fetching elevation:', error);
    throw error;
  }
}

/**
 * Format elevation for display
 * @param elevation Elevation in meters
 * @returns Formatted string with meters and feet
 */
export function formatElevation(elevation: number): string {
  const meters = Math.round(elevation);
  const feet = Math.round(elevation * CONVERSION_FACTORS.METERS_TO_FEET);
  return `${meters}m (${feet}ft)`;
}
