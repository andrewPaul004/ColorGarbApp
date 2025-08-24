import React, { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Box, Container, Alert, CircularProgress } from '@mui/material';
import { useAppStore } from '../../stores/appStore';
import OrderHeader from './components/OrderHeader';
import OrderSummary from './components/OrderSummary';
import ContactInfo from './components/ContactInfo';
import QuickActions from './components/QuickActions';
import Breadcrumbs from './components/Breadcrumbs';

/**
 * Order Detail Workspace page component.
 * Displays comprehensive order information including header, summary, contact info, and quick actions.
 * Supports mobile-responsive design with breadcrumb navigation.
 * 
 * @component
 * @returns {JSX.Element} Order detail workspace with complete order information
 * 
 * @example
 * ```tsx
 * // Route: /orders/:orderId
 * <OrderDetail />
 * ```
 * 
 * @since 2.1.0
 */
const OrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const {
    selectedOrder,
    selectedOrderLoading,
    ordersError,
    selectOrder,
    clearSelectedOrder,
    clearOrdersError
  } = useAppStore();

  // Load order detail when component mounts or orderId changes
  useEffect(() => {
    if (orderId) {
      selectOrder(orderId);
    }
    
    // Cleanup on unmount
    return () => {
      clearSelectedOrder();
      clearOrdersError();
    };
  }, [orderId, selectOrder, clearSelectedOrder, clearOrdersError]);

  // Redirect if no orderId provided
  if (!orderId) {
    return <Navigate to="/dashboard" replace />;
  }

  // Loading state
  if (selectedOrderLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  // Error state
  if (ordersError) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {ordersError}
        </Alert>
      </Container>
    );
  }

  // No order found
  if (!selectedOrder) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          Order not found or you don't have permission to view it.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs orderId={selectedOrder.id} orderNumber={selectedOrder.orderNumber} />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Order Header */}
        <OrderHeader order={selectedOrder} />

        {/* Main Content Grid */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3
        }}>
          {/* Left Column */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <OrderSummary order={selectedOrder} />
            <QuickActions order={selectedOrder} />
          </Box>

          {/* Right Column */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <ContactInfo order={selectedOrder} />
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default OrderDetail;