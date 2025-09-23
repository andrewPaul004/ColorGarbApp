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
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { OrderCard } from '../../components/common/OrderCard';
import { CreateOrderDialog } from '../../components/orders/CreateOrderDialog';
import type { Order } from '../../types/shared';

/**
 * Main dashboard page displaying organization's active orders.
 * Features responsive grid layout, filtering options, and mobile optimization.
 * Only shows orders that belong to the authenticated user's organization.
 * 
 * @component
 * @returns {JSX.Element} Dashboard page component
 * 
 * @example
 * ```tsx
 * // Used in routing configuration
 * <Route path="/dashboard" element={<Dashboard />} />
 * ```
 * 
 * @since 1.0.0
 */
export const Dashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  const {
    orders,
    ordersLoading,
    ordersError,
    user,
    fetchOrders,
    clearOrdersError,
  } = useAppStore();

  const [statusFilter, setStatusFilter] = useState<string>('Active');
  const [stageFilter, setStageFilter] = useState<string>('All');
  const [createOrderDialogOpen, setCreateOrderDialogOpen] = useState(false);

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
        // Error is handled by the store
        console.error('Failed to load orders:', error);
      }
    };

    loadOrders();
  }, [statusFilter, stageFilter]); // fetchOrders removed to prevent double calls due to function reference changes

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
   * Handles order card click - navigates to order detail page
   * @param order Selected order
   */
  const handleOrderClick = (order: Order) => {
    navigate(`/orders/${order.id}`);
  };

  /**
   * Opens the create order dialog
   */
  const handleCreateOrderClick = () => {
    setCreateOrderDialogOpen(true);
  };

  /**
   * Closes the create order dialog
   */
  const handleCreateOrderDialogClose = () => {
    setCreateOrderDialogOpen(false);
  };

  /**
   * Handles successful order creation - refresh orders and navigate to new order
   */
  const handleOrderCreated = (newOrder: any) => {
    // Refresh orders to show the new order
    fetchOrders(
      statusFilter === 'All' ? undefined : statusFilter,
      stageFilter === 'All' ? undefined : stageFilter
    );
    
    // Navigate to the new order's detail page
    setTimeout(() => {
      navigate(`/orders/${newOrder.id}`);
    }, 2500);
  };

  /**
   * Check if user can create orders (Director or Finance roles)
   */
  const canCreateOrders = (): boolean => {
    return user?.role === 'Director' || user?.role === 'Finance';
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
   * Gets summary statistics for the current filtered orders
   * @returns Summary object with counts and totals
   */
  const getOrdersSummary = () => {
    const totalOrders = orders.length;
    const totalValue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const activeOrders = orders.filter(order => order.isActive).length;
    const overdueOrders = orders.filter(order => 
      new Date(order.currentShipDate) < new Date() && order.isActive
    ).length;

    return { totalOrders, totalValue, activeOrders, overdueOrders };
  };

  const summary = getOrdersSummary();
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
            Order Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome back, {user?.name}! Here are your organization's orders.
          </Typography>
        </Box>
        
        {canCreateOrders() && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateOrderClick}
            data-testid="create-order-button"
            sx={{
              flexShrink: 0,
              minWidth: 'auto',
            }}
          >
            {isMobile ? 'Create Order' : 'Create New Order'}
          </Button>
        )}
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }} data-testid="total-orders-card">
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
              {summary.totalOrders}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Orders
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }} data-testid="active-orders-card">
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'success.main' }}>
              {summary.activeOrders}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }} data-testid="overdue-orders-card">
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'error.main' }}>
              {summary.overdueOrders}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Overdue
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }} data-testid="total-value-card">
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {formatCurrency(summary.totalValue)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Value
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="status-filter-label">Status Filter</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                label="Status Filter"
                onChange={handleStatusChange}
                data-testid="status-filter-select"
              >
                <MenuItem value="All">All Orders</MenuItem>
                <MenuItem value="Active">Active Only</MenuItem>
                <MenuItem value="Inactive">Completed/Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel id="stage-filter-label">Stage Filter</InputLabel>
              <Select
                labelId="stage-filter-label"
                value={stageFilter}
                label="Stage Filter"
                onChange={handleStageChange}
                data-testid="stage-filter-select"
                sx={{
                  '& .MuiSelect-select': {
                    paddingLeft: '14px',
                    paddingRight: '32px !important',
                  }
                }}
                MenuProps={{
                  PaperProps: {
                    style: {
                      maxWidth: 'none',
                      minWidth: '300px',
                    },
                  },
                }}
              >
                <MenuItem 
                  value="All"
                  sx={{ 
                    whiteSpace: 'normal',
                    wordWrap: 'break-word',
                    minHeight: '48px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  All Stages
                </MenuItem>
                {getAvailableStages().map((stage) => (
                  <MenuItem 
                    key={stage} 
                    value={stage}
                    sx={{ 
                      whiteSpace: 'normal',
                      wordWrap: 'break-word',
                      minHeight: '48px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {stage}
                  </MenuItem>
                ))}
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

      {/* Orders Grid */}
      {!ordersLoading && !ordersError && (
        <>
          {orders.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                No Orders Found
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {statusFilter === 'All' && !stageFilter 
                  ? "Your organization doesn't have any orders yet."
                  : "No orders match the current filters. Try adjusting your search criteria."
                }
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={isMobile ? 2 : 3}>
              {orders.map((order) => (
                <Grid item xs={12} sm={6} md={4} key={order.id}>
                  <OrderCard
                    order={order}
                    onClick={handleOrderClick}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* Create Order Dialog */}
      <CreateOrderDialog
        open={createOrderDialogOpen}
        onClose={handleCreateOrderDialogClose}
        onOrderCreated={handleOrderCreated}
      />
    </Container>
  );
};

export default Dashboard;