/**
 * Custom hook for search with autocomplete results
 */

import { useState, useEffect, useRef } from 'react';
import { searchLocation } from '../services/nominatimService';
import { maidenheadToBounds, latLngToMaidenhead } from '../utils/maidenhead';
import { isValidGridSquare, normalizeGridSquare } from '../utils/validation';
import { DEBOUNCE_DELAYS } from '../utils/constants';
import type { SearchResult } from '../components/SearchResults';

/**
 * Hook to handle search with debouncing and autocomplete results
 * @param searchQuery Current search query string
 * @returns Object with search results and loading state
 */
export function useSearchWithResults(searchQuery: string) {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);

      try {
        if (isValidGridSquare(searchQuery)) {
          // Grid square search - validate and show confirmation
          try {
            const bounds = maidenheadToBounds(searchQuery.trim());
            const centerLat = (bounds.southwest.lat + bounds.northeast.lat) / 2;
            const centerLng = (bounds.southwest.lng + bounds.northeast.lng) / 2;

            setSearchResults([{
              id: 'grid-1',
              type: 'grid',
              name: normalizeGridSquare(searchQuery),
              gridSquare: normalizeGridSquare(searchQuery),
              lat: centerLat,
              lng: centerLng,
            }]);
          } catch {
            setSearchResults([]);
          }
        } else {
          // Location name search
          const results = await searchLocation(searchQuery.trim(), 5);
          const searchResultList: SearchResult[] = results.map((result, index) => {
            const lat = parseFloat(result.lat);
            const lng = parseFloat(result.lon);
            const grid = latLngToMaidenhead(lat, lng, 6);

            return {
              id: `location-${index}`,
              type: 'location' as const,
              name: result.display_name,
              gridSquare: grid,
              lat,
              lng,
            };
          });

          setSearchResults(searchResultList);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, DEBOUNCE_DELAYS.SEARCH);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  return { searchResults, isSearching };
}
