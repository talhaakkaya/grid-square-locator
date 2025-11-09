/**
 * Custom hook for handling map search functionality
 */

import { useCallback } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { isValidGridSquare, normalizeGridSquare } from '../utils/validation';
import { maidenheadToBounds, latLngToMaidenhead, getZoomForPrecision, getPrecisionForZoom } from '../utils/maidenhead';
import { searchLocation } from '../services/nominatimService';
import { updateURLWithMapState } from '../utils/urlParams';
import type { LatLng, GridPrecision } from '../types';
import type { GridInfo } from '../components/LocationMarker';

interface UseMapSearchProps {
  mapRef: React.RefObject<LeafletMap | null>;
  onGridSelect: (info: GridInfo) => void;
}

/**
 * Hook to handle both grid square and location name searches
 * @param mapRef Reference to the Leaflet map instance
 * @param onGridSelect Callback when a grid square is selected
 * @returns Object with handleSearch function
 */
export function useMapSearch({ mapRef, onGridSelect }: UseMapSearchProps) {
  const handleSearch = useCallback(async (query: string) => {
    if (isValidGridSquare(query)) {
      // Handle grid square search
      try {
        const bounds = maidenheadToBounds(query);
        const center: LatLng = {
          lat: (bounds.southwest.lat + bounds.northeast.lat) / 2,
          lng: (bounds.southwest.lng + bounds.northeast.lng) / 2,
        };

        // Determine zoom based on grid square precision
        const precision = query.length as GridPrecision;
        const zoom = getZoomForPrecision(precision);

        const gridSquare = normalizeGridSquare(query);

        // Update URL with exact grid square
        updateURLWithMapState(center, zoom, gridSquare);

        // Fly to location
        if (mapRef.current) {
          mapRef.current.flyTo([center.lat, center.lng], zoom);
        }

        // Update grid info
        onGridSelect({
          locator: gridSquare,
          center,
        });
      } catch (error) {
        console.error('Invalid grid square:', error);
      }
    } else {
      // Handle location name search
      try {
        const results = await searchLocation(query);
        if (results && results.length > 0) {
          const result = results[0];
          const center: LatLng = {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
          };

          const precision: GridPrecision = 6; // Match search results precision
          const zoom = getZoomForPrecision(precision);
          const gridSquare = latLngToMaidenhead(center.lat, center.lng, precision);

          // Update URL
          updateURLWithMapState(center, zoom);

          // Fly to location
          if (mapRef.current) {
            mapRef.current.flyTo([center.lat, center.lng], zoom);
          }

          // Update grid info
          onGridSelect({
            locator: gridSquare,
            center,
          });
        }
      } catch (error) {
        console.error('Error searching location:', error);
      }
    }
  }, [mapRef, onGridSelect]);

  return { handleSearch };
}
