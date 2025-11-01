/**
 * Custom hook for browser geolocation
 */

import { useState, useCallback } from 'react';
import type { LatLng } from '../types';

interface UseGeolocationReturn {
  getCurrentLocation: () => Promise<LatLng | null>;
  isLocating: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Get user-friendly error message from GeolocationPositionError
 */
function getErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location access denied. Please enable location permissions.';
    case error.POSITION_UNAVAILABLE:
      return 'Unable to determine your location. Please try again.';
    case error.TIMEOUT:
      return 'Location request timed out. Please try again.';
    default:
      return 'An error occurred while getting your location.';
  }
}

/**
 * Hook to get user's current location using browser Geolocation API
 */
export function useGeolocation(): UseGeolocationReturn {
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getCurrentLocation = useCallback(async (): Promise<LatLng | null> => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return null;
    }

    setIsLocating(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsLocating(false);
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          setIsLocating(false);
          setError(getErrorMessage(error));
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  return {
    getCurrentLocation,
    isLocating,
    error,
    clearError,
  };
}
