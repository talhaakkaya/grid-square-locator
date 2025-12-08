import { useState, useCallback, useRef } from 'react';
import type { LatLng, CoverageData, CoverageProgress, CoverageRay } from '../types';
import { getElevationBatch, getElevationsWithThrottling } from '../services/elevationService';
import {
  flattenSamplePoints,
  calculateLOSDistance,
  calculateRayEndpoint,
} from '../utils/losCalculation';
import { LOS_CONFIG, COVERAGE_COLORS } from '../utils/constants';

interface UseCoverageReturn {
  calculateCoverage: (center: LatLng, antennaHeight: number, gridSquare?: string) => void;
  cancelCalculation: () => void;
  isCalculating: boolean;
  progress: CoverageProgress | null;
  error: string | null;
  coverageDataList: CoverageData[];
  clearCoverage: (id: string) => void;
  clearAllCoverage: () => void;
  clearError: () => void;
}

// Generate unique ID
function generateId(): string {
  return `coverage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function useCoverage(): UseCoverageReturn {
  const [isCalculating, setIsCalculating] = useState(false);
  const [progress, setProgress] = useState<CoverageProgress | null>(null);
  const [coverageDataList, setCoverageDataList] = useState<CoverageData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const nextColorIndexRef = useRef(0);

  const calculateCoverage = useCallback(async (center: LatLng, antennaHeight: number, gridSquare?: string) => {
    // Cancel any existing calculation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Get next color index and increment
    const colorIndex = nextColorIndexRef.current;
    nextColorIndexRef.current = (nextColorIndexRef.current + 1) % COVERAGE_COLORS.length;

    setIsCalculating(true);
    setError(null);
    setProgress({ currentBearing: 0, totalBearings: LOS_CONFIG.NUM_RADIALS, percentage: 0 });

    try {
      const observerElevations = await getElevationBatch([center], signal);
      if (observerElevations.length === 0) {
        throw new Error('Failed to get observer elevation');
      }
      const observerElevation = observerElevations[0].elevation;

      const { points, numRadials, pointsPerBearing } = flattenSamplePoints(center);
      const bearingStep = 360 / numRadials;

      const allElevations = await getElevationsWithThrottling(
        points,
        (completed, total) => {
          const percentage = Math.round((completed / total) * 100);
          const estimatedBearing = Math.floor((completed / total) * numRadials);
          setProgress({
            currentBearing: estimatedBearing,
            totalBearings: numRadials,
            percentage,
          });
        },
        signal
      );

      const rays: CoverageRay[] = [];

      for (let i = 0; i < numRadials; i++) {
        const bearing = i * bearingStep;
        const startIdx = i * pointsPerBearing;
        const endIdx = startIdx + pointsPerBearing;
        const elevationProfile = allElevations
          .slice(startIdx, endIdx)
          .map((e) => e.elevation);

        const losDistance = calculateLOSDistance(
          observerElevation,
          antennaHeight,
          elevationProfile
        );

        const endpoint = calculateRayEndpoint(center, bearing, losDistance);

        rays.push({
          bearing,
          distance: losDistance,
          endpoint,
        });
      }

      // Step 5: Store results - add to array
      const result: CoverageData = {
        id: generateId(),
        center,
        antennaHeight,
        rays,
        calculatedAt: Date.now(),
        gridSquare,
        colorIndex,
      };

      setCoverageDataList((prev) => [...prev, result]);
      setProgress(null);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Calculation was cancelled, don't show error
        setProgress(null);
      } else {
        setError(err instanceof Error ? err.message : 'Coverage calculation failed');
        setProgress(null);
      }
    } finally {
      setIsCalculating(false);
    }
  }, []);

  const cancelCalculation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsCalculating(false);
    setProgress(null);
    setError(null);
  }, []);

  // Clear individual coverage by ID
  const clearCoverage = useCallback((id: string) => {
    setCoverageDataList((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Clear all coverages
  const clearAllCoverage = useCallback(() => {
    setCoverageDataList([]);
    setProgress(null);
    setError(null);
    nextColorIndexRef.current = 0; // Reset color index
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    calculateCoverage,
    cancelCalculation,
    isCalculating,
    progress,
    error,
    coverageDataList,
    clearCoverage,
    clearAllCoverage,
    clearError,
  };
}
