import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  DateRange as DateRangeIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useCommunicationAudit } from '../hooks/useCommunicationAudit';
import { CommunicationLogViewer } from './CommunicationLogViewer';
import { CommunicationExportDialog } from './CommunicationExportDialog';
import type { CommunicationAuditSearchRequest } from '../types/communicationAudit';

/**
 * Main dashboard component for communication audit trail management.
 * Provides search, filtering, export, and detailed view capabilities.
 * 
 * @component
 * @returns {JSX.Element} Communication audit dashboard
 * 
 * @example
 * ```tsx
 * <CommunicationAuditDashboard />
 * ```
 * 
 * @since 3.4.0
 */
export const CommunicationAuditDashboard: React.FC = () => {
  // State management
  const [searchRequest, setSearchRequest] = useState<CommunicationAuditSearchRequest>({
    page: 1,
    pageSize: 20,
    sortBy: 'sentAt',
    sortDirection: 'desc'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Custom hook for API communication
  const {
    searchResults,
    deliverySummary,
    loading,
    error,
    searchCommunications,
    getDeliverySummary,
    exportCommunications
  } = useCommunicationAudit();

  // Load initial data
  useEffect(() => {
    handleSearch();
    loadDeliverySummary();
  }, []);

  /**
   * Handles search form submission
   */
  const handleSearch = async () => {
    const request: CommunicationAuditSearchRequest = {
      ...searchRequest,
      searchTerm: searchTerm.trim() || undefined,
      page: 1 // Reset to first page on new search
    };

    setSearchRequest(request);
    await searchCommunications(request);
  };

  /**
   * Handles search input changes with debounced search
   */
  const handleSearchInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  /**
   * Handles page change for pagination
   */
  const handlePageChange = async (event: unknown, newPage: number) => {
    const request = { ...searchRequest, page: newPage + 1 };
    setSearchRequest(request);
    await searchCommunications(request);
  };

  /**
   * Handles page size change
   */
  const handlePageSizeChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const pageSize = parseInt(event.target.value, 10);
    const request = { ...searchRequest, pageSize, page: 1 };
    setSearchRequest(request);
    await searchCommunications(request);
  };

  /**
   * Handles filter changes
   */
  const handleFilterChange = (field: string, value: any) => {
    setSearchRequest(prev => ({
      ...prev,
      [field]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  /**
   * Loads delivery summary for dashboard metrics
   */
  const loadDeliverySummary = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await getDeliverySummary(
      undefined, // organizationId - will be handled by backend based on user role
      thirtyDaysAgo.toISOString(),
      new Date().toISOString()
    );
  };

  /**
   * Handles export functionality
   */
  const handleExport = (format: 'csv' | 'excel') => {
    exportCommunications(searchRequest, format);
  };

  /**
   * Opens detailed view for a communication log
   */
  const handleViewDetails = (logId: string) => {
    setSelectedLog(logId);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Header */}
        <Typography variant="h4" component="h1" gutterBottom>
          Communication Audit Trail
        </Typography>

        {/* Summary Cards */}
        {deliverySummary && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Communications
                  </Typography>
                  <Typography variant="h4">
                    {deliverySummary.totalCommunications.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Delivery Success Rate
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {deliverySummary.deliverySuccessRate.toFixed(1)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Failed Deliveries
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {deliverySummary.statusCounts.Failed || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Peak Hour
                  </Typography>
                  <Typography variant="h4">
                    {deliverySummary.peakHour}:00
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Search and Filter Controls */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search communications..."
                value={searchTerm}
                onChange={handleSearchInputChange}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Box display="flex" gap={1}>
                <Button
                  variant="contained"
                  onClick={handleSearch}
                  startIcon={<SearchIcon />}
                >
                  Search
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setShowFilters(!showFilters)}
                  startIcon={<FilterIcon />}
                >
                  Filters
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setExportDialogOpen(true)}
                  startIcon={<DownloadIcon />}
                >
                  Export
                </Button>
              </Box>
            </Grid>
          </Grid>

          {/* Advanced Filters */}
          {showFilters && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Communication Type</InputLabel>
                    <Select
                      multiple
                      value={searchRequest.communicationType || []}
                      onChange={(e) => handleFilterChange('communicationType', e.target.value)}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(selected as string[]).map((value) => (
                            <Chip key={value} label={value} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      <MenuItem value="Email">Email</MenuItem>
                      <MenuItem value="SMS">SMS</MenuItem>
                      <MenuItem value="Message">Message</MenuItem>
                      <MenuItem value="SystemNotification">System Notification</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Delivery Status</InputLabel>
                    <Select
                      multiple
                      value={searchRequest.deliveryStatus || []}
                      onChange={(e) => handleFilterChange('deliveryStatus', e.target.value)}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(selected as string[]).map((value) => (
                            <Chip key={value} label={value} size="small" />
                          ))}
                        </Box>
                      )}
                    >
                      <MenuItem value="Sent">Sent</MenuItem>
                      <MenuItem value="Delivered">Delivered</MenuItem>
                      <MenuItem value="Read">Read</MenuItem>
                      <MenuItem value="Failed">Failed</MenuItem>
                      <MenuItem value="Bounced">Bounced</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <DatePicker
                    label="From Date"
                    value={searchRequest.dateFrom ? new Date(searchRequest.dateFrom) : null}
                    onChange={(date) => handleFilterChange('dateFrom', date?.toISOString())}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <DatePicker
                    label="To Date"
                    value={searchRequest.dateTo ? new Date(searchRequest.dateTo) : null}
                    onChange={(date) => handleFilterChange('dateTo', date?.toISOString())}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </Paper>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Results Table */}
        <Paper>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Subject</TableCell>
                      <TableCell>Recipient</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Sent At</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {searchResults?.logs.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell>
                          <Chip 
                            label={log.communicationType} 
                            size="small" 
                            variant="outlined"
                            color={log.communicationType === 'Email' ? 'primary' : 
                                   log.communicationType === 'SMS' ? 'secondary' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap>
                            {log.subject || 'No Subject'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {log.recipientEmail || log.recipientPhone || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={log.deliveryStatus} 
                            size="small" 
                            color={log.deliveryStatus === 'Delivered' ? 'success' : 
                                   log.deliveryStatus === 'Failed' ? 'error' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(log.sentAt).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small" 
                              onClick={() => handleViewDetails(log.id)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {searchResults && (
                <TablePagination
                  rowsPerPageOptions={[10, 20, 50, 100]}
                  component="div"
                  count={searchResults.totalCount}
                  rowsPerPage={searchRequest.pageSize}
                  page={(searchRequest.page || 1) - 1}
                  onPageChange={handlePageChange}
                  onRowsPerPageChange={handlePageSizeChange}
                />
              )}
            </>
          )}
        </Paper>

        {/* Detail View Dialog */}
        {selectedLog && (
          <CommunicationLogViewer
            logId={selectedLog}
            open={!!selectedLog}
            onClose={() => setSelectedLog(null)}
          />
        )}

        {/* Export Dialog */}
        <CommunicationExportDialog
          open={exportDialogOpen}
          onClose={() => setExportDialogOpen(false)}
          searchCriteria={searchRequest}
        />
      </Container>
    </LocalizationProvider>
  );
};