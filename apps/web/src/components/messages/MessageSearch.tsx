import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Typography,
  useTheme,
  alpha,
  Divider,
  Autocomplete,
  Paper,
  MenuList,
  MenuItem as MuiMenuItem,
  ListItemText,
  ListItemIcon,
  Popper,
  ClickAwayListener,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  History as HistoryIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import type { MessageSearchRequest } from '../../types/shared';

/**
 * Search history item interface
 */
interface SearchHistoryItem {
  id: string;
  searchTerm: string;
  timestamp: Date;
  resultCount?: number;
}

/**
 * Props for the MessageSearch component
 */
interface MessageSearchProps {
  /** Callback when search parameters change */
  onSearchChange: (searchParams: Partial<MessageSearchRequest>) => void;
  /** Current search parameters */
  currentParams: Partial<MessageSearchRequest>;
  /** Total number of search results */
  totalResults: number;
  /** Order ID for search history context */
  orderId?: string;
}

/**
 * Message search component with filters and date range selection
 * Provides advanced search capabilities for message threads
 * 
 * @component
 * @example
 * ```tsx
 * <MessageSearch
 *   onSearchChange={(params) => handleSearch(params)}
 *   currentParams={searchParams}
 *   totalResults={42}
 * />
 * ```
 */
export const MessageSearch: React.FC<MessageSearchProps> = ({
  onSearchChange,
  currentParams,
  totalResults,
  orderId = 'default'
}) => {
  const theme = useTheme();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchHistoryOpen, setSearchHistoryOpen] = useState(false);
  const searchHistoryAnchorRef = useRef<HTMLDivElement>(null);
  
  // Local form state
  const [searchTerm, setSearchTerm] = useState(currentParams.searchTerm || '');
  const [messageType, setMessageType] = useState(currentParams.messageType || '');
  const [senderRole, setSenderRole] = useState(currentParams.senderRole || '');
  const [dateFrom, setDateFrom] = useState<Date | null>(
    currentParams.dateFrom ? new Date(currentParams.dateFrom) : null
  );
  const [dateTo, setDateTo] = useState<Date | null>(
    currentParams.dateTo ? new Date(currentParams.dateTo) : null
  );
  const [includeAttachments, setIncludeAttachments] = useState<boolean | undefined>(
    currentParams.includeAttachments
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Search history state
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);

  // Load search history from localStorage on mount
  useEffect(() => {
    const loadSearchHistory = () => {
      try {
        const storedHistory = localStorage.getItem(`messageSearchHistory_${orderId}`);
        if (storedHistory) {
          const parsed = JSON.parse(storedHistory);
          const history = parsed.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp)
          }));
          setSearchHistory(history);
        }
      } catch (error) {
        console.warn('Failed to load search history:', error);
      }
    };
    
    loadSearchHistory();
  }, [orderId]);

  // Auto-detect if advanced filters are active
  useEffect(() => {
    const hasAdvancedFilters = messageType || senderRole || dateFrom || dateTo || includeAttachments !== undefined;
    setShowAdvanced(hasAdvancedFilters);
  }, [messageType, senderRole, dateFrom, dateTo, includeAttachments]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + F to focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      
      // Escape to clear search
      if (event.key === 'Escape') {
        if (searchHistoryOpen) {
          setSearchHistoryOpen(false);
        } else if (searchTerm) {
          handleClear();
        }
      }
      
      // Arrow down to open search history when search is focused
      if (event.key === 'ArrowDown' && document.activeElement === searchInputRef.current) {
        if (searchHistory.length > 0) {
          event.preventDefault();
          setSearchHistoryOpen(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchTerm, searchHistory.length, searchHistoryOpen]);

  /**
   * Saves a search term to history
   */
  const saveSearchToHistory = useCallback((term: string, resultCount: number) => {
    if (!term.trim()) return;
    
    const newHistoryItem: SearchHistoryItem = {
      id: Date.now().toString(),
      searchTerm: term.trim(),
      timestamp: new Date(),
      resultCount
    };
    
    setSearchHistory(prev => {
      // Remove duplicate terms and limit to 10 most recent
      const filtered = prev.filter(item => item.searchTerm !== term.trim());
      const updated = [newHistoryItem, ...filtered].slice(0, 10);
      
      // Save to localStorage
      try {
        localStorage.setItem(`messageSearchHistory_${orderId}`, JSON.stringify(updated));
      } catch (error) {
        console.warn('Failed to save search history:', error);
      }
      
      return updated;
    });
  }, [orderId]);

  /**
   * Clears search history
   */
  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(`messageSearchHistory_${orderId}`);
    } catch (error) {
      console.warn('Failed to clear search history:', error);
    }
  }, [orderId]);

  /**
   * Handles selecting a search from history
   */
  const handleHistorySelect = useCallback((historyItem: SearchHistoryItem) => {
    setSearchTerm(historyItem.searchTerm);
    setSearchHistoryOpen(false);
    
    // Trigger search immediately
    setTimeout(() => {
      const params = buildSearchParams();
      params.searchTerm = historyItem.searchTerm;
      onSearchChange(params);
    }, 0);
  }, [onSearchChange]);

  /**
   * Builds search parameters from current form state
   */
  const buildSearchParams = useCallback((): Partial<MessageSearchRequest> => {
    const params: Partial<MessageSearchRequest> = {};
    
    if (searchTerm.trim()) {
      params.searchTerm = searchTerm.trim();
    }
    if (messageType) {
      params.messageType = messageType;
    }
    if (senderRole) {
      params.senderRole = senderRole;
    }
    if (dateFrom) {
      params.dateFrom = dateFrom.toISOString();
    }
    if (dateTo) {
      // Set to end of day for inclusive search
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      params.dateTo = endOfDay.toISOString();
    }
    if (includeAttachments !== undefined) {
      params.includeAttachments = includeAttachments;
    }
    
    return params;
  }, [searchTerm, messageType, senderRole, dateFrom, dateTo, includeAttachments]);

  /**
   * Handles search execution
   */
  const handleSearch = useCallback(() => {
    const params = buildSearchParams();
    onSearchChange(params);
    
    // Save search term to history if it exists
    if (searchTerm.trim()) {
      saveSearchToHistory(searchTerm.trim(), totalResults);
    }
  }, [buildSearchParams, onSearchChange, searchTerm, totalResults, saveSearchToHistory]);

  /**
   * Clears all search filters
   */
  const handleClear = useCallback(() => {
    setSearchTerm('');
    setMessageType('');
    setSenderRole('');
    setDateFrom(null);
    setDateTo(null);
    setIncludeAttachments(undefined);
    onSearchChange({});
  }, [onSearchChange]);

  /**
   * Handles Enter key press in search field
   */
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearch();
    }
  }, [handleSearch]);

  /**
   * Toggles advanced filter visibility
   */
  const toggleAdvanced = useCallback(() => {
    setShowAdvanced(prev => !prev);
  }, []);

  /**
   * Gets count of active filters
   */
  const getActiveFilterCount = useCallback((): number => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (messageType) count++;
    if (senderRole) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (includeAttachments !== undefined) count++;
    return count;
  }, [searchTerm, messageType, senderRole, dateFrom, dateTo, includeAttachments]);

  const activeFilterCount = getActiveFilterCount();

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box
        sx={{
          p: 2,
          bgcolor: alpha(theme.palette.primary.main, 0.02),
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        {/* Main Search Bar */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, position: 'relative' }}>
          <Box sx={{ flex: 1, position: 'relative' }} ref={searchHistoryAnchorRef}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search messages... (Ctrl+F)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => searchHistory.length > 0 && setSearchHistoryOpen(false)}
              inputRef={searchInputRef}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />,
                endAdornment: searchHistory.length > 0 && (
                  <Tooltip title="Search history (↓)">
                    <IconButton
                      size="small"
                      onClick={() => setSearchHistoryOpen(!searchHistoryOpen)}
                      sx={{ p: 0.5 }}
                    >
                      {searchHistoryOpen ? <ArrowUpIcon /> : <ArrowDownIcon />}
                    </IconButton>
                  </Tooltip>
                ),
              }}
              aria-label="Search messages"
              aria-describedby="search-help"
            />
            
            {/* Search History Dropdown */}
            <Popper
              open={searchHistoryOpen}
              anchorEl={searchHistoryAnchorRef.current}
              placement="bottom-start"
              style={{ width: searchHistoryAnchorRef.current?.clientWidth, zIndex: 1300 }}
            >
              <ClickAwayListener onClickAway={() => setSearchHistoryOpen(false)}>
                <Paper elevation={8} sx={{ mt: 0.5 }}>
                  <MenuList dense>
                    <MuiMenuItem
                      sx={{ 
                        justifyContent: 'space-between',
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        py: 1
                      }}
                    >
                      <ListItemText 
                        primary="Search History" 
                        primaryTypographyProps={{ variant: 'caption', fontWeight: 'bold' }}
                      />
                      <Button
                        size="small"
                        onClick={clearSearchHistory}
                        sx={{ textTransform: 'none', minWidth: 'auto', fontSize: '0.75rem' }}
                      >
                        Clear
                      </Button>
                    </MuiMenuItem>
                    {searchHistory.map((item) => (
                      <MuiMenuItem
                        key={item.id}
                        onClick={() => handleHistorySelect(item)}
                        sx={{ py: 1 }}
                      >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <HistoryIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={item.searchTerm}
                          secondary={
                            <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="caption" color="text.secondary">
                                {item.resultCount !== undefined && `${item.resultCount} results`}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.timestamp.toLocaleDateString()}
                              </Typography>
                            </Box>
                          }
                          primaryTypographyProps={{ 
                            noWrap: true,
                            sx: { maxWidth: '200px' }
                          }}
                        />
                      </MuiMenuItem>
                    ))}
                    {searchHistory.length === 0 && (
                      <MuiMenuItem disabled>
                        <ListItemText
                          primary="No search history"
                          primaryTypographyProps={{ variant: 'caption', fontStyle: 'italic' }}
                        />
                      </MuiMenuItem>
                    )}
                  </MenuList>
                </Paper>
              </ClickAwayListener>
            </Popper>
          </Box>
          
          <Button
            variant="contained"
            size="small"
            onClick={handleSearch}
            disabled={activeFilterCount === 0}
            startIcon={<SearchIcon />}
          >
            Search
          </Button>
        </Box>
        
        {/* Search Help Text */}
        <Typography 
          id="search-help"
          variant="caption" 
          color="text.secondary" 
          sx={{ display: 'block', mb: 1, fontSize: '0.7rem' }}
        >
          Press Ctrl+F to focus search, ↓ for history, Esc to clear
        </Typography>

        {/* Filter Summary and Controls */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: showAdvanced ? 2 : 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              variant="text"
              onClick={toggleAdvanced}
              startIcon={<FilterIcon />}
              sx={{ textTransform: 'none' }}
            >
              {showAdvanced ? 'Hide' : 'Show'} Filters
              {activeFilterCount > 0 && (
                <Chip 
                  label={activeFilterCount} 
                  size="small" 
                  color="primary" 
                  sx={{ ml: 1, height: 16, fontSize: '0.675rem' }}
                />
              )}
            </Button>
            {activeFilterCount > 0 && (
              <Button
                size="small"
                variant="text"
                onClick={handleClear}
                startIcon={<ClearIcon />}
                color="secondary"
                sx={{ textTransform: 'none' }}
              >
                Clear All
              </Button>
            )}
          </Box>
          
          <Typography variant="caption" color="text.secondary">
            {totalResults} {totalResults === 1 ? 'message' : 'messages'}
          </Typography>
        </Box>

        {/* Advanced Filters */}
        {showAdvanced && (
          <>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
              <FormControl size="small">
                <InputLabel>Message Type</InputLabel>
                <Select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value)}
                  label="Message Type"
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="General">General</MenuItem>
                  <MenuItem value="Question">Question</MenuItem>
                  <MenuItem value="Update">Update</MenuItem>
                  <MenuItem value="Urgent">Urgent</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small">
                <InputLabel>Sender Role</InputLabel>
                <Select
                  value={senderRole}
                  onChange={(e) => setSenderRole(e.target.value)}
                  label="Sender Role"
                >
                  <MenuItem value="">All Roles</MenuItem>
                  <MenuItem value="Director">Director</MenuItem>
                  <MenuItem value="Finance">Finance</MenuItem>
                  <MenuItem value="ColorGarbStaff">ColorGarb Staff</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
              <DatePicker
                label="From Date"
                value={dateFrom}
                onChange={(newValue) => setDateFrom(newValue)}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true
                  }
                }}
              />

              <DatePicker
                label="To Date"
                value={dateTo}
                onChange={(newValue) => setDateTo(newValue)}
                minDate={dateFrom || undefined}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true
                  }
                }}
              />
            </Box>

            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Attachments</InputLabel>
              <Select
                value={includeAttachments === undefined ? '' : includeAttachments.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  setIncludeAttachments(
                    value === '' ? undefined : value === 'true'
                  );
                }}
                label="Attachments"
              >
                <MenuItem value="">All Messages</MenuItem>
                <MenuItem value="true">With Attachments</MenuItem>
                <MenuItem value="false">Without Attachments</MenuItem>
              </Select>
            </FormControl>
          </>
        )}

        {/* Active Filter Tags */}
        {activeFilterCount > 0 && (
          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {searchTerm.trim() && (
              <Chip
                label={`Search: "${searchTerm.trim()}"`}
                onDelete={() => {
                  setSearchTerm('');
                  setTimeout(handleSearch, 0);
                }}
                size="small"
                variant="outlined"
              />
            )}
            {messageType && (
              <Chip
                label={`Type: ${messageType}`}
                onDelete={() => {
                  setMessageType('');
                  setTimeout(handleSearch, 0);
                }}
                size="small"
                variant="outlined"
              />
            )}
            {senderRole && (
              <Chip
                label={`Role: ${senderRole}`}
                onDelete={() => {
                  setSenderRole('');
                  setTimeout(handleSearch, 0);
                }}
                size="small"
                variant="outlined"
              />
            )}
            {dateFrom && (
              <Chip
                label={`From: ${dateFrom.toLocaleDateString()}`}
                onDelete={() => {
                  setDateFrom(null);
                  setTimeout(handleSearch, 0);
                }}
                size="small"
                variant="outlined"
              />
            )}
            {dateTo && (
              <Chip
                label={`To: ${dateTo.toLocaleDateString()}`}
                onDelete={() => {
                  setDateTo(null);
                  setTimeout(handleSearch, 0);
                }}
                size="small"
                variant="outlined"
              />
            )}
            {includeAttachments !== undefined && (
              <Chip
                label={includeAttachments ? 'With Attachments' : 'No Attachments'}
                onDelete={() => {
                  setIncludeAttachments(undefined);
                  setTimeout(handleSearch, 0);
                }}
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default MessageSearch;