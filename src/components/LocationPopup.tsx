import { Popup } from 'react-leaflet';
import { Grid3x3, MapPin, Mountain } from 'lucide-react';
import { formatElevation } from '../services/elevationService';
import { CoverageControls } from './CoverageControls';
import type { LatLng, CoverageProgress } from '../types';

interface LocationPopupProps {
  locator: string;
  markerPosition: LatLng;
  elevation?: number | null;
  elevationLoading?: boolean;
  elevationError?: string | null;
  antennaHeight: number;
  onAntennaHeightChange: (height: number) => void;
  onGetCoverage: () => void;
  isCoverageCalculating?: boolean;
  coverageProgress?: CoverageProgress | null;
}

export function LocationPopup({
  locator,
  markerPosition,
  elevation,
  elevationLoading,
  elevationError,
  antennaHeight,
  onAntennaHeightChange,
  onGetCoverage,
  isCoverageCalculating,
  coverageProgress,
}: LocationPopupProps) {
  return (
    <Popup closeOnClick={false} autoClose={false} autoPan={false}>
      <div className="grid-popup">
        <div className="popup-row">
          <Grid3x3 size={16} />
          <div className="popup-content">
            <div className="grid-level">
              <span className="label">Grid Square</span>
              <span className="value">{locator}</span>
            </div>
          </div>
        </div>
        <div className="popup-row">
          <MapPin size={16} />
          <div className="popup-content">
            <div>
              <strong>Lat:</strong> {markerPosition.lat.toFixed(6)}
            </div>
            <div>
              <strong>Lng:</strong> {markerPosition.lng.toFixed(6)}
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
        <CoverageControls
          antennaHeight={antennaHeight}
          onAntennaHeightChange={onAntennaHeightChange}
          onGetCoverage={onGetCoverage}
          isCoverageCalculating={isCoverageCalculating}
          coverageProgress={coverageProgress}
        />
      </div>
    </Popup>
  );
}
