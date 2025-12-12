import { useMemo, useEffect, useRef, useState } from 'react';
import { Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Marker as LeafletMarker } from 'leaflet';
import { Loader2, X } from 'lucide-react';
import type { CoverageData } from '../types';
import { COVERAGE_COLORS } from '../utils/constants';

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

/**
 * Build analysis URL for a point pair
 */
function buildAnalysisUrl(
  originLat: number,
  originLon: number,
  originHeight: number,
  targetLat: number,
  targetLon: number
): string {
  const points = [
    { id: "1", lat: originLat, lon: originLon, name: "Point A", height: originHeight },
    { id: "2", lat: targetLat, lon: targetLon, name: "Point B", height: 0 }
  ];
  const encoded = btoa(JSON.stringify(points));
  return `https://rflos.qso.app/?p=${encodeURIComponent(encoded)}&from=1&to=2&sel=1%2C2&hl=0&pv=1&los=1&freq=145.5`;
}

/**
 * Component that renders coverage points using native Leaflet canvas for performance
 */
function CoveragePointsLayer({ coverageDataList }: { coverageDataList: CoverageData[] }) {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    // Remove old layer
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    if (coverageDataList.length === 0) {
      return;
    }

    // Create canvas renderer for performance
    const renderer = L.canvas({ padding: 0.5 });
    const layerGroup = L.layerGroup();

    coverageDataList.forEach((coverage, coverageIndex) => {
      // Calculate overall max distance for color scaling
      const overallMaxDistance = Math.max(
        ...coverage.rays.map((r) => r.maxDistance),
        1
      );

      coverage.rays.forEach((ray) => {
        ray.visiblePoints.forEach((point) => {
          const marker = L.circleMarker(
            [point.position.lat, point.position.lng],
            {
              renderer,
              radius: 3,
              fillColor: getColorForDistance(point.distance, overallMaxDistance, coverageIndex),
              fillOpacity: 0.5,
              stroke: false,
            }
          );

          // Add click handler for popup with analysis link
          marker.on('click', (e) => {
            // Stop event from propagating to map (prevents new marker placement)
            L.DomEvent.stopPropagation(e);

            const url = buildAnalysisUrl(
              coverage.center.lat,
              coverage.center.lng,
              coverage.antennaHeight,
              point.position.lat,
              point.position.lng
            );

            L.popup()
              .setLatLng([point.position.lat, point.position.lng])
              .setContent(`
                <div style="text-align: center; padding: 4px;">
                  <div style="margin-bottom: 8px; font-size: 12px; color: #666;">
                    Distance: ${point.distance.toFixed(1)} km
                  </div>
                  <a href="${url}" target="_blank" rel="noopener noreferrer"
                     style="display: inline-block; padding: 6px 12px; background: #4CAF50; color: white;
                            text-decoration: none; border-radius: 4px; font-size: 12px;">
                    Detailed Analysis
                  </a>
                </div>
              `)
              .openOn(map);
          });

          layerGroup.addLayer(marker);
        });
      });
    });

    layerGroup.addTo(map);
    layerRef.current = layerGroup;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map, coverageDataList]);

  return null;
}

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
}: CoverageOverlayProps) {
  const loadingMarkerRef = useRef<LeafletMarker | null>(null);
  const map = useMap();
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (isCalculating && calculatingPosition && calculatingGridSquare) {
      const timer = setTimeout(() => setShowLoading(true), 100);
      return () => clearTimeout(timer);
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
      {showLoading && calculatingPosition && calculatingGridSquare && (
        <Marker
          position={[calculatingPosition.lat, calculatingPosition.lng]}
          icon={loadingIcon}
          ref={loadingMarkerRef}
        >
          <Tooltip
              permanent
              direction="top"
              offset={[0, -16]}
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
      <CoveragePointsLayer coverageDataList={coverageDataList} />

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
                    onClearCoverage(coverage.id);
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
      })}
    </>
  );
}
