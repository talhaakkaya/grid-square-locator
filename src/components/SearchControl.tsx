import { useState, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { createDebouncedSearch } from '../services/nominatimService';
import type { NominatimResult } from '../types';
import './SearchControl.css';

export function SearchControl() {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debouncedSearchRef = useRef(createDebouncedSearch(500));

  // Handle search input changes
  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      setShowResults(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    debouncedSearchRef.current(
      query,
      (searchResults) => {
        setResults(searchResults);
        setShowResults(true);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, [query]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleResultClick = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    // Fly to the selected location
    map.flyTo([lat, lng], 13, {
      duration: 1.5,
    });

    // Clear search
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  const handleInputFocus = () => {
    if (results.length > 0) {
      setShowResults(true);
    }
  };

  return (
    <div className="search-control" ref={searchRef}>
      <div className="search-input-wrapper">
        <input
          type="text"
          className="search-input"
          placeholder="Search for a location..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleInputFocus}
        />
        {isLoading && <div className="search-spinner">🔍</div>}
      </div>

      {showResults && (
        <div className="search-results">
          {error && <div className="search-error">{error}</div>}

          {results.length === 0 && !isLoading && !error && (
            <div className="no-results">No locations found</div>
          )}

          {results.map((result) => (
            <div
              key={result.place_id}
              className="search-result-item"
              onClick={() => handleResultClick(result)}
            >
              <div className="result-name">{result.display_name}</div>
              {result.type && <div className="result-type">{result.type}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
