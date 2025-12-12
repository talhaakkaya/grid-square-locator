import { useState, useMemo, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import type { Map as LeafletMap } from 'leaflet';
import { LocationMarker, type GridInfo } from './LocationMarker';
import { GridSquareOverlay } from './GridSquareOverlay';
import { CoverageOverlay } from './CoverageOverlay';
import { SearchControl } from './SearchControl';
import { DockPanel } from './DockPanel';
import { Toast } from './Toast';
import { getMapStateFromURL, updateURLWithMapState, updateURLWithCoverage, clearMapStateFromURL, getAntennaHeightFromURL } from '../utils/urlParams';
import { latLngToMaidenhead, getPrecisionForZoom } from '../utils/maidenhead';
import { useElevation } from '../hooks/useElevation';
import { useGeolocation } from '../hooks/useGeolocation';
import { useCoverage } from '../hooks/useCoverage';
import type { LatLng } from '../types';
import './Map.css';

// Tile layer URLs
const TILE_URLS = {
  osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
};

interface MapProps {
  onLocationClick?: (location: LatLng) => void;
}

export function Map({ onLocationClick }: MapProps) {
  const gridVisible = false;
  const mapRef = useRef<LeafletMap | null>(null);
  const [markerPosition, setMarkerPosition] = useState<LatLng | null>(null);
  const [coverageCalcPosition, setCoverageCalcPosition] = useState<LatLng | null>(null);
  const [coverageCalcGridSquare, setCoverageCalcGridSquare] = useState<string | null>(null);
  const [currentTileUrl, setCurrentTileUrl] = useState(TILE_URLS.dark);

  const { data: elevation, isLoading: elevationLoading, error: elevationError } = useElevation(markerPosition);

  const initialState = useMemo(() => {
    const urlState = getMapStateFromURL();
    if (urlState) {
      return {
        center: [urlState.center.lat, urlState.center.lng] as [number, number],
        zoom: urlState.zoom,
        gridSquare: urlState.gridSquare,
      };
    }
    return {
      center: [41.0082, 28.9784] as [number, number],
      zoom: 6,
      gridSquare: null as string | null,
    };
  }, []);

  const defaultCenter = initialState.center;
  const defaultZoom = initialState.zoom;
  const [selectedQth, setSelectedQth] = useState<string | null>(initialState.gridSquare);

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
    clearMapStateFromURL();
  };

  const { getCurrentLocation, isLocating, error: geolocationError, clearError } = useGeolocation();
  const {
    calculateCoverage,
    cancelCalculation,
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
    // Update URL for sharing
    updateURLWithCoverage(fullPrecisionGrid, antennaHeight);
  };

  useEffect(() => {
    if (!isCoverageCalculating) {
      setCoverageCalcPosition(null);
      setCoverageCalcGridSquare(null);
    }
  }, [isCoverageCalculating]);

  // Fit map to coverage bounds when new coverage is added
  const prevCoverageCountRef = useRef(coverageDataList.length);
  useEffect(() => {
    if (coverageDataList.length > prevCoverageCountRef.current && mapRef.current) {
      const latestCoverage = coverageDataList[coverageDataList.length - 1];
      const allPoints: [number, number][] = [];

      // Collect all visible points from the latest coverage
      for (const ray of latestCoverage.rays) {
        for (const point of ray.visiblePoints) {
          allPoints.push([point.position.lat, point.position.lng]);
        }
      }

      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints);
        mapRef.current.fitBounds(bounds, { padding: [20, 20], duration: 1 });
      }
    }
    prevCoverageCountRef.current = coverageDataList.length;
  }, [coverageDataList]);

  // Track base layer changes for export
  useEffect(() => {
    // Small delay to ensure map is fully initialized
    const timer = setTimeout(() => {
      const map = mapRef.current;
      if (!map) return;

      const handleBaseLayerChange = (e: L.LayersControlEvent) => {
        const layerName = e.name;
        if (layerName === 'OpenStreetMap') {
          setCurrentTileUrl(TILE_URLS.osm);
        } else if (layerName === 'Satellite') {
          setCurrentTileUrl(TILE_URLS.satellite);
        } else if (layerName === 'Dark') {
          setCurrentTileUrl(TILE_URLS.dark);
        }
      };

      map.on('baselayerchange', handleBaseLayerChange);
    }, 100);

    return () => {
      clearTimeout(timer);
      mapRef.current?.off('baselayerchange');
    };
  }, []);

  const handleGetCurrentLocation = async () => {
    const location = await getCurrentLocation();
    if (!location || !mapRef.current) return;

    const zoom = 18;
    const precision = getPrecisionForZoom(zoom);
    const gridSquare = latLngToMaidenhead(location.lat, location.lng, precision);
    updateURLWithMapState(location, zoom, getAntennaHeightFromURL() ?? 25, gridSquare);
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
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution='&copy; <a href="https://www.arcgis.com/">Esri</a> &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={18}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer checked name="Dark">
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              maxZoom={20}
            />
          </LayersControl.BaseLayer>
          <LayersControl.Overlay name="Labels">
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
          onCancelCalculation={cancelCalculation}
          isCalculating={isCoverageCalculating}
          calculatingPosition={coverageCalcPosition}
          calculatingGridSquare={coverageCalcGridSquare}
          calculatingProgress={coverageProgress?.percentage}
          tileLayerUrl={currentTileUrl}
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
        <SearchControl
          onGetCurrentLocation={handleGetCurrentLocation}
          isLocating={isLocating}
          geolocationError={geolocationError}
          onClearGeolocationError={clearError}
          onResultSelect={(result) => {
            const precision = result.gridSquare.length as 2 | 4 | 6 | 8 | 10;
            const zoom = precision === 2 ? 4 : precision === 4 ? 7 : precision === 6 ? 11 : precision === 8 ? 15 : 18;
            updateURLWithMapState(
              { lat: result.lat, lng: result.lng },
              zoom,
              getAntennaHeightFromURL() ?? 25,
              result.gridSquare
            );
            handleGridSelect({
              locator: result.gridSquare,
              center: { lat: result.lat, lng: result.lng },
            });
          }}
        />
      </MapContainer>
      <DockPanel visible={true} />
      <Toast message={coverageError} onClose={clearCoverageError} />
    </>
  );
}
