import type { LatLng } from '../types';
import { LOS_CONFIG } from './constants';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Calculate a destination point given start point, bearing, and distance
 * Uses the Haversine formula
 * @param origin Starting coordinates
 * @param bearing Bearing in degrees (0 = north, 90 = east)
 * @param distanceKm Distance in kilometers
 * @returns Destination coordinates
 */
export function calculatePointAtBearing(
  origin: LatLng,
  bearing: number,
  distanceKm: number
): LatLng {
  const lat1 = origin.lat * DEG_TO_RAD;
  const lng1 = origin.lng * DEG_TO_RAD;
  const bearingRad = bearing * DEG_TO_RAD;
  const angularDistance = distanceKm / LOS_CONFIG.EARTH_RADIUS_KM;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
    Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );

  const lng2 = lng1 + Math.atan2(
    Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
    Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
  );

  return {
    lat: lat2 * RAD_TO_DEG,
    lng: lng2 * RAD_TO_DEG,
  };
}

/**
 * Generate sample points along a bearing for elevation profiling
 * @param origin Starting coordinates
 * @param bearing Bearing in degrees
 * @param maxDistanceKm Maximum distance (default from config)
 * @param intervalKm Sampling interval (default from config)
 * @returns Array of sample points along the bearing
 */
export function getElevationSamplePoints(
  origin: LatLng,
  bearing: number,
  maxDistanceKm: number = LOS_CONFIG.MAX_DISTANCE_KM,
  intervalKm: number = LOS_CONFIG.SAMPLE_INTERVAL_KM
): LatLng[] {
  const points: LatLng[] = [];
  const numPoints = Math.floor(maxDistanceKm / intervalKm);

  for (let i = 1; i <= numPoints; i++) {
    const distance = i * intervalKm;
    points.push(calculatePointAtBearing(origin, bearing, distance));
  }

  return points;
}

/**
 * Calculate the drop in apparent height due to Earth's curvature
 * Accounts for atmospheric refraction using K factor
 * @param distanceKm Distance from observer in kilometers
 * @returns Drop in meters
 */
export function calculateEarthCurvatureDrop(distanceKm: number): number {
  // Formula: drop = d² / (2 * K * R)
  // Where d = distance, K = refraction factor, R = Earth radius
  const distanceM = distanceKm * 1000;
  const effectiveRadius = LOS_CONFIG.K_FACTOR * LOS_CONFIG.EARTH_RADIUS_KM * 1000;
  return (distanceM * distanceM) / (2 * effectiveRadius);
}

/**
 * Calculate line-of-sight distance based on elevation profile
 * @param observerElevation Observer's ground elevation in meters
 * @param antennaHeight Antenna height above ground in meters
 * @param elevationProfile Array of terrain elevations at each sample point
 * @param intervalKm Distance between sample points
 * @returns Maximum LOS distance in kilometers
 */
export function calculateLOSDistance(
  observerElevation: number,
  antennaHeight: number,
  elevationProfile: number[],
  intervalKm: number = LOS_CONFIG.SAMPLE_INTERVAL_KM
): number {
  const observerHeight = observerElevation + antennaHeight;
  let maxBlockingAngle = -Infinity;

  for (let i = 0; i < elevationProfile.length; i++) {
    const distance = (i + 1) * intervalKm;
    const distanceM = distance * 1000;
    const curvatureDrop = calculateEarthCurvatureDrop(distance);
    const targetElevation = elevationProfile[i];

    // Effective height of terrain point considering curvature
    const effectiveTerrainHeight = targetElevation - curvatureDrop;

    // Calculate angle from observer to this terrain point
    const heightDiff = effectiveTerrainHeight - observerHeight;
    const angleToTerrain = Math.atan2(heightDiff, distanceM);

    // If this terrain point has a higher angle than any previous point,
    // it becomes the new horizon. If it's lower, we can see past it.
    if (angleToTerrain > maxBlockingAngle) {
      maxBlockingAngle = angleToTerrain;
    } else {
      // This point is blocked by previous terrain
      // Continue to check further points (they might be visible)
    }
  }

  // Now determine the furthest visible point
  // A point is visible if no terrain between observer and point blocks the view
  let lastVisibleDistance = 0;
  let cumulativeMaxAngle = -Infinity;

  for (let i = 0; i < elevationProfile.length; i++) {
    const distance = (i + 1) * intervalKm;
    const distanceM = distance * 1000;
    const curvatureDrop = calculateEarthCurvatureDrop(distance);
    const targetElevation = elevationProfile[i];

    const effectiveTerrainHeight = targetElevation - curvatureDrop;
    const heightDiff = effectiveTerrainHeight - observerHeight;
    const angleToTerrain = Math.atan2(heightDiff, distanceM);

    // Check if this point is above the cumulative horizon angle
    // If terrain angle is higher than current max, it updates the horizon
    if (angleToTerrain >= cumulativeMaxAngle) {
      // This point is visible (or at least its peak is)
      lastVisibleDistance = distance;
      cumulativeMaxAngle = angleToTerrain;
    }
    // If the terrain drops below the horizon, we might still see further points
    // that rise above the current horizon
  }

  // If we can see to the end of the profile, return max distance
  if (lastVisibleDistance >= LOS_CONFIG.MAX_DISTANCE_KM - intervalKm) {
    return LOS_CONFIG.MAX_DISTANCE_KM;
  }

  return lastVisibleDistance;
}

/**
 * Calculate the endpoint coordinates for a coverage ray
 * @param origin Observer location
 * @param bearing Bearing in degrees
 * @param distanceKm LOS distance in kilometers
 * @returns Endpoint coordinates
 */
export function calculateRayEndpoint(
  origin: LatLng,
  bearing: number,
  distanceKm: number
): LatLng {
  return calculatePointAtBearing(origin, bearing, distanceKm);
}

/**
 * Generate all sample points for all bearings (for batch fetching)
 * @param origin Observer location
 * @param bearings Array of bearings to calculate (default 0-359)
 * @returns Object mapping bearing to array of sample points
 */
export function getAllSamplePoints(
  origin: LatLng,
  numRadials: number = LOS_CONFIG.NUM_RADIALS
): Map<number, LatLng[]> {
  const allPoints = new Map<number, LatLng[]>();
  const step = 360 / numRadials;

  for (let i = 0; i < numRadials; i++) {
    const bearing = i * step;
    allPoints.set(bearing, getElevationSamplePoints(origin, bearing));
  }

  return allPoints;
}

/**
 * Flatten all sample points into a single array with bearing/index tracking
 * Useful for batch API requests
 * @param origin Observer location
 * @returns Object with flat array of points and index mapping
 */
export function flattenSamplePoints(origin: LatLng): {
  points: LatLng[];
  indexMap: Array<{ bearing: number; sampleIndex: number }>;
  numRadials: number;
  pointsPerBearing: number;
} {
  const points: LatLng[] = [];
  const indexMap: Array<{ bearing: number; sampleIndex: number }> = [];
  const numRadials = LOS_CONFIG.NUM_RADIALS;
  const step = 360 / numRadials;
  const pointsPerBearing = Math.floor(LOS_CONFIG.MAX_DISTANCE_KM / LOS_CONFIG.SAMPLE_INTERVAL_KM);

  for (let i = 0; i < numRadials; i++) {
    const bearing = i * step;
    const samplePoints = getElevationSamplePoints(origin, bearing);
    for (let j = 0; j < samplePoints.length; j++) {
      points.push(samplePoints[j]);
      indexMap.push({ bearing, sampleIndex: j });
    }
  }

  return { points, indexMap, numRadials, pointsPerBearing };
}
