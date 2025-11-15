import { useState, useEffect, useRef } from 'react';
import { Grid3x3, MapPin, Mountain, Map, Github, Navigation, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { SearchResults, type SearchResult } from './SearchResults';
import { formatElevation } from '../services/elevationService';
import { useClickOutside } from '../hooks/useClickOutside';
import { useSearchWithResults } from '../hooks/useSearchWithResults';
import './DockPanel.css';

interface DockPanelProps {
  gridSquare: string | null;
  coordinates: { lat: number; lng: number } | null;
  elevation: number | null;
  elevationLoading: boolean;
  elevationError: string | null;
  onSearch: (query: string) => void;
  onGetCurrentLocation: () => void;
  isLocating: boolean;
  geolocationError: string | null;
  onClearGeolocationError: () => void;
  visible: boolean;
}

export function DockPanel({
  gridSquare,
  coordinates,
  elevation,
  elevationLoading,
  elevationError,
  onSearch,
  onGetCurrentLocation,
  isLocating,
  geolocationError,
  onClearGeolocationError,
  visible,
}: DockPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [locationButtonState, setLocationButtonState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const searchSectionRef = useRef<HTMLDivElement>(null);

  // Use search with results hook
  const { searchResults, isSearching } = useSearchWithResults(searchQuery);

  // Show results when search results change
  useEffect(() => {
    setShowResults(searchResults.length > 0);
    setSelectedIndex(0);
  }, [searchResults]);

  // Close results when clicking outside
  useClickOutside(searchSectionRef, () => setShowResults(false));

  // Track location button state based on isLocating and geolocationError
  useEffect(() => {
    if (isLocating) {
      setLocationButtonState('loading');
    } else if (geolocationError) {
      setLocationButtonState('error');
      // Reset to idle after 2 seconds
      const timer = setTimeout(() => {
        setLocationButtonState('idle');
        onClearGeolocationError();
      }, 2000);
      return () => clearTimeout(timer);
    } else if (locationButtonState === 'loading') {
      // Was loading and now not loading with no error = success
      setLocationButtonState('success');
      // Reset to idle after 2 seconds
      const timer = setTimeout(() => {
        setLocationButtonState('idle');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isLocating, geolocationError, locationButtonState, onClearGeolocationError]);

  const handleResultSelect = (result: SearchResult) => {
    const searchValue = result.type === 'grid' ? result.gridSquare : result.name;
    onSearch(searchValue);
    setSearchQuery('');
    setShowResults(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % searchResults.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          handleResultSelect(searchResults[selectedIndex]);
        } else if (searchQuery.trim()) {
          // User pressed Enter before debounce completed - search immediately
          onSearch(searchQuery.trim());
          setSearchQuery('');
          setShowResults(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowResults(false);
        break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0 && selectedIndex >= 0) {
      handleResultSelect(searchResults[selectedIndex]);
    } else if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setSearchQuery('');
      setShowResults(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="dock-panel">
      <div className="dock-content">
        <div className="dock-section search-section" ref={searchSectionRef}>
          <Map size={18} />
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Search location or grid square..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="search-input"
            />
          </form>
          <SearchResults
            results={searchResults}
            isLoading={isSearching}
            isVisible={showResults}
            selectedIndex={selectedIndex}
            onSelect={handleResultSelect}
            onClose={() => setShowResults(false)}
          />
        </div>

        <div className="dock-info-row">
          <button
            onClick={onGetCurrentLocation}
            disabled={locationButtonState === 'loading'}
            className={`locate-button ${locationButtonState}`}
            title={
              locationButtonState === 'loading' ? 'Finding your location...' :
              locationButtonState === 'success' ? 'Location found!' :
              locationButtonState === 'error' ? 'Failed to get location' :
              'Get my current location'
            }
            aria-label="Get current location"
          >
            {locationButtonState === 'loading' && <Loader2 size={18} className="spinner" />}
            {locationButtonState === 'success' && <CheckCircle size={18} />}
            {locationButtonState === 'error' && <XCircle size={18} />}
            {locationButtonState === 'idle' && <Navigation size={18} />}
            <span className="locate-button-text">
              {locationButtonState === 'loading' && 'Locating...'}
              {locationButtonState === 'success' && 'Found!'}
              {locationButtonState === 'error' && 'Failed'}
              {locationButtonState === 'idle' && 'My Location'}
            </span>
          </button>
          <div className="dock-section">
            <Grid3x3 size={18} />
            <span className="dock-value">{gridSquare || '-'}</span>
          </div>

          <div className="dock-section">
            <MapPin size={18} />
            <span className="dock-value">
              {coordinates ? `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}` : '-'}
            </span>
          </div>

          <div className="dock-section">
            <Mountain size={18} />
            <span className="dock-value">
              {elevationLoading && 'Loading...'}
              {elevationError && <span className="error-text">{elevationError}</span>}
              {elevation !== null && !elevationLoading && formatElevation(elevation)}
              {!elevationLoading && !elevationError && elevation === null && '-'}
            </span>
          </div>
        </div>

        <div className="dock-credit">
          <a href="https://www.qrz.com/db/TA1VAL" target="_blank" rel="noopener noreferrer">TA1VAL</a>
          <span className="separator">•</span>
          <a href="https://github.com/talhaakkaya/grid-square-locator" target="_blank" rel="noopener noreferrer" className="github-link">
            <Github size={12} />
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
