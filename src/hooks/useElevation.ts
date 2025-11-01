import { useQuery } from '@tanstack/react-query';
import { getElevation } from '../services/elevationService';
import { getGridSquareCenter } from '../utils/gridBounds';
import { CACHE_DURATIONS } from '../utils/constants';

/**
 * Custom hook to fetch and cache elevation data for a grid square
 * @param gridLocator - Maidenhead grid square locator (e.g., "KN41ka")
 * @returns React Query result with elevation data, loading state, and error
 */
export function useElevation(gridLocator: string | null) {
  return useQuery({
    queryKey: ['elevation', gridLocator],
    queryFn: async () => {
      if (!gridLocator) {
        throw new Error('Grid locator is required');
      }

      const centerPoint = getGridSquareCenter(gridLocator);
      const elevationData = await getElevation(centerPoint);

      return elevationData.elevation;
    },
    enabled: !!gridLocator, // Only run query if gridLocator is provided
    staleTime: CACHE_DURATIONS.QUERY_STALE,
    gcTime: CACHE_DURATIONS.ELEVATION,
    retry: 2,
  });
}
