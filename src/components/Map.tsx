import { useState, useMemo, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, LayersControl } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import { LocationMarker, type GridInfo } from './LocationMarker';
import { GridSquareOverlay } from './GridSquareOverlay';
import { CoverageOverlay } from './CoverageOverlay';
import { DockPanel } from './DockPanel';
import { Toast } from './Toast';
import { getMapStateFromURL, updateURLWithMapState } from '../utils/urlParams';
import { latLngToMaidenhead, getPrecisionForZoom } from '../utils/maidenhead';
import { useElevation } from '../hooks/useElevation';
import { useMapSearch } from '../hooks/useMapSearch';
import { useGeolocation } from '../hooks/useGeolocation';
import { useCoverage } from '../hooks/useCoverage';
import type { LatLng } from '../types';
import './Map.css';

interface MapProps {
  onLocationClick?: (location: LatLng) => void;
}

export function Map({ onLocationClick }: MapProps) {
  const gridVisible = false;
  const mapRef = useRef<LeafletMap | null>(null);
  const [markerPosition, setMarkerPosition] = useState<LatLng | null>(null);
  const [coverageCalcPosition, setCoverageCalcPosition] = useState<LatLng | null>(null);
  const [coverageCalcGridSquare, setCoverageCalcGridSquare] = useState<string | null>(null);

  const { data: elevation, isLoading: elevationLoading, error: elevationError } = useElevation(markerPosition);

  const initialState = useMemo(() => {
    const urlState = getMapStateFromURL();
    if (urlState) {
      return {
        center: [urlState.center.lat, urlState.center.lng] as [number, number],
        zoom: urlState.zoom,
      };
    }
    return {
      center: [41.0082, 28.9784] as [number, number],
      zoom: 6,
    };
  }, []);

  const defaultCenter = initialState.center;
  const defaultZoom = initialState.zoom;
  const params = new URLSearchParams(window.location.search);
  const initialQth = params.get('qth');
  const [selectedQth, setSelectedQth] = useState<string | null>(initialQth);

  const handleGridSelect = (info: GridInfo) => {
    setMarkerPosition(info.center);
    setSelectedQth(info.locator);
  };

  const handleMarkerMove = (position: LatLng) => {
    setMarkerPosition(position);
  };

  const handleClearSelection = () => {
    setMarkerPosition(null);
    setSelectedQth(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('qth');
    window.history.replaceState({}, '', url.toString());
  };

  const { handleSearch } = useMapSearch({ mapRef, onGridSelect: handleGridSelect });
  const { getCurrentLocation, isLocating, error: geolocationError, clearError } = useGeolocation();
  const {
    calculateCoverage,
    isCalculating: isCoverageCalculating,
    progress: coverageProgress,
    error: coverageError,
    coverageDataList,
    clearCoverage,
    clearError: clearCoverageError,
  } = useCoverage();

  const handleGetCoverage = (antennaHeight: number) => {
    if (!markerPosition) return;
    const fullPrecisionGrid = latLngToMaidenhead(markerPosition.lat, markerPosition.lng, 10);
    setCoverageCalcPosition(markerPosition);
    setCoverageCalcGridSquare(fullPrecisionGrid);
    calculateCoverage(markerPosition, antennaHeight, fullPrecisionGrid);
  };

  useEffect(() => {
    if (!isCoverageCalculating) {
      setCoverageCalcPosition(null);
      setCoverageCalcGridSquare(null);
    }
  }, [isCoverageCalculating]);

  const handleGetCurrentLocation = async () => {
    const location = await getCurrentLocation();
    if (!location || !mapRef.current) return;

    const zoom = 18;
    const precision = getPrecisionForZoom(zoom);
    const gridSquare = latLngToMaidenhead(location.lat, location.lng, precision);
    updateURLWithMapState(location, zoom, gridSquare);
    mapRef.current.flyTo([location.lat, location.lng], zoom);
    handleGridSelect({ locator: gridSquare, center: location });
  };

  return (
    <>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="map-container"
        zoomControl={true}
        ref={mapRef}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer name="OpenStreetMap">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer checked name="Satellite">
            <TileLayer
              attribution='&copy; <a href="https://www.arcgis.com/">Esri</a> &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={18}
            />
          </LayersControl.BaseLayer>
          <LayersControl.Overlay checked name="Labels">
            <TileLayer
              attribution='&copy; <a href="https://www.arcgis.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              maxZoom={18}
            />
          </LayersControl.Overlay>
        </LayersControl>
        <GridSquareOverlay visible={gridVisible} />
        <CoverageOverlay
          coverageDataList={coverageDataList}
          currentMarkerPosition={markerPosition}
          onClearCoverage={clearCoverage}
          isCalculating={isCoverageCalculating}
          calculatingPosition={coverageCalcPosition}
          calculatingGridSquare={coverageCalcGridSquare}
          calculatingProgress={coverageProgress?.percentage}
        />
        <LocationMarker
          onLocationClick={onLocationClick}
          onGridSelect={handleGridSelect}
          onMarkerMove={handleMarkerMove}
          onClearSelection={handleClearSelection}
          initialQth={selectedQth}
          elevation={elevation ?? null}
          elevationLoading={elevationLoading}
          elevationError={elevationError ? 'Unable to fetch elevation' : null}
          onGetCoverage={handleGetCoverage}
          isCoverageCalculating={isCoverageCalculating}
          coverageProgress={coverageProgress}
        />
      </MapContainer>
      <DockPanel
        onSearch={handleSearch}
        onGetCurrentLocation={handleGetCurrentLocation}
        isLocating={isLocating}
        geolocationError={geolocationError}
        onClearGeolocationError={clearError}
        visible={true}
      />
      <Toast message={coverageError} onClose={clearCoverageError} />
    </>
  );
}
