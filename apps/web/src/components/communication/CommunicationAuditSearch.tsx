import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  IconButton,
  Collapse,
  Grid,
  Typography,
  Divider,
  OutlinedInput,
  SelectChangeEvent,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  DateRange as DateRangeIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import type { CommunicationAuditSearchRequest } from '../../types/shared';

/**
 * Props for the CommunicationAuditSearch component
 */
interface CommunicationAuditSearchProps {
  /** Initial search criteria */
  initialCriteria?: CommunicationAuditSearchRequest;
  /** Callback when search criteria changes */
  onSearchChange: (criteria: CommunicationAuditSearchRequest) => void;
  /** Whether to show organization filter (for admin users) */
  showOrganizationFilter?: boolean;
  /** Whether the search is currently loading */
  loading?: boolean;
}

/**
 * Communication audit search and filter interface.
 * Provides comprehensive filtering options for communication logs.
 * 
 * @component
 * @since 3.4.0
 */
export const CommunicationAuditSearch: React.FC<CommunicationAuditSearchProps> = ({
  initialCriteria = {},
  onSearchChange,
  showOrganizationFilter = false,
  loading = false
}) => {
  const [searchCriteria, setSearchCriteria] = useState<CommunicationAuditSearchRequest>(initialCriteria);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Communication type options
  const communicationTypes = [
    'Email',
    'SMS', 
    'Message',
    'SystemNotification'
  ];

  // Delivery status options
  const deliveryStatuses = [
    'Sent',
    'Delivered', 
    'Read',
    'Opened',
    'Clicked',
    'Failed',
    'Bounced',
    'Queued'
  ];

  // Sort options
  const sortOptions = [
    { value: 'sentAt', label: 'Send Date' },
    { value: 'deliveredAt', label: 'Delivery Date' },
    { value: 'readAt', label: 'Read Date' },
    { value: 'communicationType', label: 'Type' },
    { value: 'deliveryStatus', label: 'Status' }
  ];

  /**
   * Update search criteria and notify parent
   */
  const updateCriteria = useCallback((updates: Partial<CommunicationAuditSearchRequest>) => {
    const newCriteria = { 
      ...searchCriteria, 
      ...updates,
      page: 1 // Reset to first page when criteria changes
    };
    setSearchCriteria(newCriteria);
    onSearchChange(newCriteria);
  }, [searchCriteria, onSearchChange]);

  /**
   * Handle text search
   */
  const handleSearchTermChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateCriteria({ searchTerm: event.target.value });
  };

  /**
   * Handle communication type selection
   */
  const handleCommunicationTypesChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    updateCriteria({ 
      communicationType: typeof value === 'string' ? value.split(',') : value 
    });
  };

  /**
   * Handle delivery status selection
   */
  const handleDeliveryStatusChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    updateCriteria({ 
      deliveryStatus: typeof value === 'string' ? value.split(',') : value 
    });
  };

  /**
   * Handle date range changes
   */
  const handleDateFromChange = (date: Date | null) => {
    updateCriteria({ dateFrom: date || undefined });
  };

  const handleDateToChange = (date: Date | null) => {
    updateCriteria({ dateTo: date || undefined });
  };

  /**
   * Handle sort options
   */
  const handleSortByChange = (event: SelectChangeEvent) => {
    updateCriteria({ sortBy: event.target.value });
  };

  const handleSortDirectionChange = (event: SelectChangeEvent) => {
    updateCriteria({ sortDirection: event.target.value as 'asc' | 'desc' });
  };

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    const clearedCriteria: CommunicationAuditSearchRequest = {
      page: 1,
      pageSize: searchCriteria.pageSize || 25,
      sortBy: 'sentAt',
      sortDirection: 'desc'
    };
    setSearchCriteria(clearedCriteria);
    onSearchChange(clearedCriteria);
  };

  /**
   * Count active filters
   */
  const activeFiltersCount = [
    searchCriteria.searchTerm,
    searchCriteria.communicationType?.length,
    searchCriteria.deliveryStatus?.length,
    searchCriteria.dateFrom,
    searchCriteria.dateTo,
    searchCriteria.orderId,
    searchCriteria.organizationId
  ].filter(Boolean).length;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Paper sx={{ p: 2, mb: 2 }}>
        {/* Main search bar */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Search messages, subjects, recipients..."
            value={searchCriteria.searchTerm || ''}
            onChange={handleSearchTermChange}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
              endAdornment: searchCriteria.searchTerm && (
                <IconButton
                  size="small"
                  onClick={() => updateCriteria({ searchTerm: undefined })}
                >
                  <ClearIcon />
                </IconButton>
              )
            }}
            disabled={loading}
          />
          
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            sx={{ minWidth: 140 }}
          >
            Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            {filtersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </Button>

          {activeFiltersCount > 0 && (
            <Tooltip title="Clear all filters">
              <IconButton onClick={clearFilters} color="primary">
                <ClearIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Advanced filters */}
        <Collapse in={filtersExpanded}>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={2}>
            {/* Communication Types */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Communication Types</InputLabel>
                <Select
                  multiple
                  value={searchCriteria.communicationType || []}
                  onChange={handleCommunicationTypesChange}
                  input={<OutlinedInput label="Communication Types" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                  disabled={loading}
                >
                  {communicationTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Delivery Status */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Delivery Status</InputLabel>
                <Select
                  multiple
                  value={searchCriteria.deliveryStatus || []}
                  onChange={handleDeliveryStatusChange}
                  input={<OutlinedInput label="Delivery Status" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                  disabled={loading}
                >
                  {deliveryStatuses.map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Date Range */}
            <Grid item xs={12} md={6}>
              <DatePicker
                label="From Date"
                value={searchCriteria.dateFrom || null}
                onChange={handleDateFromChange}
                slotProps={{ 
                  textField: { 
                    size: 'small',
                    fullWidth: true,
                    InputProps: {
                      startAdornment: <DateRangeIcon sx={{ color: 'text.secondary', mr: 1 }} />
                    }
                  }
                }}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <DatePicker
                label="To Date"
                value={searchCriteria.dateTo || null}
                onChange={handleDateToChange}
                minDate={searchCriteria.dateFrom || undefined}
                slotProps={{ 
                  textField: { 
                    size: 'small',
                    fullWidth: true,
                    InputProps: {
                      startAdornment: <DateRangeIcon sx={{ color: 'text.secondary', mr: 1 }} />
                    }
                  }
                }}
                disabled={loading}
              />
            </Grid>

            {/* Organization Filter (for admin users) */}
            {showOrganizationFilter && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Organization ID"
                  value={searchCriteria.organizationId || ''}
                  onChange={(e) => updateCriteria({ organizationId: e.target.value })}
                  disabled={loading}
                />
              </Grid>
            )}

            {/* Sort Options */}
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={searchCriteria.sortBy || 'sentAt'}
                    onChange={handleSortByChange}
                    label="Sort By"
                    disabled={loading}
                  >
                    {sortOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Direction</InputLabel>
                  <Select
                    value={searchCriteria.sortDirection || 'desc'}
                    onChange={handleSortDirectionChange}
                    label="Direction"
                    disabled={loading}
                  >
                    <MenuItem value="desc">Newest First</MenuItem>
                    <MenuItem value="asc">Oldest First</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Grid>
          </Grid>

          {/* Active Filters Summary */}
          {activeFiltersCount > 0 && (
            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Active Filters ({activeFiltersCount}):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {searchCriteria.searchTerm && (
                  <Chip
                    label={`Search: "${searchCriteria.searchTerm}"`}
                    onDelete={() => updateCriteria({ searchTerm: undefined })}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
                {searchCriteria.communicationType?.map((type) => (
                  <Chip
                    key={type}
                    label={`Type: ${type}`}
                    onDelete={() => updateCriteria({
                      communicationType: searchCriteria.communicationType?.filter(t => t !== type)
                    })}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
                {searchCriteria.deliveryStatus?.map((status) => (
                  <Chip
                    key={status}
                    label={`Status: ${status}`}
                    onDelete={() => updateCriteria({
                      deliveryStatus: searchCriteria.deliveryStatus?.filter(s => s !== status)
                    })}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
                {searchCriteria.dateFrom && (
                  <Chip
                    label={`From: ${searchCriteria.dateFrom.toLocaleDateString()}`}
                    onDelete={() => updateCriteria({ dateFrom: undefined })}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
                {searchCriteria.dateTo && (
                  <Chip
                    label={`To: ${searchCriteria.dateTo.toLocaleDateString()}`}
                    onDelete={() => updateCriteria({ dateTo: undefined })}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
          )}
        </Collapse>
      </Paper>
    </LocalizationProvider>
  );
};

export default CommunicationAuditSearch;