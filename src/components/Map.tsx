import { useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, LayersControl } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import { LocationMarker, type GridInfo } from './LocationMarker';
import { GridSquareOverlay } from './GridSquareOverlay';
import { DockPanel } from './DockPanel';
import { getMapStateFromURL } from '../utils/urlParams';
import { useElevation } from '../hooks/useElevation';
import { useMapSearch } from '../hooks/useMapSearch';
import type { LatLng } from '../types';
import './Map.css';

interface MapProps {
  onLocationClick?: (location: LatLng) => void;
}

export function Map({ onLocationClick }: MapProps) {
  const gridVisible = false; // Grid overlay feature currently disabled
  const mapRef = useRef<LeafletMap | null>(null);

  // Dock state
  const [gridInfo, setGridInfo] = useState<GridInfo | null>(null);

  // Use React Query for elevation caching
  const { data: elevation, isLoading: elevationLoading, error: elevationError } = useElevation(gridInfo?.locator || null);

  // Get initial position from URL or use default
  const initialState = useMemo(() => {
    const urlState = getMapStateFromURL();

    if (urlState) {
      return {
        center: [urlState.center.lat, urlState.center.lng] as [number, number],
        zoom: urlState.zoom,
      };
    }
    // Default fallback when no qth parameter
    return {
      center: [39.8283, -98.5795] as [number, number],
      zoom: 4,
    };
  }, []);

  const defaultCenter = initialState.center;
  const defaultZoom = initialState.zoom;

  // Get qth from URL to pass to LocationMarker
  const params = new URLSearchParams(window.location.search);
  const initialQth = params.get('qth');

  // Handle grid selection (from click or URL)
  const handleGridSelect = (info: GridInfo) => {
    setGridInfo(info);
    // Elevation is now automatically fetched and cached by React Query
  };

  // Use map search hook
  const { handleSearch } = useMapSearch({
    mapRef,
    onGridSelect: handleGridSelect,
  });

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
          <LayersControl.BaseLayer checked name="OpenStreetMap">
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
          <LayersControl.Overlay name="Labels">
            <TileLayer
              attribution='&copy; <a href="https://www.arcgis.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              maxZoom={18}
            />
          </LayersControl.Overlay>
        </LayersControl>
        <GridSquareOverlay visible={gridVisible} />
        <LocationMarker
          onLocationClick={onLocationClick}
          onGridSelect={handleGridSelect}
          initialQth={initialQth}
        />
      </MapContainer>
      <DockPanel
        gridSquare={gridInfo?.locator || null}
        coordinates={gridInfo?.center || null}
        elevation={elevation ?? null}
        elevationLoading={elevationLoading}
        elevationError={elevationError ? 'Unable to fetch elevation' : null}
        onSearch={handleSearch}
        visible={true}
      />
    </>
  );
}
