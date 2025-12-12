import type { ElevationData, LatLng } from '../types';
import { API_CONFIG, CONVERSION_FACTORS, LOS_CONFIG } from '../utils/constants';
import { delay } from '../utils/async';

/**
 * Fetch elevation data from Elevation API
 * @param location Location to get elevation for
 * @returns Elevation data with altitude in meters
 */
export async function getElevation(location: LatLng): Promise<ElevationData> {
  try {
    const locationsParam = `${location.lat},${location.lng}`;
    const url = `${API_CONFIG.ELEVATION_API_URL}?locations=${locationsParam}`;
    const response = await fetch(url);

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

/**
 * Fetch elevation data for multiple locations in a single request
 * @param locations Array of locations to get elevation for
 * @param signal Optional AbortSignal for cancellation
 * @param retryCount Current retry attempt (internal use)
 * @returns Array of elevation data
 */
export async function getElevationBatch(
  locations: LatLng[],
  signal?: AbortSignal,
  retryCount = 0
): Promise<ElevationData[]> {
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 1000;

  if (locations.length === 0) {
    return [];
  }

  const locationsParam = locations.map((loc) => `${loc.lat},${loc.lng}`).join('|');
  const url = `${API_CONFIG.ELEVATION_API_URL}?locations=${locationsParam}`;
  const response = await fetch(url, { signal });

  // Handle 429 rate limiting with exponential backoff
  if (response.status === 429 && retryCount < MAX_RETRIES) {
    const retryDelay = BASE_DELAY_MS * Math.pow(2, retryCount);
    console.log(`Rate limited (429), retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
    await delay(retryDelay);
    return getElevationBatch(locations, signal, retryCount + 1);
  }

  if (!response.ok) {
    throw new Error(`Elevation API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.results) {
    throw new Error('No elevation data returned');
  }

  return data.results;
}

/**
 * Fetch elevations for many locations with throttling and progress reporting
 * @param allLocations All locations to fetch
 * @param onProgress Optional callback for progress updates
 * @param signal Optional AbortSignal for cancellation
 * @returns Array of elevation data in same order as input
 */
export async function getElevationsWithThrottling(
  allLocations: LatLng[],
  onProgress?: (completed: number, total: number) => void,
  signal?: AbortSignal
): Promise<ElevationData[]> {
  const results: ElevationData[] = [];
  const batches: LatLng[][] = [];
  const batchSize = LOS_CONFIG.BATCH_SIZE;
  const maxConcurrent = LOS_CONFIG.MAX_CONCURRENT_REQUESTS;
  const delayMs = LOS_CONFIG.REQUEST_DELAY_MS;

  // Split into batches
  for (let i = 0; i < allLocations.length; i += batchSize) {
    batches.push(allLocations.slice(i, i + batchSize));
  }

  // Process with limited concurrency
  let completedBatches = 0;

  for (let i = 0; i < batches.length; i += maxConcurrent) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const batchGroup = batches.slice(i, i + maxConcurrent);

    const batchResults = await Promise.all(
      batchGroup.map((batch) => getElevationBatch(batch, signal))
    );

    for (const batchResult of batchResults) {
      results.push(...batchResult);
    }

    completedBatches += batchGroup.length;
    onProgress?.(completedBatches, batches.length);

    // Small delay between batch groups to avoid overwhelming API
    if (i + maxConcurrent < batches.length) {
      await delay(delayMs);
    }
  }

  return results;
}
