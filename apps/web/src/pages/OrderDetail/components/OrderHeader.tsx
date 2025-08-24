import React from 'react';
import { Card, CardContent, Typography, Box, Chip, Grid } from '@mui/material';
import type { OrderDetail } from '../../../types/shared';

interface OrderHeaderProps {
  /** Order detail information */
  order: OrderDetail;
}

/**
 * Order header component displaying key order information.
 * Shows order number, description, current stage, dates, and status with visual indicators.
 * 
 * @component
 * @param {OrderHeaderProps} props - Component props
 * @returns {JSX.Element} Order header with key information
 * 
 * @example
 * ```tsx
 * <OrderHeader order={orderDetail} />
 * ```
 * 
 * @since 2.1.0
 */
const OrderHeader: React.FC<OrderHeaderProps> = ({ order }) => {
  /**
   * Gets the color for order status badge
   */
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'completed':
        return 'info';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  /**
   * Gets the color for current stage indicator
   */
  const getStageColor = (stage: string) => {
    const completedStages = ['DesignProposal', 'ProofApproval'];
    const currentStages = ['Measurements', 'ProductionPlanning', 'Cutting', 'Sewing'];
    const finalStages = ['QualityControl', 'Finishing', 'FinalInspection', 'Packaging', 'ShippingPreparation', 'ShipOrder', 'Delivery'];
    
    if (completedStages.includes(stage)) {
      return 'success';
    } else if (currentStages.includes(stage)) {
      return 'warning';
    } else if (finalStages.includes(stage)) {
      return 'info';
    }
    return 'default';
  };

  /**
   * Formats stage name for display
   */
  const formatStageName = (stage: string) => {
    return stage.replace(/([A-Z])/g, ' $1').trim();
  };

  /**
   * Formats date for display
   */
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  /**
   * Checks if ship date has been revised
   */
  const isShipDateRevised = () => {
    return order.originalShipDate.getTime() !== order.currentShipDate.getTime();
  };

  return (
    <Card elevation={2}>
      <CardContent sx={{ p: 3 }}>
        {/* Header Row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {order.orderNumber}
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {order.description}
            </Typography>
          </Box>
          <Chip
            label={order.status}
            color={getStatusColor(order.status) as any}
            variant="filled"
            size="medium"
          />
        </Box>

        {/* Details Grid */}
        <Grid container spacing={3}>
          {/* Current Stage */}
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Current Stage
              </Typography>
              <Chip
                label={formatStageName(order.currentStage)}
                color={getStageColor(order.currentStage) as any}
                variant="outlined"
                size="medium"
              />
            </Box>
          </Grid>

          {/* Original Ship Date */}
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Original Ship Date
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {formatDate(order.originalShipDate)}
              </Typography>
            </Box>
          </Grid>

          {/* Current Ship Date */}
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Current Ship Date
                {isShipDateRevised() && (
                  <Chip
                    label="Revised"
                    color="warning"
                    size="small"
                    variant="outlined"
                    sx={{ ml: 1, height: 20 }}
                  />
                )}
              </Typography>
              <Typography 
                variant="body1" 
                fontWeight={500}
                color={isShipDateRevised() ? 'warning.main' : 'text.primary'}
              >
                {formatDate(order.currentShipDate)}
              </Typography>
            </Box>
          </Grid>

          {/* Total Amount */}
          <Grid item xs={12} sm={6} md={3}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Amount
              </Typography>
              <Typography variant="h6" color="primary.main" fontWeight={600}>
                ${order.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default OrderHeader;