import React from 'react';
import { Box, Typography, Paper, Grid, Chip } from '@mui/material';
import type { Order } from '@colorgarb/shared';

/**
 * Order summary section displaying product details, pricing breakdown, and timestamps.
 * Shows quantity information, total amount, and order creation details.
 * 
 * @component
 * @param {OrderSummaryProps} props - Component props
 * @returns {JSX.Element} Order summary component with product and pricing details
 * 
 * @example
 * ```tsx
 * <OrderSummary
 *   order={orderData}
 *   totalAmount={2500.00}
 *   paymentStatus="Paid"
 * />
 * ```
 * 
 * @since 1.0.0
 */
export interface OrderSummaryProps {
  /** Order data containing product details */
  order: Order;
  /** Total order amount in USD */
  totalAmount?: number | null;
  /** Current payment status */
  paymentStatus?: string;
  /** Order notes or special instructions */
  notes?: string;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  order,
  totalAmount,
  paymentStatus,
  notes
}) => {
  /**
   * Formats currency amount to USD display format.
   * 
   * @param {number | null} amount - Amount to format
   * @returns {string} Formatted currency string or "TBD"
   */
  const formatCurrency = (amount: number | null): string => {
    if (amount === null || amount === undefined) {
      return 'TBD';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  /**
   * Gets color-coded chip for payment status.
   * 
   * @param {string} status - Payment status
   * @returns {React.ReactElement} Colored chip component
   */
  const getPaymentStatusChip = (status: string) => {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('paid') || statusLower.includes('complete')) {
      return <Chip label={status} color="success" size="small" />;
    } else if (statusLower.includes('pending') || statusLower.includes('partial')) {
      return <Chip label={status} color="warning" size="small" />;
    } else if (statusLower.includes('overdue') || statusLower.includes('failed')) {
      return <Chip label={status} color="error" size="small" />;
    } else {
      return <Chip label={status} color="default" size="small" />;
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
        Order Summary
      </Typography>
      
      <Grid container spacing={3}>
        {/* Product Details Section */}
        <Grid item xs={12} md={8}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Product Details
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {order.description}
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={6} sm={4}>
                <Typography variant="body2" color="text.secondary">
                  Order Number
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {order.orderNumber}
                </Typography>
              </Grid>
              
              <Grid item xs={6} sm={4}>
                <Typography variant="body2" color="text.secondary">
                  Current Stage
                </Typography>
                <Typography variant="body1">
                  {order.currentStage.replace(/([A-Z])/g, ' $1').trim()}
                </Typography>
              </Grid>
              
              <Grid item xs={6} sm={4}>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Typography variant="body1">
                  Active
                </Typography>
              </Grid>
            </Grid>

            {notes && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Special Instructions
                </Typography>
                <Typography variant="body1">
                  {notes}
                </Typography>
              </Box>
            )}
          </Box>
        </Grid>

        {/* Pricing Information Section */}
        <Grid item xs={12} md={4}>
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Pricing Information
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {totalAmount && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    Total Amount
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(totalAmount)}
                  </Typography>
                </Box>
              )}
              
              {paymentStatus && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Payment Status
                  </Typography>
                  {getPaymentStatusChip(paymentStatus)}
                </Box>
              )}
            </Box>
          </Box>
        </Grid>

        {/* Timestamps Section */}
        <Grid item xs={12}>
          <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Order Timeline
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  Order Created
                </Typography>
                <Typography variant="body1">
                  {order.createdAt.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {order.createdAt.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </Typography>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  Last Updated
                </Typography>
                <Typography variant="body1">
                  {order.updatedAt.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {order.updatedAt.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </Typography>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  Original Ship Date
                </Typography>
                <Typography variant="body1">
                  {order.originalShipDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Typography>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  Current Ship Date
                </Typography>
                <Typography 
                  variant="body1" 
                  color={order.currentShipDate > order.originalShipDate ? 'warning.main' : 'inherit'}
                >
                  {order.currentShipDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Typography>
                {order.currentShipDate > order.originalShipDate && (
                  <Typography variant="caption" color="warning.main">
                    Delayed
                  </Typography>
                )}
              </Grid>
            </Grid>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default OrderSummary;