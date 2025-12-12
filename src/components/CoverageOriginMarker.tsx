import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { X } from 'lucide-react';
import type { CoverageData } from '../types';

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
}

export function CoverageOriginMarker({ coverage, onClear }: CoverageOriginMarkerProps) {
  if (!coverage.gridSquare) return null;

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
