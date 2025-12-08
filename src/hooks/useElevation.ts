import { useQuery } from '@tanstack/react-query';
import { getElevation } from '../services/elevationService';
import { CACHE_DURATIONS } from '../utils/constants';
import type { LatLng } from '../types';

/**
 * Custom hook to fetch and cache elevation data for a specific coordinate
 * @param position - Latitude and longitude coordinates
 * @returns React Query result with elevation data, loading state, and error
 */
export function useElevation(position: LatLng | null) {
  // Round coordinates for cache key consistency (4 decimal places ≈ 11m precision)
  const cacheKey = position
    ? `${position.lat.toFixed(4)},${position.lng.toFixed(4)}`
    : null;

  return useQuery({
    queryKey: ['elevation', cacheKey],
    queryFn: async () => {
      if (!position) {
        throw new Error('Position is required');
      }

      const elevationData = await getElevation(position);
      return elevationData.elevation;
    },
    enabled: !!position,
    staleTime: CACHE_DURATIONS.QUERY_STALE,
    gcTime: CACHE_DURATIONS.ELEVATION,
    retry: 2,
  });
}
