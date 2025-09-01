import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Checkbox,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Stack,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  MoreVert,
  Edit,
  Visibility,
  Warning,
  Business,
  Assignment,
  AccessTime,
} from '@mui/icons-material';
import { useAdminStore } from '../../stores/adminStore';
import { OrderStatusUpdate } from './OrderStatusUpdate';
import type { AdminOrder } from '../../services/adminService';

/**
 * Props for AdminOrdersList component
 */
interface AdminOrdersListProps {
  /** Search query to filter orders */
  searchQuery?: string;
}

/**
 * Admin Orders List component with advanced filtering, selection, and bulk operations.
 * Features responsive design with mobile optimization and comprehensive order management.
 * 
 * @component
 * @param {AdminOrdersListProps} props - Component props
 * @returns {JSX.Element} Admin orders list component
 * 
 * @since 2.4.0
 */
export const AdminOrdersList: React.FC<AdminOrdersListProps> = ({ searchQuery = '' }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  // Admin store state
  const {
    orders,
    filters,
    totalCount,
    selectedOrderIds,
    updateFilters,
    toggleOrderSelection,
    selectAllOrders,
    clearOrderSelection,
    isOrderSelected,
  } = useAdminStore();

  // Local state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false);

  /**
   * Handle page change
   */
  const handleChangePage = async (_event: unknown, newPage: number) => {
    await updateFilters({ page: newPage + 1 });
  };

  /**
   * Handle rows per page change
   */
  const handleChangeRowsPerPage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const pageSize = parseInt(event.target.value, 10);
    await updateFilters({ pageSize, page: 1 });
  };

  /**
   * Handle select all checkbox
   */
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      selectAllOrders();
    } else {
      clearOrderSelection();
    }
  };

  /**
   * Handle individual row selection
   */
  const handleRowSelect = (orderId: string) => {
    toggleOrderSelection(orderId);
  };

  /**
   * Handle menu open
   */
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, order: AdminOrder) => {
    setAnchorEl(event.currentTarget);
    setSelectedOrder(order);
  };

  /**
   * Handle menu close
   */
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedOrder(null);
  };

  /**
   * Handle update status action
   */
  const handleUpdateStatus = () => {
    if (selectedOrder) {
      setStatusUpdateOpen(true);
      setAnchorEl(null); // Close menu but keep selectedOrder for modal
    }
  };

  /**
   * Handle view order details - Navigate to order detail page
   */
  const handleViewOrder = () => {
    if (selectedOrder) {
      navigate(`/orders/${selectedOrder.id}`);
      setAnchorEl(null); // Close menu but keep selectedOrder for other operations
    }
  };

  /**
   * Get status chip color based on order status
   */
  const getStatusColor = (isActive: boolean): 'success' | 'default' => {
    return isActive ? 'success' : 'default';
  };

  /**
   * Get payment status chip color
   */
  const getPaymentColor = (status: string): 'success' | 'warning' | 'info' | 'error' | 'default' => {
    switch (status.toLowerCase()) {
      case 'paid': return 'success';
      case 'partial': return 'warning';
      case 'pending': return 'info';
      case 'refunded': return 'error';
      default: return 'default';
    }
  };

  /**
   * Check if order is overdue
   */
  const isOverdue = (order: AdminOrder): boolean => {
    return new Date(order.currentShipDate) < new Date() && order.isActive;
  };

  /**
   * Filter orders based on search query
   * @returns Filtered orders array
   */
  const getFilteredOrders = (): AdminOrder[] => {
    if (!searchQuery.trim()) return orders;
    
    const query = searchQuery.toLowerCase();
    return orders.filter(order =>
      order.orderNumber?.toLowerCase().includes(query) ||
      order.description?.toLowerCase().includes(query) ||
      order.organizationName?.toLowerCase().includes(query) ||
      order.currentStage?.toLowerCase().includes(query)
    );
  };

  /**
   * Get stage progress percentage
   */
  const getStageProgress = (stage: string): number => {
    const stages = [
      'Design Proposal',
      'Proof Approval', 
      'Measurements',
      'Production Planning',
      'Cutting',
      'Sewing',
      'Quality Control',
      'Finishing',
      'Final Inspection',
      'Packaging',
      'Shipping Preparation',
      'Ship Order',
      'Delivery',
    ];
    
    const currentIndex = stages.findIndex(s => s.toLowerCase() === stage.toLowerCase());
    return currentIndex >= 0 ? Math.round(((currentIndex + 1) / stages.length) * 100) : 0;
  };

  /**
   * Format currency amount
   */
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  /**
   * Format date for display
   */
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const isAllSelected = orders.length > 0 && selectedOrderIds.length === orders.length;
  const isIndeterminate = selectedOrderIds.length > 0 && selectedOrderIds.length < orders.length;

  // Mobile view - simplified cards layout
  if (isMobile) {
    return (
      <Box>
        {orders.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Assignment sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              No Orders Found
            </Typography>
            <Typography variant="body1" color="text.secondary">
              No orders match the current filters. Try adjusting your search criteria.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {getFilteredOrders().map((order) => (
              <Paper key={order.id} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
                  <Checkbox
                    checked={isOrderSelected(order.id)}
                    onChange={() => handleRowSelect(order.id)}
                    size="small"
                  />
                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {order.orderNumber}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, order)}
                        aria-label="order actions"
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {order.description}
                    </Typography>
                    
                    <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}>
                      <Chip 
                        label={order.isActive ? 'Active' : 'Inactive'} 
                        color={getStatusColor(order.isActive)}
                        size="small"
                      />
                      <Chip 
                        label={order.paymentStatus} 
                        color={getPaymentColor(order.paymentStatus)}
                        size="small"
                      />
                      {isOverdue(order) && (
                        <Chip 
                          label="Overdue" 
                          color="error"
                          size="small"
                          icon={<Warning />}
                        />
                      )}
                    </Stack>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Organization
                        </Typography>
                        <Typography variant="body2">
                          {order.organizationName}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Total
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(order.totalAmount)}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Stage: {order.currentStage} • Ship: {formatDate(order.currentShipDate)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
        
        {/* Pagination for mobile */}
        <TablePagination
          component="div"
          count={searchQuery ? getFilteredOrders().length : totalCount}
          page={filters.page ? filters.page - 1 : 0}
          onPageChange={handleChangePage}
          rowsPerPage={filters.pageSize || 50}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[25, 50, 100]}
        />
      </Box>
    );
  }

  // Desktop view - full table layout
  return (
    <Box>
      {orders.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Assignment sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            No Orders Found
          </Typography>
          <Typography variant="body1" color="text.secondary">
            No orders match the current filters. Try adjusting your search criteria.
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={isIndeterminate}
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      inputProps={{ 'aria-label': 'select all orders' }}
                    />
                  </TableCell>
                  <TableCell>Order</TableCell>
                  <TableCell>Organization</TableCell>
                  <TableCell>Stage</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell>Ship Date</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getFilteredOrders().map((order) => (
                  <TableRow
                    key={order.id}
                    hover
                    selected={isOrderSelected(order.id)}
                    sx={{ 
                      '&.Mui-selected': {
                        backgroundColor: 'action.selected',
                      }
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isOrderSelected(order.id)}
                        onChange={() => handleRowSelect(order.id)}
                        inputProps={{ 'aria-labelledby': `order-${order.id}` }}
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {order.orderNumber}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            maxWidth: 200,
                          }}
                        >
                          {order.description}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                          <Business sx={{ fontSize: 14 }} />
                        </Avatar>
                        <Typography variant="body2">
                          {order.organizationName}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {order.currentStage}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getStageProgress(order.currentStage)}% complete
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Chip 
                          label={order.isActive ? 'Active' : 'Inactive'} 
                          color={getStatusColor(order.isActive)}
                          size="small"
                        />
                        {isOverdue(order) && (
                          <Tooltip title="Order is overdue">
                            <Chip 
                              icon={<Warning />}
                              label="Overdue" 
                              color="error"
                              size="small"
                            />
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                    
                    <TableCell>
                      <Chip 
                        label={order.paymentStatus} 
                        color={getPaymentColor(order.paymentStatus)}
                        size="small"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography 
                          variant="body2"
                          color={isOverdue(order) ? 'error.main' : 'text.primary'}
                        >
                          {formatDate(order.currentShipDate)}
                        </Typography>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(order.totalAmount)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="center">
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, order)}
                        aria-label="order actions"
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            component="div"
            count={searchQuery ? getFilteredOrders().length : totalCount}
            page={filters.page ? filters.page - 1 : 0}
            onPageChange={handleChangePage}
            rowsPerPage={filters.pageSize || 50}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[25, 50, 100]}
          />
        </Paper>
      )}

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 1,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleViewOrder}>
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleUpdateStatus}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Update Status</ListItemText>
        </MenuItem>
      </Menu>

      {/* Order Status Update Dialog */}
      {selectedOrder && (
        <OrderStatusUpdate
          open={statusUpdateOpen}
          onClose={() => {
            setStatusUpdateOpen(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
        />
      )}
    </Box>
  );
};

export default AdminOrdersList;