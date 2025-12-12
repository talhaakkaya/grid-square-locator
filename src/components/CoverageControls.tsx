import { TowerControl, Eye, Loader2 } from 'lucide-react';
import { DEFAULTS } from '../utils/constants';
import type { CoverageProgress } from '../types';

interface CoverageControlsProps {
  antennaHeight: number;
  onAntennaHeightChange: (height: number) => void;
  onGetCoverage: () => void;
  isCoverageCalculating?: boolean;
  coverageProgress?: CoverageProgress | null;
}

export function CoverageControls({
  antennaHeight,
  onAntennaHeightChange,
  onGetCoverage,
  isCoverageCalculating,
  coverageProgress,
}: CoverageControlsProps) {
  return (
    <div className="popup-row popup-coverage-row">
      <TowerControl size={16} />
      <div className="popup-coverage-controls">
        <input
          type="number"
          min="1"
          max="9999"
          value={antennaHeight}
          onChange={(e) =>
            onAntennaHeightChange(
              Math.max(1, Math.min(9999, parseInt(e.target.value, 10) || DEFAULTS.ANTENNA_HEIGHT_M))
            )
          }
          className="popup-antenna-input"
          title="Antenna height in meters"
        />
        <span className="popup-antenna-unit">m</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onGetCoverage();
          }}
          disabled={isCoverageCalculating}
          className={`popup-coverage-button ${isCoverageCalculating ? 'loading' : ''}`}
          title={
            isCoverageCalculating
              ? `Calculating... ${coverageProgress?.percentage || 0}%`
              : 'Calculate line-of-sight coverage'
          }
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
  );
}
