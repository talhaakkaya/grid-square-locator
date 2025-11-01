import { useState, useEffect, useRef } from 'react';
import { Rectangle, useMapEvents } from 'react-leaflet';
import { getGridSquareInfo, getPrecisionForZoom, maidenheadToBounds } from '../utils/maidenhead';
import { updateURLWithMapState } from '../utils/urlParams';
import type { LatLng } from '../types';

export interface GridInfo {
  locator: string;
  center: LatLng;
}

interface LocationMarkerProps {
  onLocationClick?: (location: LatLng) => void;
  onGridSelect?: (gridInfo: GridInfo) => void;
  initialQth?: string | null;
}

interface GridData {
  bounds: [[number, number], [number, number]];
}

export function LocationMarker({ onLocationClick, onGridSelect, initialQth }: LocationMarkerProps) {
  const [gridData, setGridData] = useState<GridData | null>(null);

  // Store callbacks in refs to avoid recreating effects when they change
  const onLocationClickRef = useRef(onLocationClick);
  const onGridSelectRef = useRef(onGridSelect);

  // Update refs when callbacks change
  useEffect(() => {
    onLocationClickRef.current = onLocationClick;
  }, [onLocationClick]);

  useEffect(() => {
    onGridSelectRef.current = onGridSelect;
  }, [onGridSelect]);

  // Load initial grid square from URL parameter
  useEffect(() => {
    if (!initialQth) return;

    try {
      const bounds = maidenheadToBounds(initialQth);

      const gridBounds: [[number, number], [number, number]] = [
        [bounds.southwest.lat, bounds.southwest.lng],
        [bounds.northeast.lat, bounds.northeast.lng],
      ];

      const center: LatLng = {
        lat: (bounds.southwest.lat + bounds.northeast.lat) / 2,
        lng: (bounds.southwest.lng + bounds.northeast.lng) / 2,
      };

      setGridData({
        bounds: gridBounds,
      });

      // Notify parent about grid selection
      if (onGridSelectRef.current) {
        onGridSelectRef.current({
          locator: initialQth.toUpperCase(),
          center,
        });
      }
    } catch (error) {
      console.error('Error loading initial grid square:', error);
    }
  }, [initialQth]);

  const map = useMapEvents({
    click(e) {
      const zoom = map.getZoom();
      const precision = getPrecisionForZoom(zoom);
      const gridInfo = getGridSquareInfo(e.latlng.lat, e.latlng.lng, precision);

      // Calculate bounds for the rectangle
      const bounds: [[number, number], [number, number]] = [
        [gridInfo.bounds.southwest.lat, gridInfo.bounds.southwest.lng],
        [gridInfo.bounds.northeast.lat, gridInfo.bounds.northeast.lng],
      ];

      const center: LatLng = {
        lat: gridInfo.bounds.center.lat,
        lng: gridInfo.bounds.center.lng,
      };

      setGridData({ bounds });

      // Notify parent about grid selection
      if (onGridSelectRef.current) {
        onGridSelectRef.current({
          locator: gridInfo.locator,
          center,
        });
      }

      // Update URL with grid square
      updateURLWithMapState({ lat: e.latlng.lat, lng: e.latlng.lng }, zoom);

      if (onLocationClickRef.current) {
        onLocationClickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });

  if (!gridData) {
    return null;
  }

  return (
    <Rectangle
      bounds={gridData.bounds}
      pathOptions={{
        color: '#FF0000',
        weight: 3,
        fillOpacity: 0.15,
        opacity: 0.8,
      }}
    />
  );
}
