import { useState, useEffect } from 'react';

type LocationButtonState = 'idle' | 'loading' | 'success' | 'error';

interface UseLocationButtonStateProps {
  isLocating: boolean;
  geolocationError: string | null;
  onClearGeolocationError: () => void;
}

/**
 * State machine for location button UI states.
 * Handles transitions between idle, loading, success, and error states.
 */
export function useLocationButtonState({
  isLocating,
  geolocationError,
  onClearGeolocationError,
}: UseLocationButtonStateProps): LocationButtonState {
  const [buttonState, setButtonState] = useState<LocationButtonState>('idle');

  useEffect(() => {
    if (isLocating) {
      setButtonState('loading');
    } else if (geolocationError) {
      setButtonState('error');
      const timer = setTimeout(() => {
        setButtonState('idle');
        onClearGeolocationError();
      }, 2000);
      return () => clearTimeout(timer);
    } else if (buttonState === 'loading') {
      setButtonState('success');
      const timer = setTimeout(() => {
        setButtonState('idle');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isLocating, geolocationError, buttonState, onClearGeolocationError]);

  return buttonState;
}
