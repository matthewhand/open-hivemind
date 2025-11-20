import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  Input,
  Button,
  Badge,
  Select,
  Loading,
  Collapse
} from '../components/DaisyUI';
import {
  MagnifyingGlassIcon as SearchIcon,
  FunnelIcon as FilterIcon,
  XMarkIcon as ClearIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  StarIcon,
  MagnifyingGlassCircleIcon as SearchOffIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface SearchResult {
  id: string;
  type: 'bot' | 'log' | 'metric' | 'alert' | 'config';
  title: string;
  description: string;
  tags: string[];
  score: number;
  timestamp: Date;
  metadata: Record<string, unknown>;
  highlighted?: boolean;
}

interface SearchFilter {
  id: string;
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_contains';
  value: string | number | boolean;
  type: 'text' | 'number' | 'date' | 'boolean';
}

interface SearchQuery {
  text: string;
  filters: SearchFilter[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
  timeRange?: { start: Date; end: Date };
}

interface AdvancedSearchProps {
  placeholder?: string;
  onSearch: (query: SearchQuery) => Promise<SearchResult[]>;
  onResultClick?: (result: SearchResult) => void;
  onFiltersChange?: (filters: SearchFilter[]) => void;
  showFilters?: boolean;
  autoCompleteMinLength?: number;
  debounceTime?: number;
  maxResults?: number;
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  placeholder = 'Search bots, logs, metrics, alerts...',
  onSearch,
  onResultClick,
  onFiltersChange,
  showFilters = true,
  autoCompleteMinLength = 2,
  debounceTime = 300,
  maxResults = 50,
}) => {
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<SearchFilter[]>([]);
  const [sortBy, setSortBy] = useState('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const [searchStats, setSearchStats] = useState({
    totalResults: 0,
    timeTaken: 0,
    hasMore: false,
  });

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const performSearch = useCallback(async (query: SearchQuery) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);

    try {
      const startTime = Date.now();
      const searchResults = await onSearch(query);
      const timeTaken = Date.now() - startTime;

      setResults(searchResults);
      setSearchStats({
        totalResults: searchResults.length,
        timeTaken,
        hasMore: searchResults.length >= maxResults,
      });
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Search error:', error);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [onSearch, maxResults]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchText.length >= autoCompleteMinLength || filters.length > 0) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch({
          text: searchText,
          filters,
          sortBy,
          sortOrder,
          page: 0,
          pageSize: maxResults,
        });
      }, debounceTime);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText, filters, sortBy, sortOrder, debounceTime, autoCompleteMinLength, maxResults, performSearch]);

  const handleFilterChange = (newFilters: SearchFilter[]) => {
    setFilters(newFilters);
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  };

  const addFilter = () => {
    const newFilter: SearchFilter = {
      id: `filter-${Date.now()}`,
      field: 'type',
      operator: 'eq',
      value: 'bot',
      type: 'text',
    };
    handleFilterChange([...filters, newFilter]);
  };

  const updateFilter = (filterId: string, updates: Partial<SearchFilter>) => {
    const newFilters = filters.map(filter =>
      filter.id === filterId ? { ...filter, ...updates } : filter
    );
    handleFilterChange(newFilters);
  };

  const removeFilter = (filterId: string) => {
    handleFilterChange(filters.filter(filter => filter.id !== filterId));
  };

  const getResultTypeColor = (type: string): 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'neutral' => {
    switch (type) {
      case 'bot': return 'primary';
      case 'log': return 'secondary';
      case 'metric': return 'success';
      case 'alert': return 'warning';
      case 'config': return 'info';
      default: return 'neutral';
    }
  };

  if (isLoading && results.length === 0) {
    return (
      <div className="p-6 bg-base-100 rounded-lg">
        <div className="flex items-center gap-4">
          <Loading.Spinner size="md" />
          <span className="text-sm opacity-70">Searching...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Search Header */}
      <div className="flex items-center gap-2 p-4 bg-base-100 rounded-lg shadow">
        <div className="relative flex-grow">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 opacity-50" />
          <Input
            className="pl-10 pr-10"
            placeholder={placeholder}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {searchText && (
            <button
              className="absolute right-3 top-1/2 transform -translate-y-1/2 btn btn-ghost btn-xs btn-circle"
              onClick={() => { setSearchText(''); setResults([]); }}
            >
              <ClearIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {showFilters && (
          <button
            className={`btn btn-square ${filters.length > 0 ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            title="Toggle Filters"
          >
            <div className="indicator">
              {filters.length > 0 && <span className="indicator-item badge badge-sm badge-error">{filters.length}</span>}
              <FilterIcon className="w-5 h-5" />
            </div>
          </button>
        )}

        <Select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="select-sm w-32"
          options={[
            { value: 'relevance', label: 'Relevance' },
            { value: 'timestamp', label: 'Timestamp' },
            { value: 'score', label: 'Score' },
            { value: 'title', label: 'Title' }
          ]}
        />

        <Button
          size="sm"
          variant={sortOrder === 'desc' ? 'primary' : 'outline'}
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          className={sortOrder === 'asc' ? 'rotate-180' : ''}
        >
          ↓ {sortOrder}
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Collapse isOpen={showFiltersPanel}>
          <Card className="shadow-xl">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Search Filters</h3>
                <Button variant="outline" size="sm" onClick={addFilter}>
                  + Add Filter
                </Button>
              </div>

              {filters.length === 0 && (
                <p className="text-center py-4 opacity-70 text-sm">
                  No filters applied. Add filters to refine your search.
                </p>
              )}

              <div className="space-y-2">
                {filters.map((filter) => (
                  <div key={filter.id} className="flex gap-2 items-center">
                    <Select
                      value={filter.field}
                      onChange={(e) => updateFilter(filter.id, { field: e.target.value })}
                      className="select-sm w-32"
                      options={[
                        { value: 'type', label: 'Type' },
                        { value: 'status', label: 'Status' },
                        { value: 'score', label: 'Score' },
                        { value: 'timestamp', label: 'Timestamp' }
                      ]}
                    />

                    <Select
                      value={filter.operator}
                      onChange={(e) => updateFilter(filter.id, { operator: e.target.value as any })}
                      className="select-sm w-36"
                      options={[
                        { value: 'eq', label: 'Equals' },
                        { value: 'ne', label: 'Not Equals' },
                        { value: 'gt', label: 'Greater Than' },
                        { value: 'lt', label: 'Less Than' },
                        { value: 'contains', label: 'Contains' },
                        { value: 'not_contains', label: 'Does Not Contain' }
                      ]}
                    />

                    <Input
                      size="sm"
                      placeholder="Value"
                      value={filter.value as string}
                      onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                      className="flex-grow"
                    />

                    <Button
                      size="sm"
                      variant="error"
                      onClick={() => removeFilter(filter.id)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Collapse>
      )}

      {/* Search Stats */}
      {searchText && (
        <div className="flex justify-between items-center px-2 py-1 bg-base-200 rounded text-sm opacity-70">
          <span>
            {searchStats.totalResults} results in {searchStats.timeTaken}ms
            {searchStats.hasMore && ' (showing first 50)'}
          </span>
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-4">Search Results ({results.length})</h3>

          <div className="space-y-2">
            {results.map((result) => (
              <Card
                key={result.id}
                className={`cursor-pointer hover:shadow-lg transition-shadow ${result.highlighted ? 'bg-primary/5' : ''
                  } border-l-4 border-${getResultTypeColor(result.type)}`}
                onClick={() => onResultClick?.(result)}
              >
                <div className="p-4">
                  <div className="flex items-start gap-2">
                    <button
                      className="btn btn-ghost btn-xs btn-circle"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFavorites(prev =>
                          prev.includes(result.id) ? prev.filter(id => id !== result.id) : [...prev, result.id]
                        );
                      }}
                    >
                      {favorites.includes(result.id) ? (
                        <StarIconSolid className="w-4 h-4 text-warning" />
                      ) : (
                        <StarIcon className="w-4 h-4" />
                      )}
                    </button>

                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getResultTypeColor(result.type)} size="sm">
                          {result.type}
                        </Badge>
                        <span className="text-xs opacity-70">{result.timestamp.toLocaleString()}</span>
                        <Badge variant="neutral" size="sm" className="ml-auto">
                          {(result.score * 100).toFixed(0)}%
                        </Badge>
                      </div>

                      <h4 className="font-bold mb-1">{result.title}</h4>
                      <p className="text-sm opacity-70 mb-2">{result.description}</p>

                      {result.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {result.tags.map((tag) => (
                            <Badge key={tag} variant="neutral" size="sm">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      className="btn btn-ghost btn-xs btn-circle"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedResult(expandedResult === result.id ? null : result.id);
                      }}
                    >
                      {expandedResult === result.id ? (
                        <ChevronUpIcon className="w-4 h-4" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {expandedResult === result.id && (
                    <div className="mt-4 pt-4 border-t border-base-300">
                      <h5 className="font-bold text-sm mb-2">Metadata</h5>
                      <pre className="text-xs opacity-70 overflow-x-auto">
                        {JSON.stringify(result.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {searchText && results.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <SearchOffIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-bold opacity-70 mb-2">No results found</h3>
          <p className="text-sm opacity-50">Try adjusting your search terms or filters.</p>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch;