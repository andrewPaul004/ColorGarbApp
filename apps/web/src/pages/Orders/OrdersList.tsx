import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Container,
  Paper,
  useTheme,
  useMediaQuery,
  TextField,
  InputAdornment,
  Button,
  Collapse,
} from '@mui/material';
import {
  Search,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { OrderCard } from '../../components/common/OrderCard';
import type { Order } from '../../types/shared';

/**
 * Orders list page displaying active orders prominently with collapsible completed orders section.
 * Provides simplified interface focused on current work with easy access to order history.
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
    fetchOrders,
    clearOrdersError,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [completedOrdersExpanded, setCompletedOrdersExpanded] = useState<boolean>(false);

  /**
   * Loads orders on component mount
   */
  useEffect(() => {
    const loadOrders = async () => {
      try {
        await fetchOrders();
      } catch (error) {
        console.error('Failed to load orders:', error);
      }
    };

    loadOrders();
  }, [fetchOrders]);

  /**
   * Handles search query change
   * @param event Input change event
   */
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  /**
   * Handles toggle of completed orders section
   */
  const handleToggleCompletedOrders = () => {
    setCompletedOrdersExpanded(!completedOrdersExpanded);
  };

  /**
   * Handles order navigation - opens order details
   * @param order Selected order
   */
  const handleOrderClick = (order: Order) => {
    navigate(`/orders/${order.id}`);
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
   * Determines if an order is completed based on its current stage
   * @param order Order to check
   * @returns True if order has reached the final stage (Delivery)
   */
  const isOrderCompleted = (order: Order): boolean => {
    return order.currentStage?.toLowerCase() === 'delivery';
  };

  /**
   * Gets active orders from filtered orders
   * @returns Active orders array
   */
  const getActiveOrders = (): Order[] => {
    return getFilteredOrders().filter(order => !isOrderCompleted(order));
  };

  /**
   * Gets completed orders from filtered orders
   * @returns Completed orders array
   */
  const getCompletedOrders = (): Order[] => {
    return getFilteredOrders().filter(order => isOrderCompleted(order));
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
    const activeOrders = filteredOrders.filter(order => !isOrderCompleted(order)).length;
    const overdueOrders = filteredOrders.filter(order =>
      new Date(order.currentShipDate) < new Date() && !isOrderCompleted(order)
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


  const activeOrders = getActiveOrders();
  const completedOrders = getCompletedOrders();
  const summary = getOrdersSummary();

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
          Orders
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View active orders and access completed order history.
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

      {/* Search */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search orders by number, description, customer, or stage..."
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
          {activeOrders.length === 0 && completedOrders.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                No Orders Found
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {searchQuery
                  ? `No orders match "${searchQuery}". Try adjusting your search criteria.`
                  : "Your organization doesn't have any orders yet."
                }
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
                      <Grid item xs={12} sm={6} lg={4} key={order.id}>
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
                        <Grid item xs={12} sm={6} lg={4} key={order.id}>
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

              {/* Show message when only completed orders exist and search is active */}
              {activeOrders.length === 0 && completedOrders.length > 0 && searchQuery && (
                <Paper sx={{ p: 4, textAlign: 'center', mb: 3 }}>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                    No Active Orders Found
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Your search found {completedOrders.length} completed order{completedOrders.length !== 1 ? 's' : ''}.
                    {!completedOrdersExpanded && ' Click "Show Completed Orders" below to view them.'}
                  </Typography>
                </Paper>
              )}
            </>
          )}
        </>
      )}

    </Container>
  );
};

export default OrdersList;