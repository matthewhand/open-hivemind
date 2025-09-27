import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  Collapse,
  Button,
  Select,
  MenuItem,
  FormControl,
  Badge,
  LinearProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  TrendingUp as TrendingUpIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  SearchOff as SearchOffIcon,
} from '@mui/icons-material';
// import { useAppSelector } from '../store/hooks';
// import { selectDashboard } from '../store/slices/dashboardSlice';
import { AnimatedBox } from '../animations/AnimationComponents';

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
  showSuggestions?: boolean;
  showHistory?: boolean;
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
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const [searchStats, setSearchStats] = useState({
    totalResults: 0,
    timeTaken: 0,
    hasMore: false,
  });

  // const { bots } = useAppSelector(selectDashboard);
  // bots data can be used for suggestions if needed
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Perform search with Elasticsearch-like functionality
  const performSearch = useCallback(async (query: SearchQuery) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);

    try {
      // Simulate Elasticsearch search
      const startTime = Date.now();
      
      // Call the search function
      const searchResults = await onSearch(query);
      
      const endTime = Date.now();
      const timeTaken = endTime - startTime;

      setResults(searchResults);
      setSearchStats({
        totalResults: searchResults.length,
        timeTaken,
        hasMore: searchResults.length >= maxResults,
      });

      // Add to search history if it's a new search
      if (query.text && query.page === 0) {
        const newHistory = [query.text, ...searchHistory.filter(h => h !== query.text)].slice(0, 10);
        setSearchHistory(newHistory);
      }

    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Search error:', error);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [onSearch, searchHistory, maxResults]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchText.length >= autoCompleteMinLength || filters.length > 0) {
      searchTimeoutRef.current = setTimeout(() => {
        const query: SearchQuery = {
          text: searchText,
          filters,
          sortBy,
          sortOrder,
          page: 0,
          pageSize: maxResults,
        };

        performSearch(query);
      }, debounceTime);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText, filters, sortBy, sortOrder, debounceTime, autoCompleteMinLength, maxResults, performSearch]);

  // Handle search input changes
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: SearchFilter[]) => {
    setFilters(newFilters);
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  };

  // Toggle filter visibility
  const toggleFilters = () => {
    setShowFiltersPanel(!showFiltersPanel);
  };

  // Add a new filter
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

  // Update filter
  const updateFilter = (filterId: string, updates: Partial<SearchFilter>) => {
    const newFilters = filters.map(filter =>
      filter.id === filterId ? { ...filter, ...updates } : filter
    );
    handleFilterChange(newFilters);
  };

  // Remove filter
  const removeFilter = (filterId: string) => {
    const newFilters = filters.filter(filter => filter.id !== filterId);
    handleFilterChange(newFilters);
  };

  // Toggle result expansion
  const toggleResultExpansion = (resultId: string) => {
    setExpandedResult(expandedResult === resultId ? null : resultId);
  };

  // Toggle favorite
  const toggleFavorite = (resultId: string) => {
    setFavorites(prev =>
      prev.includes(resultId)
        ? prev.filter(id => id !== resultId)
        : [...prev, resultId]
    );
  };

  // Clear search
  const clearSearch = () => {
    setSearchText('');
    setFilters([]);
    setResults([]);
  };

  if (isLoading && results.length === 0) {
    return (
      <AnimatedBox
        animation={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
        sx={{ p: 3, backgroundColor: 'background.paper', borderRadius: 2 }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <LinearProgress sx={{ flex: 1 }} />
          <Typography variant="body2" color="text.secondary">
            Searching...
          </Typography>
        </Box>
      </AnimatedBox>
    );
  }

  return (
    <AnimatedBox
      animation={{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }}
      sx={{ width: '100%' }}
    >
      {/* Search Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 2,
          p: 2,
          backgroundColor: 'background.paper',
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        <TextField
          fullWidth
          placeholder={placeholder}
          value={searchText}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {searchText && (
                  <IconButton size="small" onClick={clearSearch}>
                    <ClearIcon />
                  </IconButton>
                )}
              </InputAdornment>
            ),
          }}
          autoComplete="off"
        />

        {showFilters && (
          <IconButton
            onClick={toggleFilters}
            color={filters.length > 0 ? 'primary' : 'default'}
            title="Toggle Filters"
          >
            <Badge badgeContent={filters.length} color="primary">
              <FilterIcon />
            </Badge>
          </IconButton>
        )}

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            startAdornment={<TrendingUpIcon fontSize="small" />}
          >
            <MenuItem value="relevance">Relevance</MenuItem>
            <MenuItem value="timestamp">Timestamp</MenuItem>
            <MenuItem value="score">Score</MenuItem>
            <MenuItem value="title">Title</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant={sortOrder === 'desc' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          startIcon={<TrendingUpIcon />}
          sx={{ transform: sortOrder === 'asc' ? 'rotate(180deg)' : 'none' }}
        >
          {sortOrder === 'desc' ? 'Desc' : 'Asc'}
        </Button>
      </Box>

      {/* Filters Panel */}
      {showFilters && (
        <Collapse in={showFiltersPanel} timeout="auto" unmountOnExit>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Search Filters</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={addFilter}
                >
                  + Add Filter
                </Button>
              </Box>

              {filters.length === 0 && (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                  No filters applied. Add filters to refine your search.
                </Typography>
              )}

              {filters.map((filter) => (
                <Box key={filter.id} display="flex" gap={1} mb={1} alignItems="center">
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={filter.field}
                      onChange={(e) => updateFilter(filter.id, { field: e.target.value })}
                    >
                      <MenuItem value="type">Type</MenuItem>
                      <MenuItem value="status">Status</MenuItem>
                      <MenuItem value="score">Score</MenuItem>
                      <MenuItem value="timestamp">Timestamp</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={filter.operator}
                      onChange={(e) => updateFilter(filter.id, { operator: e.target.value as 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_contains' })}
                    >
                      <MenuItem value="eq">Equals</MenuItem>
                      <MenuItem value="ne">Not Equals</MenuItem>
                      <MenuItem value="gt">Greater Than</MenuItem>
                      <MenuItem value="lt">Less Than</MenuItem>
                      <MenuItem value="contains">Contains</MenuItem>
                      <MenuItem value="not_contains">Does Not Contain</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    size="small"
                    placeholder="Value"
                    value={filter.value}
                    onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                    sx={{ flex: 1 }}
                  />

                  <IconButton
                    size="small"
                    onClick={() => removeFilter(filter.id)}
                    color="error"
                  >
                    ×
                  </IconButton>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Collapse>
      )}

      {/* Search Stats */}
      {searchText && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
            p: 1,
            backgroundColor: 'action.hover',
            borderRadius: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {searchStats.totalResults} results in {searchStats.timeTaken}ms
            {searchStats.hasMore && ' (showing first 50)'}
          </Typography>
        </Box>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Search Results ({results.length})
          </Typography>
          
          <List sx={{ p: 0 }}>
            {results.map((result) => (
              <ListItem
                key={result.id}
                sx={{ p: 0, mb: 1 }}
                onClick={() => onResultClick?.(result)}
              >
                <Card
                  sx={{
                    width: '100%',
                    backgroundColor: result.highlighted ? 'action.selected' : 'background.paper',
                    borderLeft: 3,
                    borderColor: `${getResultTypeColor(result.type)}.main`,
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box display="flex" alignItems="flex-start" gap={1}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(result.id);
                          }}
                        >
                          {favorites.includes(result.id) ? <StarIcon color="warning" /> : <StarBorderIcon />}
                        </IconButton>
                      </ListItemIcon>
                      
                      <Box flex={1}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Chip
                            label={result.type}
                            color={getResultTypeColor(result.type)}
                            size="small"
                          />
                          <Typography variant="subtitle2" color="text.secondary">
                            {result.timestamp.toLocaleString()}
                          </Typography>
                          <Box sx={{ ml: 'auto' }}>
                            <Chip
                              label={`${(result.score * 100).toFixed(0)}%`}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                        
                        <Typography variant="h6" gutterBottom>
                          {result.title}
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {result.description}
                        </Typography>
                        
                        {result.tags.length > 0 && (
                          <Box display="flex" gap={0.5} flexWrap="wrap" mb={1}>
                            {result.tags.map((tag) => (
                              <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                      
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleResultExpansion(result.id);
                        }}
                      >
                        {expandedResult === result.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Box>
                    
                    <Collapse in={expandedResult === result.id} timeout="auto" unmountOnExit>
                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Metadata
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {JSON.stringify(result.metadata, null, 2)}
                        </Typography>
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* No Results */}
      {searchText && results.length === 0 && !isLoading && (
        <Box textAlign="center" py={4}>
          <SearchOffIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No results found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search terms or filters.
          </Typography>
        </Box>
      )}
    </AnimatedBox>
  );
};

// Helper function to get result type color
const getResultTypeColor = (type: string) => {
  switch (type) {
    case 'bot': return 'primary';
    case 'log': return 'secondary';
    case 'metric': return 'success';
    case 'alert': return 'warning';
    case 'config': return 'info';
    default: return 'default';
  }
};

export default AdvancedSearch;