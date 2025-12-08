import { useMemo } from 'react';
import { Polyline, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Loader2, X } from 'lucide-react';
import type { CoverageData } from '../types';
import { COVERAGE_COLORS } from '../utils/constants';

interface CoverageOverlayProps {
  coverageDataList: CoverageData[];
  currentMarkerPosition: { lat: number; lng: number } | null;
  onClearCoverage: (id: string) => void;
  visible?: boolean;
  // Loading state props
  isCalculating?: boolean;
  calculatingPosition?: { lat: number; lng: number } | null;
  calculatingGridSquare?: string | null;
  calculatingProgress?: number;
}

/**
 * Get color for a ray based on its LOS distance and color scheme
 */
function getColorForDistance(
  distance: number,
  maxDistance: number,
  colorIndex: number
): string {
  const colorScheme = COVERAGE_COLORS[colorIndex % COVERAGE_COLORS.length];
  const ratio = Math.min(distance / maxDistance, 1);
  // Interpolate between startHue and endHue
  const hue = colorScheme.startHue + ratio * (colorScheme.endHue - colorScheme.startHue);
  return `hsl(${hue}, 70%, 50%)`;
}

// Small dot icon for coverage origin marker
const originIcon = L.divIcon({
  className: 'coverage-origin-icon',
  html: '<div class="coverage-origin-dot"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const loadingIcon = L.divIcon({
  className: 'coverage-origin-icon coverage-loading-icon',
  html: '<div class="coverage-origin-dot coverage-loading-dot"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export function CoverageOverlay({
  coverageDataList,
  currentMarkerPosition,
  onClearCoverage,
  visible = true,
  isCalculating,
  calculatingPosition,
  calculatingGridSquare,
  calculatingProgress,
}: CoverageOverlayProps) {
  // Check if marker has moved away from each coverage center
  const coveragesWithMovedStatus = useMemo(() => {
    if (!currentMarkerPosition) return coverageDataList.map((c) => ({ coverage: c, markerHasMoved: true }));

    const threshold = 0.0001; // ~11 meters
    return coverageDataList.map((coverage) => ({
      coverage,
      markerHasMoved:
        Math.abs(coverage.center.lat - currentMarkerPosition.lat) > threshold ||
        Math.abs(coverage.center.lng - currentMarkerPosition.lng) > threshold,
    }));
  }, [coverageDataList, currentMarkerPosition]);

  if (!visible) {
    return null;
  }

  return (
    <>
      {/* Loading indicator - blue dot with label while calculating */}
      {isCalculating && calculatingPosition && (
        <Marker
          position={[calculatingPosition.lat, calculatingPosition.lng]}
          icon={loadingIcon}
        >
          {calculatingGridSquare && (
            <Tooltip
              permanent
              direction="top"
              offset={[0, -16]}
              className="coverage-origin-tooltip coverage-loading-tooltip"
            >
              <span className="coverage-loading-content">
                <span className="coverage-label-text">{calculatingGridSquare}</span>
                <Loader2 size={12} className="coverage-loading-spinner" />
                <span className="coverage-loading-percent">{calculatingProgress || 0}%</span>
              </span>
            </Tooltip>
          )}
        </Marker>
      )}

      {coverageDataList.map((coverageData, index) => {
        // Calculate max distance for this coverage
        const maxDistance = Math.max(...coverageData.rays.map((r) => r.distance), 1);
        const { center, rays } = coverageData;

        return rays.map((ray) => (
          <Polyline
            key={`${coverageData.id}-ray-${ray.bearing}`}
            positions={[
              [center.lat, center.lng],
              [ray.endpoint.lat, ray.endpoint.lng],
            ]}
            pathOptions={{
              color: getColorForDistance(ray.distance, maxDistance, index),
              weight: 2,
              opacity: 0.7,
            }}
          />
        ));
      })}

      {coveragesWithMovedStatus.map(({ coverage, markerHasMoved }) => {
        if (!coverage.gridSquare || !markerHasMoved) return null;

        return (
          <Marker
            key={`origin-${coverage.id}`}
            position={[coverage.center.lat, coverage.center.lng]}
            icon={originIcon}
          >
            <Tooltip
              permanent
              direction="top"
              offset={[0, -16]}
              className="coverage-origin-tooltip"
              interactive
            >
              <span className="coverage-label-content">
                <span
                  className="coverage-label-text"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(coverage.gridSquare || '');
                  }}
                  title="Click to copy"
                >
                  {coverage.gridSquare}
                </span>
                <button
                  className="coverage-label-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearCoverage(coverage.id);
                  }}
                  title="Remove this coverage"
                >
                  <X size={12} />
                </button>
              </span>
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}
