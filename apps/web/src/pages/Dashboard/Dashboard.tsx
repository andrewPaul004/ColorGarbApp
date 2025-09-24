import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Container,
  Paper,
  Button,
  useTheme,
  useMediaQuery,
  Collapse,
} from '@mui/material';
import { Add as AddIcon, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { OrderCard } from '../../components/common/OrderCard';
import { CreateOrderDialog } from '../../components/orders/CreateOrderDialog';
import type { Order } from '../../types/shared';

/**
 * Main dashboard page displaying organization's orders with active orders prominently featured.
 * Features responsive grid layout, collapsible completed orders section, and mobile optimization.
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

  const [createOrderDialogOpen, setCreateOrderDialogOpen] = useState(false);
  const [completedOrdersExpanded, setCompletedOrdersExpanded] = useState<boolean>(false);

  /**
   * Loads orders on component mount
   */
  useEffect(() => {
    const loadOrders = async () => {
      try {
        await fetchOrders();
      } catch (error) {
        // Error is handled by the store
        console.error('Failed to load orders:', error);
      }
    };

    loadOrders();
  }, [fetchOrders]);

  /**
   * Handles toggle of completed orders section
   */
  const handleToggleCompletedOrders = () => {
    setCompletedOrdersExpanded(!completedOrdersExpanded);
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
    fetchOrders();

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
   * Determines if an order is completed based on its current stage
   * @param order Order to check
   * @returns True if order has reached the final stage (Delivery)
   */
  const isOrderCompleted = (order: Order): boolean => {
    return order.currentStage?.toLowerCase() === 'delivery';
  };

  /**
   * Gets active orders
   * @returns Active orders array
   */
  const getActiveOrders = (): Order[] => {
    return orders.filter(order => !isOrderCompleted(order));
  };

  /**
   * Gets completed orders
   * @returns Completed orders array
   */
  const getCompletedOrders = (): Order[] => {
    return orders.filter(order => isOrderCompleted(order));
  };

  /**
   * Gets summary statistics for the current filtered orders
   * @returns Summary object with counts and totals
   */
  const getOrdersSummary = () => {
    const totalOrders = orders.length;
    const totalValue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const activeOrders = orders.filter(order => !isOrderCompleted(order)).length;
    const overdueOrders = orders.filter(order =>
      new Date(order.currentShipDate) < new Date() && !isOrderCompleted(order)
    ).length;

    return { totalOrders, totalValue, activeOrders, overdueOrders };
  };

  const activeOrders = getActiveOrders();
  const completedOrders = getCompletedOrders();
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
          {activeOrders.length === 0 && completedOrders.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                No Orders Found
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Your organization doesn't have any orders yet.
              </Typography>
            </Paper>
          ) : (
            <>
              {/* Active Orders Section */}
              {activeOrders.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
                    Active Orders ({activeOrders.length})
                  </Typography>
                  <Grid container spacing={isMobile ? 2 : 3}>
                    {activeOrders.map((order) => (
                      <Grid item xs={12} sm={6} md={4} key={order.id}>
                        <OrderCard
                          order={order}
                          onClick={handleOrderClick}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {/* Completed Orders Section */}
              {completedOrders.length > 0 && (
                <Box>
                  <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      variant="outlined"
                      onClick={handleToggleCompletedOrders}
                      startIcon={completedOrdersExpanded ? <ExpandLess /> : <ExpandMore />}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                      }}
                    >
                      {completedOrdersExpanded ? 'Hide' : 'Show'} Completed Orders ({completedOrders.length})
                    </Button>
                  </Box>

                  <Collapse in={completedOrdersExpanded}>
                    <Grid container spacing={isMobile ? 2 : 3}>
                      {completedOrders.map((order) => (
                        <Grid item xs={12} sm={6} md={4} key={order.id}>
                          <Box sx={{ opacity: 0.7 }}>
                            <OrderCard
                              order={order}
                              onClick={handleOrderClick}
                            />
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Collapse>
                </Box>
              )}
            </>
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