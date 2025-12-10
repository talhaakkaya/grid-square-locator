export interface LatLng {
  lat: number;
  lng: number;
}

export interface GridSquareBounds {
  southwest: LatLng;
  northeast: LatLng;
  center: LatLng;
}

export interface GridSquareInfo {
  locator: string;
  precision: GridPrecision;
  bounds: GridSquareBounds;
}

export type GridPrecision = 2 | 4 | 6 | 8 | 10;

export interface ElevationData {
  latitude: number;
  longitude: number;
  elevation: number;
}

export interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  importance?: number;
}

// LOS Coverage Types
export interface VisiblePoint {
  distance: number;     // Distance from observer in km
  position: LatLng;     // Geographic coordinates
}

export interface CoverageRay {
  bearing: number;           // 0-359 degrees
  visiblePoints: VisiblePoint[];  // All visible points along this radial
  maxDistance: number;       // Furthest visible distance (for color scaling)
}

export interface CoverageData {
  id: string;               // Unique identifier
  center: LatLng;           // Observer location
  antennaHeight: number;    // Antenna height in meters
  rays: CoverageRay[];      // 360 rays, one per degree
  calculatedAt: number;     // Timestamp for cache invalidation
  gridSquare?: string;      // Grid square label for the center
  colorIndex?: number;      // Deprecated - color now based on array index
}

export interface CoverageProgress {
  currentBearing: number;   // Current bearing being calculated
  totalBearings: number;    // Always 360
  percentage: number;       // 0-100
}
