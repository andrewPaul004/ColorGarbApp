import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  useTheme,
  useMediaQuery,
  TextField,
  InputAdornment,
  Chip,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Tooltip,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { Search, Visibility, Assignment } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { OrderCard } from '../../components/common/OrderCard';
import type { Order } from '../../types/shared';

/**
 * Orders list page displaying all orders with enhanced filtering, search, and view options.
 * Provides comprehensive order management with table and card views.
 * 
 * @component
 * @returns {JSX.Element} Orders list page component
 * 
 * @example
 * ```tsx
 * // Used in routing configuration
 * <Route path="/orders" element={<OrdersList />} />
 * ```
 * 
 * @since 1.0.0
 */
export const OrdersList: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const {
    orders,
    ordersLoading,
    ordersError,
    user,
    fetchOrders,
    clearOrdersError,
  } = useAppStore();

  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [stageFilter, setStageFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  /**
   * Loads orders on component mount and when filters change
   */
  useEffect(() => {
    const loadOrders = async () => {
      try {
        await fetchOrders(
          statusFilter === 'All' ? undefined : statusFilter,
          stageFilter === 'All' ? undefined : stageFilter
        );
      } catch (error) {
        console.error('Failed to load orders:', error);
      }
    };

    loadOrders();
  }, [statusFilter, stageFilter]);

  /**
   * Handles status filter change
   * @param event Select change event
   */
  const handleStatusChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value);
    clearOrdersError();
  };

  /**
   * Handles stage filter change
   * @param event Select change event
   */
  const handleStageChange = (event: SelectChangeEvent) => {
    setStageFilter(event.target.value);
    clearOrdersError();
  };

  /**
   * Handles search query change
   * @param event Input change event
   */
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  /**
   * Handles order navigation - opens order details
   * @param order Selected order
   */
  const handleOrderClick = (order: Order) => {
    navigate(`/orders/${order.id}`);
  };

  /**
   * Gets available manufacturing stages for filter dropdown
   * @returns Array of stage names
   */
  const getAvailableStages = (): string[] => {
    return [
      'Initial Consultation',
      'Contract & Payment',
      'Design Development',
      'Measurements',
      'Fabric Selection',
      'Pattern Development',
      'First Fitting',
      'Production',
      'Second Fitting',
      'Final Alterations',
      'Quality Control',
      'Packaging',
      'Shipped'
    ];
  };

  /**
   * Filters orders based on search query
   * @returns Filtered orders array
   */
  const getFilteredOrders = (): Order[] => {
    if (!searchQuery.trim()) return orders;
    
    const query = searchQuery.toLowerCase();
    return orders.filter(order =>
      order.orderNumber?.toLowerCase().includes(query) ||
      order.description?.toLowerCase().includes(query) ||
      order.customerName?.toLowerCase().includes(query) ||
      order.currentStage?.toLowerCase().includes(query)
    );
  };

  /**
   * Gets summary statistics for the current filtered orders
   * @returns Summary object with counts and totals
   */
  const getOrdersSummary = () => {
    const filteredOrders = getFilteredOrders();
    const totalOrders = filteredOrders.length;
    const totalValue = filteredOrders.reduce((sum, order) => {
      // Only include orders with actual values, skip null/TBD orders
      return order.totalAmount !== null ? sum + order.totalAmount : sum;
    }, 0);
    const activeOrders = filteredOrders.filter(order => order.isActive).length;
    const overdueOrders = filteredOrders.filter(order => 
      new Date(order.currentShipDate) < new Date() && order.isActive
    ).length;

    return { totalOrders, totalValue, activeOrders, overdueOrders };
  };

  /**
   * Formats currency amount for display
   * @param amount Numeric amount or null
   * @returns Formatted currency string or "TBD"
   */
  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) {
      return 'TBD';
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  /**
   * Formats date for display
   * @param date Date to format
   * @returns Formatted date string
   */
  const formatDate = (date: string | Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  /**
   * Gets status chip color based on order status
   * @param order Order to evaluate
   * @returns Chip color
   */
  const getStatusChipColor = (order: Order): 'success' | 'warning' | 'error' | 'default' => {
    if (!order.isActive) return 'default';
    if (new Date(order.currentShipDate) < new Date()) return 'error';
    return 'success';
  };

  /**
   * Gets status text for display
   * @param order Order to evaluate
   * @returns Status text
   */
  const getStatusText = (order: Order): string => {
    if (!order.isActive) return 'Completed';
    if (new Date(order.currentShipDate) < new Date()) return 'Overdue';
    return 'Active';
  };

  const filteredOrders = getFilteredOrders();
  const summary = getOrdersSummary();

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
          All Orders
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Complete view of all orders in your organization with advanced filtering and search.
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
              {summary.totalOrders}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Orders
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'success.main' }}>
              {summary.activeOrders}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'error.main' }}>
              {summary.overdueOrders}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Overdue
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {formatCurrency(summary.totalValue)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Value
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="status-filter-label">Status Filter</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                label="Status Filter"
                onChange={handleStatusChange}
              >
                <MenuItem value="All">All Orders</MenuItem>
                <MenuItem value="Active">Active Only</MenuItem>
                <MenuItem value="Inactive">Completed/Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="stage-filter-label">Stage Filter</InputLabel>
              <Select
                labelId="stage-filter-label"
                value={stageFilter}
                label="Stage Filter"
                onChange={handleStageChange}
              >
                <MenuItem value="All">All Stages</MenuItem>
                {getAvailableStages().map((stage) => (
                  <MenuItem key={stage} value={stage}>
                    {stage}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel id="view-mode-label">View Mode</InputLabel>
              <Select
                labelId="view-mode-label"
                value={viewMode}
                label="View Mode"
                onChange={(e) => setViewMode(e.target.value as 'cards' | 'table')}
              >
                <MenuItem value="cards">Cards</MenuItem>
                <MenuItem value="table">Table</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Display */}
      {ordersError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={clearOrdersError}>
          {ordersError}
        </Alert>
      )}

      {/* Loading State */}
      {ordersLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Orders Display */}
      {!ordersLoading && !ordersError && (
        <>
          {filteredOrders.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                No Orders Found
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {searchQuery 
                  ? `No orders match "${searchQuery}". Try adjusting your search criteria.`
                  : statusFilter === 'All' && stageFilter === 'All'
                    ? "Your organization doesn't have any orders yet."
                    : "No orders match the current filters. Try adjusting your search criteria."
                }
              </Typography>
            </Paper>
          ) : (
            <>
              {viewMode === 'cards' ? (
                <Grid container spacing={isMobile ? 2 : 3}>
                  {filteredOrders.map((order) => (
                    <Grid item xs={12} sm={6} lg={4} key={order.id}>
                      <OrderCard
                        order={order}
                        onClick={handleOrderClick}
                      />
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Order #</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Stage</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Ship Date</TableCell>
                        <TableCell>Value</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id} hover>
                          <TableCell sx={{ fontWeight: 500 }}>
                            {order.orderNumber}
                          </TableCell>
                          <TableCell>{order.customerName}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ 
                              maxWidth: 200, 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap' 
                            }}>
                              {order.description}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {order.currentStage}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getStatusText(order)}
                              color={getStatusChipColor(order)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography 
                              variant="body2" 
                              color={new Date(order.currentShipDate) < new Date() && order.isActive ? 'error' : 'text.primary'}
                            >
                              {formatDate(order.currentShipDate)}
                            </Typography>
                          </TableCell>
                          <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                          <TableCell align="center">
                            <Tooltip title="View Details">
                              <IconButton 
                                size="small" 
                                onClick={() => handleOrderClick(order)}
                                color="primary"
                              >
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </>
      )}
    </Container>
  );
};

export default OrdersList;