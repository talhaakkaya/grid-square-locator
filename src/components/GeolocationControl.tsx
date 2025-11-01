import { useState } from 'react';
import { useMap } from 'react-leaflet';
import './GeolocationControl.css';

export function GeolocationControl() {
  const map = useMap();
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        // Fly to user's location
        map.flyTo([latitude, longitude], 13, {
          duration: 1.5,
        });

        setIsLocating(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        let errorMessage = 'Unable to retrieve your location';

        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case err.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }

        setError(errorMessage);
        setIsLocating(false);

        // Clear error after 3 seconds
        setTimeout(() => setError(null), 3000);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="geolocation-control">
      <button
        className={`locate-button ${isLocating ? 'locating' : ''}`}
        onClick={handleLocate}
        disabled={isLocating}
        title="Find my location"
      >
        {isLocating ? '📍' : '🎯'}
      </button>
      {error && <div className="locate-error">{error}</div>}
    </div>
  );
}
