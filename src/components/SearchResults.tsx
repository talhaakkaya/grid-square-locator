import { MapPin, Grid3x3 } from 'lucide-react';
import './SearchResults.css';

export interface SearchResult {
  id: string;
  type: 'location' | 'grid';
  name: string;
  gridSquare: string;
  lat: number;
  lng: number;
}

interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  isVisible: boolean;
  selectedIndex: number;
  onSelect: (result: SearchResult) => void;
  onClose: () => void;
}

export function SearchResults({
  results,
  isLoading,
  isVisible,
  selectedIndex,
  onSelect,
}: SearchResultsProps) {
  if (!isVisible) return null;

  return (
    <div className="search-results">
      {isLoading && (
        <div className="search-results-loading">
          <span>Searching...</span>
        </div>
      )}

      {!isLoading && results.length === 0 && (
        <div className="search-results-empty">
          <span>No results found</span>
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <ul className="search-results-list">
          {results.map((result, index) => (
            <li
              key={result.id}
              className={`search-result-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => onSelect(result)}
            >
              <div className="search-result-icon">
                {result.type === 'location' ? (
                  <MapPin size={16} />
                ) : (
                  <Grid3x3 size={16} />
                )}
              </div>
              <div className="search-result-content">
                <div className="search-result-name">{result.name}</div>
                <div className="search-result-grid">{result.gridSquare}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
