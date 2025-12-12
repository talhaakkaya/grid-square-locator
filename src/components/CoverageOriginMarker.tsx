import { useState } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { X, Download, Loader2 } from 'lucide-react';
import type { CoverageData } from '../types';
import { exportCoverageMap } from '../utils/mapExport';

// Small dot icon for coverage origin marker
const originIcon = L.divIcon({
  className: 'coverage-origin-icon',
  html: '<div class="coverage-origin-dot"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

interface CoverageOriginMarkerProps {
  coverage: CoverageData;
  onClear: (id: string) => void;
  tileLayerUrl: string;
  colorIndex?: number;
}

export function CoverageOriginMarker({ coverage, onClear, tileLayerUrl, colorIndex = 0 }: CoverageOriginMarkerProps) {
  const [isExporting, setIsExporting] = useState(false);

  if (!coverage.gridSquare) return null;

  const handleExport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isExporting) return;

    setIsExporting(true);
    try {
      await exportCoverageMap({
        coverage,
        tileLayerUrl,
        colorIndex,
      });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Marker
      position={[coverage.center.lat, coverage.center.lng]}
      icon={originIcon}
    >
      <Tooltip
        permanent
        direction="top"
        offset={[0, -14]}
        className="coverage-origin-tooltip"
        interactive
      >
        <span
          className="coverage-label-content"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <span className="coverage-label-text">
            {coverage.gridSquare}
          </span>
          <button
            className="coverage-label-download"
            onClick={handleExport}
            onMouseDown={(e) => e.stopPropagation()}
            title="Download high-quality image"
            disabled={isExporting}
          >
            {isExporting ? <Loader2 size={12} className="spinner" /> : <Download size={12} />}
          </button>
          <button
            className="coverage-label-close"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClear(coverage.id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Remove this coverage"
          >
            <X size={12} />
          </button>
        </span>
      </Tooltip>
    </Marker>
  );
}
