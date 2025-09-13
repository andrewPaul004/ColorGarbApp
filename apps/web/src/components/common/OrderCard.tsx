import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
} from '@mui/material';
import type { Order } from '../../types/shared';

/**
 * Props for the OrderCard component
 * @interface OrderCardProps
 */
interface OrderCardProps {
  /** Order data to display */
  order: Order;
  /** Optional click handler for card interaction */
  onClick?: (order: Order) => void;
}

/**
 * Individual order card component for dashboard display.
 * Shows basic order information with stage progress and payment status.
 * Optimized for mobile-responsive grid layout.
 * 
 * @component
 * @param {OrderCardProps} props - Component props
 * @returns {JSX.Element} Order card component
 * 
 * @example
 * ```tsx
 * <OrderCard
 *   order={orderData}
 *   onClick={(order) => navigate(`/orders/${order.id}`)}
 * />
 * ```
 * 
 * @since 1.0.0
 */
export const OrderCard: React.FC<OrderCardProps> = ({ order, onClick }) => {
  /**
   * Gets the progress percentage based on current stage
   * @param stage Current manufacturing stage
   * @returns Progress percentage (0-100)
   */
  const getStageProgress = (stage: string): number => {
    const stages = [
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
    
    const currentIndex = stages.findIndex(s => s.toLowerCase() === stage.toLowerCase());
    return currentIndex >= 0 ? Math.round(((currentIndex + 1) / stages.length) * 100) : 0;
  };

  /**
   * Gets chip color based on payment status
   * @param status Payment status string
   * @returns Material-UI chip color
   */
  const getPaymentStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'success';
      case 'partial':
        return 'warning';
      case 'pending':
        return 'info';
      case 'refunded':
        return 'error';
      default:
        return 'default';
    }
  };

  /**
   * Formats currency amount for display
   * @param amount Numeric amount or null
   * @returns Formatted currency string or "TBD"
   */
  const formatCurrency = (amount: number | null): string => {
    if (amount === null || amount === undefined) {
      return 'TBD';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  /**
   * Formats date for display
   * @param date Date object
   * @returns Formatted date string
   */
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const progress = getStageProgress(order.currentStage);

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: 3,
        } : {},
      }}
      onClick={() => onClick?.(order)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyPress={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(order);
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: 2 }}>
        {/* Header with order number and payment status */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" component="h3" sx={{ fontWeight: 600, fontSize: '1rem' }}>
            {order.orderNumber}
          </Typography>
          <Chip
            label={order.paymentStatus}
            color={getPaymentStatusColor(order.paymentStatus)}
            size="small"
            sx={{ minWidth: '80px' }}
          />
        </Box>

        {/* Order description */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '2.5rem',
          }}
        >
          {order.description}
        </Typography>

        {/* Current stage and progress */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {order.currentStage}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {progress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: 'grey.200',
            }}
          />
        </Box>

        {/* Ship date and total */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              Ship Date
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
              }}
            >
              {formatDate(order.currentShipDate)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Total
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '1rem' }}>
              {formatCurrency(order.totalAmount)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default OrderCard;