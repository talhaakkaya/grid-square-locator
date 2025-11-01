import { useState, useMemo } from 'react';
import { Rectangle, useMap, useMapEvents } from 'react-leaflet';
import type { LatLngBounds } from 'leaflet';
import { getPrecisionForZoom } from '../utils/maidenhead';
import { getVisibleGridSquares } from '../utils/gridBounds';
import type { GridSquareInfo, GridPrecision } from '../types';

interface GridSquareOverlayProps {
  visible?: boolean;
}

export function GridSquareOverlay({ visible = true }: GridSquareOverlayProps) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const [bounds, setBounds] = useState<LatLngBounds>(map.getBounds());
  const [precision, setPrecision] = useState<GridPrecision>(getPrecisionForZoom(zoom));

  // Update on map movement
  useMapEvents({
    zoomend: () => {
      const newZoom = map.getZoom();
      setZoom(newZoom);
      setPrecision(getPrecisionForZoom(newZoom));
    },
    moveend: () => {
      setBounds(map.getBounds());
    },
  });

  // Calculate visible grid squares
  const gridSquares = useMemo(() => {
    if (!visible) return [];

    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    return getVisibleGridSquares(
      { lat: sw.lat, lng: sw.lng },
      { lat: ne.lat, lng: ne.lng },
      precision
    );
  }, [bounds, precision, visible, zoom]);

  if (!visible || gridSquares.length === 0) {
    return null;
  }

  // Determine color based on precision
  const getGridColor = (prec: GridPrecision): string => {
    switch (prec) {
      case 2:
        return '#FF6B6B'; // Red for fields
      case 4:
        return '#4ECDC4'; // Teal for squares
      case 6:
        return '#95E1D3'; // Light teal for subsquares
      case 8:
        return '#F38181'; // Pink for extended
      case 10:
        return '#AA96DA'; // Purple for super extended
    }
  };

  const color = getGridColor(precision);

  return (
    <>
      {gridSquares.map((square: GridSquareInfo, index: number) => {
        const bounds: [[number, number], [number, number]] = [
          [square.bounds.southwest.lat, square.bounds.southwest.lng],
          [square.bounds.northeast.lat, square.bounds.northeast.lng],
        ];

        return (
          <Rectangle
            key={`${square.locator}-${index}`}
            bounds={bounds}
            pathOptions={{
              color: color,
              weight: 1,
              fillOpacity: 0.05,
              opacity: 0.4,
            }}
          />
        );
      })}
    </>
  );
}
