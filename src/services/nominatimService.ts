import type { NominatimResult } from '../types';
import { API_CONFIG, CACHE_DURATIONS, CACHE_KEYS } from '../utils/constants';
import { delay } from '../utils/async';

const USER_AGENT = 'GridSquareLocator/1.0';

interface CachedSearch {
  results: NominatimResult[];
  timestamp: number;
}

let lastRequestTime = 0;

/**
 * Get cached search results from localStorage
 */
function getCachedSearch(query: string): NominatimResult[] | null {
  const cacheKey = `${CACHE_KEYS.NOMINATIM}${query.toLowerCase()}`;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const parsedCache: CachedSearch = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - parsedCache.timestamp < CACHE_DURATIONS.NOMINATIM) {
      return parsedCache.results;
    }

    // Cache expired, remove it
    localStorage.removeItem(cacheKey);
    return null;
  } catch (error) {
    console.error('Error reading search cache:', error);
    return null;
  }
}

/**
 * Save search results to localStorage cache
 */
function setCachedSearch(query: string, results: NominatimResult[]): void {
  const cacheKey = `${CACHE_KEYS.NOMINATIM}${query.toLowerCase()}`;

  try {
    const cacheData: CachedSearch = {
      results,
      timestamp: Date.now(),
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error saving search cache:', error);
  }
}

/**
 * Rate limiter to ensure we don't exceed 1 request per second
 */
async function rateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < API_CONFIG.NOMINATIM_RATE_LIMIT) {
    const waitTime = API_CONFIG.NOMINATIM_RATE_LIMIT - timeSinceLastRequest;
    await delay(waitTime);
  }

  lastRequestTime = Date.now();
}

/**
 * Search for locations using Nominatim API
 * @param query Search query (place name, address, etc.)
 * @param limit Maximum number of results (default: 5)
 * @returns Array of search results
 */
export async function searchLocation(
  query: string,
  limit: number = 5
): Promise<NominatimResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const trimmedQuery = query.trim();

  // Check cache first
  const cached = getCachedSearch(trimmedQuery);
  if (cached) {
    return cached.slice(0, limit);
  }

  try {
    // Apply rate limiting
    await rateLimit();

    const params = new URLSearchParams({
      q: trimmedQuery,
      format: 'json',
      limit: limit.toString(),
      addressdetails: '1',
    });

    const response = await fetch(`${API_CONFIG.NOMINATIM_API_URL}?${params}`, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
    }

    const results: NominatimResult[] = await response.json();

    // Cache the results
    setCachedSearch(trimmedQuery, results);

    return results;
  } catch (error) {
    console.error('Error searching location:', error);
    throw error;
  }
}

/**
 * Create a debounced search function
 * @param delay Delay in milliseconds (default: 500ms)
 * @returns Debounced search function
 */
export function createDebouncedSearch(delay: number = 500) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (
    query: string,
    callback: (results: NominatimResult[]) => void,
    errorCallback?: (error: Error) => void
  ) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(async () => {
      try {
        const results = await searchLocation(query);
        callback(results);
      } catch (error) {
        if (errorCallback) {
          errorCallback(error as Error);
        }
      }
    }, delay);
  };
}
