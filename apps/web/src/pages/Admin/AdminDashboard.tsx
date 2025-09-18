import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Badge,
  TextField,
  InputAdornment,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Refresh,
  FilterList,
  Assignment,
  Business,
  TrendingUp,
  Schedule,
  CheckCircle,
  Search,
  Add as AddIcon,
} from '@mui/icons-material';
import { useAdminStore } from '../../stores/adminStore';
import { useAdminAccess } from '../../hooks/useAdminAccess';
// RoleBasedNavigation removed - using Layout wrapper in App.tsx instead
import { AdminOrdersList } from '../../components/admin/AdminOrdersList';
import { BulkUpdateModal } from '../../components/admin/BulkUpdateModal';
import { AdminCreateOrderDialog } from '../../components/admin/AdminCreateOrderDialog';

/**
 * Admin Dashboard page for ColorGarb staff to manage orders across all organizations.
 * Features comprehensive order filtering, bulk operations, and real-time updates.
 * Only accessible by users with ColorGarbStaff role.
 * 
 * @component
 * @returns {JSX.Element} Admin dashboard page component
 * 
 * @since 2.4.0
 */
export const AdminDashboard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Admin access control
  const { hasAccess, reason } = useAdminAccess();

  // Admin store state
  const {
    orders,
    organizations,
    filters,
    totalCount,
    selectedOrderIds,
    ordersLoading,
    ordersError,
    successMessage,
    fetchAllOrders,
    updateFilters,
    refreshOrders,
    clearMessages,
  } = useAdminStore();

  // Local state
  const [bulkUpdateModalOpen, setBulkUpdateModalOpen] = useState(false);
  const [adminCreateOrderDialogOpen, setAdminCreateOrderDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  /**
   * Load initial admin data on component mount
   */
  useEffect(() => {
    if (hasAccess) {
      fetchAllOrders();
    }
  }, [hasAccess, fetchAllOrders]);

  /**
   * Auto-dismiss success messages after 5 seconds
   */
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        clearMessages();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, clearMessages]);

  // Access control check
  if (!hasAccess) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error">
          {reason || 'You do not have permission to access the admin dashboard.'}
        </Alert>
      </Container>
    );
  }

  /**
   * Handle organization filter change
   */
  const handleOrganizationChange = async (event: SelectChangeEvent) => {
    const orgId = event.target.value === 'all' ? undefined : event.target.value;
    await updateFilters({ organizationId: orgId });
  };

  /**
   * Handle status filter change
   */
  const handleStatusChange = async (event: SelectChangeEvent) => {
    const status = event.target.value === 'all' ? undefined : event.target.value;
    await updateFilters({ status });
  };

  /**
   * Handle stage filter change
   */
  const handleStageChange = async (event: SelectChangeEvent) => {
    const stage = event.target.value === 'all' ? undefined : event.target.value;
    await updateFilters({ stage });
  };

  /**
   * Handle page size change
   */
  const handlePageSizeChange = async (event: SelectChangeEvent) => {
    const pageSize = parseInt(event.target.value);
    await updateFilters({ pageSize });
  };

  /**
   * Handle manual refresh
   */
  const handleRefresh = async () => {
    clearMessages();
    await refreshOrders();
  };

  /**
   * Open bulk update modal
   */
  const handleOpenBulkUpdate = () => {
    setBulkUpdateModalOpen(true);
  };

  /**
   * Close bulk update modal
   */
  const handleCloseBulkUpdate = () => {
    setBulkUpdateModalOpen(false);
  };

  /**
   * Open admin create order dialog
   */
  const handleOpenAdminCreateOrder = () => {
    setAdminCreateOrderDialogOpen(true);
  };

  /**
   * Close admin create order dialog
   */
  const handleCloseAdminCreateOrder = () => {
    setAdminCreateOrderDialogOpen(false);
  };

  /**
   * Handle successful admin order creation
   */
  const handleAdminOrderCreated = (newOrder: any) => {
    // Refresh orders to show the new order
    refreshOrders();
  };

  /**
   * Get available manufacturing stages for filter dropdown
   */
  const getAvailableStages = (): string[] => {
    return [
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
  };

  /**
   * Get dashboard statistics
   */
  const getDashboardStats = () => {
    const totalOrders = totalCount;
    const activeOrders = orders.filter(order => order.isActive).length;
    const overdueOrders = orders.filter(order => 
      new Date(order.currentShipDate) < new Date() && order.isActive
    ).length;
    const totalValue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const selectedCount = selectedOrderIds.length;

    return { totalOrders, activeOrders, overdueOrders, totalValue, selectedCount };
  };

  const stats = getDashboardStats();
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Page Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
              Admin Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage orders across all organizations from a centralized interface
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAdminCreateOrder}
            sx={{ 
              flexShrink: 0,
              minWidth: 'auto',
            }}
          >
            {isMobile ? 'Create Order' : 'Create New Order'}
          </Button>
        </Box>

        {/* Success/Error Messages */}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={clearMessages}>
            {successMessage}
          </Alert>
        )}

        {ordersError && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={clearMessages}>
            {ordersError}
          </Alert>
        )}

        {/* Dashboard Statistics */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={6} sm={3} md={2}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Assignment color="primary" sx={{ fontSize: 28, mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                {stats.totalOrders}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Orders
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={6} sm={3} md={2}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <CheckCircle color="success" sx={{ fontSize: 28, mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                {stats.activeOrders}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={6} sm={3} md={2}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Schedule color="error" sx={{ fontSize: 28, mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'error.main' }}>
                {stats.overdueOrders}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Overdue
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={6} sm={3} md={2}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <TrendingUp color="info" sx={{ fontSize: 28, mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {formatCurrency(stats.totalValue)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Value
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={6} sm={3} md={2}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Business color="secondary" sx={{ fontSize: 28, mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'secondary.main' }}>
                {organizations.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Organizations
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={6} sm={3} md={2}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Badge badgeContent={stats.selectedCount} color="primary">
                <FilterList color="action" sx={{ fontSize: 28, mb: 1 }} />
              </Badge>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mt: 1 }}>
                {stats.selectedCount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Selected
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Filters and Actions */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Organization</InputLabel>
                <Select
                  value={filters.organizationId || 'all'}
                  label="Organization"
                  onChange={handleOrganizationChange}
                >
                  <MenuItem value="all">All Organizations</MenuItem>
                  {organizations.map((org) => (
                    <MenuItem key={org.id} value={org.id}>
                      {org.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status || 'all'}
                  label="Status"
                  onChange={handleStatusChange}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Stage</InputLabel>
                <Select
                  value={filters.stage || 'all'}
                  label="Stage"
                  onChange={handleStageChange}
                >
                  <MenuItem value="all">All Stages</MenuItem>
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
                <InputLabel>Page Size</InputLabel>
                <Select
                  value={filters.pageSize?.toString() || '50'}
                  label="Page Size"
                  onChange={handlePageSizeChange}
                >
                  <MenuItem value="25">25 per page</MenuItem>
                  <MenuItem value="50">50 per page</MenuItem>
                  <MenuItem value="100">100 per page</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={1.5}>
              <Button
                variant="outlined"
                onClick={handleRefresh}
                disabled={ordersLoading}
                fullWidth
                size="medium"
                startIcon={<Refresh />}
              >
                Refresh
              </Button>
            </Grid>

            <Grid item xs={12} sm={6} md={1.5}>
              <Button
                variant="contained"
                onClick={handleOpenBulkUpdate}
                disabled={stats.selectedCount === 0}
                fullWidth
                size="medium"
                startIcon={
                  <Badge badgeContent={stats.selectedCount} color="secondary">
                    <Assignment />
                  </Badge>
                }
              >
                Bulk Update
              </Button>
            </Grid>
          </Grid>

          {/* Active Filters Display */}
          {(filters.organizationId || filters.status || filters.stage) && (
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ alignSelf: 'center', mr: 1 }}>
                Active filters:
              </Typography>
              {filters.organizationId && (
                <Chip
                  label={`Org: ${organizations.find(o => o.id === filters.organizationId)?.name || 'Unknown'}`}
                  size="small"
                  onDelete={() => updateFilters({ organizationId: undefined })}
                />
              )}
              {filters.status && (
                <Chip
                  label={`Status: ${filters.status}`}
                  size="small"
                  onDelete={() => updateFilters({ status: undefined })}
                />
              )}
              {filters.stage && (
                <Chip
                  label={`Stage: ${filters.stage}`}
                  size="small"
                  onDelete={() => updateFilters({ stage: undefined })}
                />
              )}
            </Box>
          )}
        </Paper>

        {/* Loading State */}
        {ordersLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Orders List */}
        {!ordersLoading && <AdminOrdersList searchQuery={searchQuery} />}
      {/* Bulk Update Modal */}
      <BulkUpdateModal
        open={bulkUpdateModalOpen}
        onClose={handleCloseBulkUpdate}
      />

      {/* Admin Create Order Dialog */}
      <AdminCreateOrderDialog
        open={adminCreateOrderDialogOpen}
        onClose={handleCloseAdminCreateOrder}
        onOrderCreated={handleAdminOrderCreated}
      />
    </Container>
  );
};

export default AdminDashboard;