import { useState, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { Search, X, Navigation, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { SearchResults, type SearchResult } from './SearchResults';
import { useSearchWithResults } from '../hooks/useSearchWithResults';
import { maidenheadToBounds } from '../utils/maidenhead';
import './SearchControl.css';

interface SearchControlProps {
  onGetCurrentLocation: () => void;
  isLocating: boolean;
  geolocationError: string | null;
  onClearGeolocationError: () => void;
  onResultSelect?: (result: SearchResult) => void;
}

export function SearchControl({
  onGetCurrentLocation,
  isLocating,
  geolocationError,
  onClearGeolocationError,
  onResultSelect,
}: SearchControlProps) {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [locationButtonState, setLocationButtonState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use the search hook that supports grid squares, coordinates, and locations
  const { searchResults, isSearching } = useSearchWithResults(query);

  // Show results when search results change
  useEffect(() => {
    setShowResults(searchResults.length > 0);
    setSelectedIndex(0);
  }, [searchResults]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
        if (query.trim().length === 0) {
          setIsExpanded(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [query]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Disable click propagation to map
  useEffect(() => {
    if (searchRef.current) {
      L.DomEvent.disableClickPropagation(searchRef.current);
    }
  }, []);

  // Track location button state based on isLocating and geolocationError
  useEffect(() => {
    if (isLocating) {
      setLocationButtonState('loading');
    } else if (geolocationError) {
      setLocationButtonState('error');
      const timer = setTimeout(() => {
        setLocationButtonState('idle');
        onClearGeolocationError();
      }, 2000);
      return () => clearTimeout(timer);
    } else if (locationButtonState === 'loading') {
      setLocationButtonState('success');
      const timer = setTimeout(() => {
        setLocationButtonState('idle');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isLocating, geolocationError, locationButtonState, onClearGeolocationError]);

  const handleResultSelect = (result: SearchResult) => {
    // Get bounds for the grid square and fit to screen
    try {
      const bounds = maidenheadToBounds(result.gridSquare);
      map.flyToBounds(
        L.latLngBounds(
          [bounds.southwest.lat, bounds.southwest.lng],
          [bounds.northeast.lat, bounds.northeast.lng]
        ),
        { duration: 1.5, padding: [20, 20] }
      );
    } catch {
      // Fallback to center point with max zoom
      map.flyTo([result.lat, result.lng], 18, { duration: 1.5 });
    }

    // Notify parent if callback provided
    if (onResultSelect) {
      onResultSelect(result);
    }

    // Clear search
    setQuery('');
    setShowResults(false);
    setIsExpanded(false);
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
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowResults(false);
        break;
    }
  };

  const handleExpandClick = () => {
    setIsExpanded(true);
  };

  const handleCollapseClick = () => {
    setQuery('');
    setShowResults(false);
    setIsExpanded(false);
  };

  return (
    <div className="search-control" ref={searchRef}>
      <div className="search-buttons-row">
        {!isExpanded ? (
          <button
            className="search-expand-button"
            onClick={handleExpandClick}
            title="Search for a location or grid square"
          >
            <Search size={18} />
            <span>Search</span>
          </button>
        ) : (
          <div className="search-input-wrapper">
            <Search size={16} className="search-input-icon" />
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder="Search location, grid, coords..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {isSearching ? (
              <Loader2 size={16} className="search-spinner" />
            ) : (
              <button
                className="search-close-button"
                onClick={handleCollapseClick}
                title="Close search"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {!isExpanded && (
          <button
            onClick={onGetCurrentLocation}
            disabled={locationButtonState === 'loading'}
            className={`find-me-button ${locationButtonState}`}
            title={
              locationButtonState === 'loading' ? 'Finding your location...' :
              locationButtonState === 'success' ? 'Location found!' :
              locationButtonState === 'error' ? 'Failed to get location' :
              'Find my location'
            }
          >
            {locationButtonState === 'loading' && <Loader2 size={18} className="spinner" />}
            {locationButtonState === 'success' && <CheckCircle size={18} />}
            {locationButtonState === 'error' && <XCircle size={18} />}
            {locationButtonState === 'idle' && <Navigation size={18} />}
            <span className="find-me-text">
              {locationButtonState === 'loading' && 'Finding...'}
              {locationButtonState === 'success' && 'Found!'}
              {locationButtonState === 'error' && 'Failed'}
              {locationButtonState === 'idle' && 'Find Me'}
            </span>
          </button>
        )}
      </div>

      {isExpanded && (
        <SearchResults
          results={searchResults}
          isLoading={isSearching}
          isVisible={showResults || isSearching}
          selectedIndex={selectedIndex}
          onSelect={handleResultSelect}
          onClose={() => setShowResults(false)}
        />
      )}
    </div>
  );
}
