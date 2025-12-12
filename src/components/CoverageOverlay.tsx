import { useMemo, useEffect, useRef, useState } from 'react';
import { Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Marker as LeafletMarker } from 'leaflet';
import { Loader2, X } from 'lucide-react';
import type { CoverageData } from '../types';
import { CoveragePointsRenderer } from './CoveragePointsRenderer';
import { CoverageOriginMarker } from './CoverageOriginMarker';

interface CoverageOverlayProps {
  coverageDataList: CoverageData[];
  currentMarkerPosition: { lat: number; lng: number } | null;
  onClearCoverage: (id: string) => void;
  onCancelCalculation?: () => void;
  visible?: boolean;
  // Loading state props
  isCalculating?: boolean;
  calculatingPosition?: { lat: number; lng: number } | null;
  calculatingGridSquare?: string | null;
  calculatingProgress?: number;
  // Export props
  tileLayerUrl: string;
}

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
  onCancelCalculation,
  visible = true,
  isCalculating,
  calculatingPosition,
  calculatingGridSquare,
  calculatingProgress,
  tileLayerUrl,
}: CoverageOverlayProps) {
  const loadingMarkerRef = useRef<LeafletMarker | null>(null);
  const map = useMap();
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (isCalculating && calculatingPosition && calculatingGridSquare) {
      setShowLoading(true);
    } else {
      setShowLoading(false);
    }
  }, [isCalculating, calculatingPosition, calculatingGridSquare]);

  const handleCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (loadingMarkerRef.current) {
      const tooltip = loadingMarkerRef.current.getTooltip();
      if (tooltip) {
        map.closeTooltip(tooltip);
        tooltip.remove();
      }
      loadingMarkerRef.current.unbindTooltip();
      loadingMarkerRef.current.remove();
      loadingMarkerRef.current = null;
    }
    const tooltipPane = map.getPane('tooltipPane');
    if (tooltipPane) {
      tooltipPane.innerHTML = '';
    }
    onCancelCalculation?.();
  };

  // Check if marker has moved away from each coverage center
  const coveragesWithMovedStatus = useMemo(() => {
    if (!currentMarkerPosition) {
      return coverageDataList.map((c) => ({ coverage: c, markerHasMoved: true }));
    }

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
      {showLoading && calculatingPosition && calculatingGridSquare && (
        <Marker
          position={[calculatingPosition.lat, calculatingPosition.lng]}
          icon={loadingIcon}
          ref={loadingMarkerRef}
        >
          <Tooltip
            permanent
            direction="top"
            offset={[0, -14]}
            className="coverage-origin-tooltip coverage-loading-tooltip"
            interactive
          >
            <span
              className="coverage-loading-content"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <span className="coverage-label-text">
                {calculatingGridSquare}
              </span>
              <Loader2 size={12} className="coverage-loading-spinner" />
              <span className="coverage-loading-percent">{calculatingProgress || 0}%</span>
              <button
                className="coverage-label-close"
                onClick={handleCancelClick}
                onMouseDown={(e) => e.stopPropagation()}
                title="Cancel calculation"
              >
                <X size={12} />
              </button>
            </span>
          </Tooltip>
        </Marker>
      )}

      {/* Coverage points rendered via canvas */}
      <CoveragePointsRenderer coverageDataList={coverageDataList} />

      {coveragesWithMovedStatus.map(({ coverage, markerHasMoved }, index) => {
        if (!markerHasMoved) return null;

        return (
          <CoverageOriginMarker
            key={`origin-${coverage.id}`}
            coverage={coverage}
            onClear={onClearCoverage}
            tileLayerUrl={tileLayerUrl}
            colorIndex={index}
          />
        );
      })}
    </>
  );
}
