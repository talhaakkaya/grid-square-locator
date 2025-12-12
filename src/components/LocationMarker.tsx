import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Rectangle, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Marker as LeafletMarker } from 'leaflet';
import { getGridSquareInfo, getPrecisionForZoom, maidenheadToBounds } from '../utils/maidenhead';
import { getBoundsCenter, boundsToLeafletArray } from '../utils/geoUtils';
import { useCallbackRef } from '../hooks/useCallbackRef';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { LocationPopup } from './LocationPopup';
import { updateURLWithMapState, getAntennaHeightFromURL } from '../utils/urlParams';
import type { LatLng, CoverageProgress } from '../types';

const blueMarkerIcon = L.icon({
  iconUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41"%3E%3Cpath fill="%233388ff" d="M12.5 0C5.596 0 0 5.596 0 12.5c0 1.104.151 2.174.41 3.196C2.661 25.933 12.5 41 12.5 41s9.839-15.067 12.09-25.304c.259-1.022.41-2.092.41-3.196C25 5.596 19.404 0 12.5 0z"/%3E%3Ccircle fill="%23fff" cx="12.5" cy="12.5" r="7"/%3E%3C/svg%3E',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -49],
});

export interface GridInfo {
  locator: string;
  center: LatLng;
}

interface LocationMarkerProps {
  onLocationClick?: (location: LatLng) => void;
  onGridSelect?: (gridInfo: GridInfo) => void;
  onMarkerMove?: (position: LatLng) => void;
  onClearSelection?: () => void;
  initialQth?: string | null;
  elevation?: number | null;
  elevationLoading?: boolean;
  elevationError?: string | null;
  onGetCoverage?: (antennaHeight: number) => void;
  isCoverageCalculating?: boolean;
  coverageProgress?: CoverageProgress | null;
}

interface GridData {
  bounds: [[number, number], [number, number]];
  center: LatLng;
  markerPosition: LatLng;
  locator: string;
}

export function LocationMarker({
  onLocationClick,
  onGridSelect,
  onMarkerMove,
  onClearSelection,
  initialQth,
  elevation,
  elevationLoading,
  elevationError,
  onGetCoverage,
  isCoverageCalculating,
  coverageProgress,
}: LocationMarkerProps) {
  const [gridData, setGridData] = useState<GridData | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const gridDataRef = useRef<GridData | null>(null);
  const initialLoadDone = useRef(false);
  const prevInitialQth = useRef<string | null | undefined>(null);

  useEffect(() => {
    gridDataRef.current = gridData;
  }, [gridData]);

  // Callback ref to open popup when marker is mounted
  const setMarkerRef = useCallback((marker: LeafletMarker | null) => {
    markerRef.current = marker;
    if (marker && gridData) {
      marker.openPopup();
    }
  }, [gridData]);

  const [antennaHeight, setAntennaHeight] = useState<number>(() => {
    return getAntennaHeightFromURL() ?? 25;
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qth = params.get('qth');
    if (qth) {
      params.set('ant', antennaHeight.toString());
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    }
  }, [antennaHeight]);

  const onLocationClickRef = useCallbackRef(onLocationClick);
  const onGridSelectRef = useCallbackRef(onGridSelect);
  const onMarkerMoveRef = useCallbackRef(onMarkerMove);
  const onClearSelectionRef = useCallbackRef(onClearSelection);

  const handleClearSelection = useCallback(() => {
    setGridData(null);
    initialLoadDone.current = false;
    onClearSelectionRef.current?.();
  }, [onClearSelectionRef]);

  // Handle Escape key to clear selection
  useEscapeKey(handleClearSelection, !!gridData);

  const markerEventHandlers = useMemo(
    () => ({ popupclose: handleClearSelection }),
    [handleClearSelection]
  );

  useEffect(() => {
    if (initialQth !== prevInitialQth.current) {
      initialLoadDone.current = false;
      prevInitialQth.current = initialQth;
    }

    if (!initialQth || initialLoadDone.current) return;
    initialLoadDone.current = true;
    try {
      const bounds = maidenheadToBounds(initialQth);
      const gridBounds = boundsToLeafletArray(bounds);
      const center = getBoundsCenter(bounds);
      const locator = initialQth.toUpperCase();
      const newGridData = { bounds: gridBounds, center, markerPosition: center, locator };
      setGridData(newGridData);
      gridDataRef.current = newGridData;

      onGridSelectRef.current?.({ locator, center });
      onMarkerMoveRef.current?.(center);
    } catch (error) {
      console.error('Error loading initial grid square:', error);
    }
  }, [initialQth]);

  const map = useMapEvents({
    click(e) {
      const zoom = map.getZoom();
      const precision = getPrecisionForZoom(zoom);
      const gridInfo = getGridSquareInfo(e.latlng.lat, e.latlng.lng, precision);
      const bounds = boundsToLeafletArray(gridInfo.bounds);
      const center: LatLng = gridInfo.bounds.center;
      const newGridData = { bounds, center, markerPosition: center, locator: gridInfo.locator };
      setGridData(newGridData);
      gridDataRef.current = newGridData;

      onGridSelectRef.current?.({ locator: gridInfo.locator, center });
      onMarkerMoveRef.current?.(center);
      updateURLWithMapState({ lat: e.latlng.lat, lng: e.latlng.lng }, zoom, antennaHeight);
      onLocationClickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  if (!gridData) {
    return null;
  }

  return (
    <>
      <Rectangle
        bounds={gridData.bounds}
        pathOptions={{
          color: '#FF0000',
          weight: 3,
          fillOpacity: 0.15,
          opacity: 0.8,
        }}
      />
      <Marker
        position={[gridData.markerPosition.lat, gridData.markerPosition.lng]}
        icon={blueMarkerIcon}
        eventHandlers={markerEventHandlers}
        ref={setMarkerRef}
      >
        <LocationPopup
          locator={gridData.locator}
          markerPosition={gridData.markerPosition}
          elevation={elevation}
          elevationLoading={elevationLoading}
          elevationError={elevationError}
          antennaHeight={antennaHeight}
          onAntennaHeightChange={setAntennaHeight}
          onGetCoverage={() => {
            markerRef.current?.closePopup();
            onGetCoverage?.(antennaHeight);
          }}
          isCoverageCalculating={isCoverageCalculating}
          coverageProgress={coverageProgress}
        />
      </Marker>
    </>
  );
}
