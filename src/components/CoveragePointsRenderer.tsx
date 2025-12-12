import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { CoverageData } from '../types';
import { COVERAGE_COLORS } from '../utils/constants';

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
    { id: '1', lat: originLat, lon: originLon, name: 'Point A', height: originHeight },
    { id: '2', lat: targetLat, lon: targetLon, name: 'Point B', height: 0 },
  ];
  const encoded = btoa(JSON.stringify(points));
  return `https://rflos.qso.app/?p=${encodeURIComponent(encoded)}&from=1&to=2&sel=1%2C2&hl=0&pv=1&los=1&freq=145.5`;
}

interface CoveragePointsRendererProps {
  coverageDataList: CoverageData[];
}

/**
 * Component that renders coverage points using native Leaflet canvas for performance
 */
export function CoveragePointsRenderer({ coverageDataList }: CoveragePointsRendererProps) {
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
                  <div style="margin-bottom: 4px; font-size: 12px; color: #666;">
                    Distance: ${point.distance.toFixed(1)} km
                  </div>
                  <div style="margin-bottom: 8px; font-size: 11px; color: #888;">
                    ${point.position.lat.toFixed(6)}, ${point.position.lng.toFixed(6)}
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
