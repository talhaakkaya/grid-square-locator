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
