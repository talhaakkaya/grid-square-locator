import { useState, useEffect, useRef, useMemo } from 'react';
import { Rectangle, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Marker as LeafletMarker, DragEndEvent } from 'leaflet';
import { Grid3x3, MapPin, Mountain, TowerControl, Eye, Loader2 } from 'lucide-react';
import { getGridSquareInfo, getPrecisionForZoom, maidenheadToBounds } from '../utils/maidenhead';

const blueMarkerIcon = L.icon({
  iconUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41"%3E%3Cpath fill="%233388ff" d="M12.5 0C5.596 0 0 5.596 0 12.5c0 1.104.151 2.174.41 3.196C2.661 25.933 12.5 41 12.5 41s9.839-15.067 12.09-25.304c.259-1.022.41-2.092.41-3.196C25 5.596 19.404 0 12.5 0z"/%3E%3Ccircle fill="%23fff" cx="12.5" cy="12.5" r="7"/%3E%3C/svg%3E',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -49],
});
import { updateURLWithMapState } from '../utils/urlParams';
import { formatElevation } from '../services/elevationService';
import { DEFAULTS, STORAGE_KEYS } from '../utils/constants';
import type { LatLng, CoverageProgress } from '../types';

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
  skipInitialPopup?: boolean;
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
  isInitial?: boolean;
}

export function LocationMarker({
  onLocationClick,
  onGridSelect,
  onMarkerMove,
  onClearSelection,
  initialQth,
  skipInitialPopup,
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

  const [antennaHeight, setAntennaHeight] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.ANTENNA_HEIGHT);
    return stored ? parseInt(stored, 10) : DEFAULTS.ANTENNA_HEIGHT_M;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ANTENNA_HEIGHT, antennaHeight.toString());
  }, [antennaHeight]);

  const onLocationClickRef = useRef(onLocationClick);
  const onGridSelectRef = useRef(onGridSelect);
  const onMarkerMoveRef = useRef(onMarkerMove);
  const onClearSelectionRef = useRef(onClearSelection);

  useEffect(() => { onLocationClickRef.current = onLocationClick; }, [onLocationClick]);
  useEffect(() => { onGridSelectRef.current = onGridSelect; }, [onGridSelect]);
  useEffect(() => { onMarkerMoveRef.current = onMarkerMove; }, [onMarkerMove]);
  useEffect(() => { onClearSelectionRef.current = onClearSelection; }, [onClearSelection]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gridData) {
        setGridData(null);
        initialLoadDone.current = false;
        onClearSelectionRef.current?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gridData]);

  const handleClearSelection = () => {
    setGridData(null);
    initialLoadDone.current = false;
    onClearSelectionRef.current?.();
  };

  const constrainToBounds = (
    pos: LatLng,
    bounds: [[number, number], [number, number]]
  ): LatLng => {
    const [[swLat, swLng], [neLat, neLng]] = bounds;
    return {
      lat: Math.max(swLat, Math.min(neLat, pos.lat)),
      lng: Math.max(swLng, Math.min(neLng, pos.lng)),
    };
  };

  const handleDragEnd = (e: DragEndEvent) => {
    if (!gridData) return;
    const marker = e.target;
    const newPos = marker.getLatLng();
    const constrained = constrainToBounds({ lat: newPos.lat, lng: newPos.lng }, gridData.bounds);

    setGridData((prev) => prev ? { ...prev, markerPosition: constrained } : null);

    if (constrained.lat !== newPos.lat || constrained.lng !== newPos.lng) {
      marker.setLatLng([constrained.lat, constrained.lng]);
    }

    onMarkerMoveRef.current?.(constrained);
    setTimeout(() => markerRef.current?.openPopup(), 100);
  };

  const markerEventHandlers = useMemo(
    () => ({ dragend: handleDragEnd, popupclose: handleClearSelection }),
    [gridData]
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
      const gridBounds: [[number, number], [number, number]] = [
        [bounds.southwest.lat, bounds.southwest.lng],
        [bounds.northeast.lat, bounds.northeast.lng],
      ];
      const center: LatLng = {
        lat: (bounds.southwest.lat + bounds.northeast.lat) / 2,
        lng: (bounds.southwest.lng + bounds.northeast.lng) / 2,
      };
      const locator = initialQth.toUpperCase();
      const newGridData = { bounds: gridBounds, center, markerPosition: center, locator, isInitial: true };
      setGridData(newGridData);
      gridDataRef.current = newGridData;

      onGridSelectRef.current?.({ locator, center });
      onMarkerMoveRef.current?.(center);
      if (!skipInitialPopup) {
        setTimeout(() => markerRef.current?.openPopup(), 100);
      }
    } catch (error) {
      console.error('Error loading initial grid square:', error);
    }
  }, [initialQth]);

  const isInsideBounds = (
    point: LatLng,
    bounds: [[number, number], [number, number]] | null
  ): boolean => {
    if (!bounds) return false;
    const [[swLat, swLng], [neLat, neLng]] = bounds;
    return (
      point.lat >= swLat &&
      point.lat <= neLat &&
      point.lng >= swLng &&
      point.lng <= neLng
    );
  };

  const map = useMapEvents({
    click(e) {
      const clickedPoint: LatLng = { lat: e.latlng.lat, lng: e.latlng.lng };
      const currentGridData = gridDataRef.current;

      if (currentGridData && isInsideBounds(clickedPoint, currentGridData.bounds)) {
        const updatedGridData = { ...currentGridData, markerPosition: clickedPoint };
        setGridData(updatedGridData);
        gridDataRef.current = updatedGridData;
        onMarkerMoveRef.current?.(clickedPoint);
        setTimeout(() => markerRef.current?.openPopup(), 100);
        return;
      }

      const zoom = map.getZoom();
      const precision = getPrecisionForZoom(zoom);
      const gridInfo = getGridSquareInfo(e.latlng.lat, e.latlng.lng, precision);
      const bounds: [[number, number], [number, number]] = [
        [gridInfo.bounds.southwest.lat, gridInfo.bounds.southwest.lng],
        [gridInfo.bounds.northeast.lat, gridInfo.bounds.northeast.lng],
      ];
      const center: LatLng = { lat: gridInfo.bounds.center.lat, lng: gridInfo.bounds.center.lng };
      const newGridData = { bounds, center, markerPosition: center, locator: gridInfo.locator, isInitial: false };
      setGridData(newGridData);
      gridDataRef.current = newGridData;

      onGridSelectRef.current?.({ locator: gridInfo.locator, center });
      onMarkerMoveRef.current?.(center);
      updateURLWithMapState({ lat: e.latlng.lat, lng: e.latlng.lng }, zoom);
      onLocationClickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
      setTimeout(() => markerRef.current?.openPopup(), 100);
    },
  });

  if (!gridData || (skipInitialPopup && gridData.isInitial)) {
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
        draggable={true}
        icon={blueMarkerIcon}
        eventHandlers={markerEventHandlers}
        ref={markerRef}
      >
        <Popup closeOnClick={false} autoClose={false} autoPan={false}>
          <div className="grid-popup">
            <div className="popup-row">
              <Grid3x3 size={16} />
              <div className="popup-content">
                <div className="grid-level">
                  <span className="label">Grid Square</span>
                  <span className="value">{gridData.locator}</span>
                </div>
              </div>
            </div>
            <div className="popup-row">
              <MapPin size={16} />
              <div className="popup-content">
                <div>
                  <strong>Lat:</strong> {gridData.markerPosition.lat.toFixed(6)}
                </div>
                <div>
                  <strong>Lng:</strong> {gridData.markerPosition.lng.toFixed(6)}
                </div>
              </div>
            </div>
            <div className="popup-row">
              <Mountain size={16} />
              <div className="popup-content">
                {elevationLoading && (
                  <span className="elevation-loading">Loading...</span>
                )}
                {elevationError && (
                  <span className="elevation-error">{elevationError}</span>
                )}
                {elevation !== null && elevation !== undefined && !elevationLoading && (
                  <span className="elevation-value">{formatElevation(elevation)}</span>
                )}
                {!elevationLoading && !elevationError && elevation === null && (
                  <span className="elevation-loading">-</span>
                )}
              </div>
            </div>
            <div className="popup-row popup-coverage-row">
              <TowerControl size={16} />
              <div className="popup-coverage-controls">
                <input
                  type="number"
                  min="1"
                  max="9999"
                  value={antennaHeight}
                  onChange={(e) => setAntennaHeight(Math.max(1, Math.min(9999, parseInt(e.target.value, 10) || DEFAULTS.ANTENNA_HEIGHT_M)))}
                  className="popup-antenna-input"
                  title="Antenna height in meters"
                />
                <span className="popup-antenna-unit">m</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markerRef.current?.closePopup();
                    onGetCoverage?.(antennaHeight);
                  }}
                  disabled={isCoverageCalculating}
                  className={`popup-coverage-button ${isCoverageCalculating ? 'loading' : ''}`}
                  title={isCoverageCalculating ? `Calculating... ${coverageProgress?.percentage || 0}%` : 'Calculate line-of-sight coverage'}
                >
                  {isCoverageCalculating ? (
                    <>
                      <Loader2 size={14} className="spinner" />
                      <span>{coverageProgress?.percentage || 0}%</span>
                    </>
                  ) : (
                    <>
                      <Eye size={14} />
                      <span>Coverage</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </Popup>
      </Marker>
    </>
  );
}
