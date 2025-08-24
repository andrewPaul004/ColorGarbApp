import React from 'react';
import { Card, CardHeader, CardContent, Typography, Box, Divider, Grid } from '@mui/material';
import { Receipt as ReceiptIcon } from '@mui/icons-material';
import type { OrderDetail } from '../../../types/shared';

interface OrderSummaryProps {
  /** Order detail information */
  order: OrderDetail;
}

/**
 * Order summary component showing product details and financial information.
 * Displays order specifications, quantities, pricing breakdown, and timestamps.
 * 
 * @component
 * @param {OrderSummaryProps} props - Component props
 * @returns {JSX.Element} Order summary with product details and pricing
 * 
 * @example
 * ```tsx
 * <OrderSummary order={orderDetail} />
 * ```
 * 
 * @since 2.1.0
 */
const OrderSummary: React.FC<OrderSummaryProps> = ({ order }) => {
  /**
   * Formats date and time for display
   */
  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * Calculates estimated tax (placeholder - would come from backend)
   */
  const calculateTax = (amount: number) => {
    return amount * 0.08; // 8% tax rate placeholder
  };

  /**
   * Calculates subtotal before tax
   */
  const calculateSubtotal = (totalAmount: number) => {
    const tax = calculateTax(totalAmount);
    return totalAmount - tax;
  };

  const subtotal = calculateSubtotal(order.totalAmount);
  const tax = calculateTax(order.totalAmount);

  return (
    <Card elevation={1}>
      <CardHeader
        avatar={<ReceiptIcon color="primary" />}
        title="Order Summary"
        titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
        sx={{ pb: 1 }}
      />
      <CardContent sx={{ pt: 0 }}>
        {/* Product Details */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Product Details
          </Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>
            {order.description}
          </Typography>
          
          {/* Notes if available */}
          {order.notes && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Order Notes
              </Typography>
              <Typography variant="body2">
                {order.notes}
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Pricing Breakdown */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Pricing Breakdown
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Subtotal</Typography>
            <Typography variant="body2">
              ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Tax</Typography>
            <Typography variant="body2">
              ${tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Typography>
          </Box>
          
          <Divider sx={{ my: 1 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body1" fontWeight={600}>Total Amount</Typography>
            <Typography variant="body1" fontWeight={600} color="primary.main">
              ${order.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Order Timestamps */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Order Created
              </Typography>
              <Typography variant="body2">
                {formatDateTime(order.createdAt)}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Last Updated
              </Typography>
              <Typography variant="body2">
                {formatDateTime(order.updatedAt)}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Payment Status */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Payment Status
          </Typography>
          <Typography variant="body2" fontWeight={500}>
            {order.paymentStatus}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default OrderSummary;