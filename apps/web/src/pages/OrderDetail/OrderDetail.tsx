import React from 'react';
import { Box, Typography, Paper, Container } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { OrderTimeline } from '../../components/timeline/OrderTimeline';
import { ShipDateDisplay, type ShipDateChangeHistory } from '../../components/timeline/ShipDateDisplay';
import type { OrderStage, StageHistory, Order } from '@colorgarb/shared';

/**
 * Order detail workspace page that displays comprehensive order information
 * including the 13-stage progress timeline.
 * 
 * @component
 * @returns {JSX.Element} Order detail workspace with timeline
 * 
 * @example
 * ```tsx
 * <OrderDetail />
 * ```
 * 
 * @since 1.0.0
 */
export const OrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { selectedOrder } = useAppStore(state => state.orders);

  // Mock data for demonstration - in real implementation, this would come from the store
  const mockOrder: Order = {
    id: orderId || 'mock-order-id',
    orderNumber: 'CG-2023-001',
    organizationId: 'org-123',
    description: 'Marching Band Uniforms - Fall 2023',
    currentStage: 'Measurements',
    originalShipDate: new Date('2023-09-15'),
    currentShipDate: new Date('2023-09-20'),
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-15')
  };

  const mockStageHistory: StageHistory[] = [
    {
      id: '1',
      stage: 'DesignProposal',
      enteredAt: new Date('2023-01-01'),
      updatedBy: 'ColorGarb Design Team',
      notes: 'Initial design concepts created based on school colors and requirements'
    },
    {
      id: '2',
      stage: 'ProofApproval',
      enteredAt: new Date('2023-01-05'),
      updatedBy: 'Band Director Johnson',
      notes: 'Design approved with minor color adjustments requested'
    }
  ];

  // Mock ship date change history for demonstration
  const mockShipDateHistory: ShipDateChangeHistory[] = [
    {
      id: 'ship-1',
      stage: 'ProductionPlanning',
      enteredAt: new Date('2023-01-10'),
      updatedBy: 'Production Manager Smith',
      notes: 'Initial ship date revision due to material procurement delays',
      previousShipDate: new Date('2023-09-15'),
      newShipDate: new Date('2023-09-20'),
      changeReason: 'material-delay'
    }
  ];

  /**
   * Handles click events on timeline stages.
   * 
   * @param {OrderStage} stage - The clicked stage
   */
  const handleStageClick = (stage: OrderStage) => {
    console.log(`Stage clicked: ${stage}`);
    // Future implementation: Show stage-specific details modal or sidebar
  };

  // Use selected order from store if available, otherwise use mock data
  const order = selectedOrder || mockOrder;

  if (!orderId) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" color="error">
          Order ID is required
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Order Header Section */}
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
                Order {order.orderNumber}
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                {order.description}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Current Stage
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {order.currentStage.replace(/([A-Z])/g, ' $1').trim()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Original Ship Date
              </Typography>
              <Typography variant="body1">
                {order.originalShipDate.toLocaleDateString()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Current Ship Date
              </Typography>
              <Typography variant="body1">
                {order.currentShipDate.toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Ship Date Information Section */}
        <ShipDateDisplay
          orderId={order.id}
          originalShipDate={order.originalShipDate}
          currentShipDate={order.currentShipDate}
          changeHistory={mockShipDateHistory}
          onHistoryExpand={() => console.log('Ship date history expanded')}
        />

        {/* Order Timeline Section */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
            Manufacturing Progress
          </Typography>
          <OrderTimeline
            orderId={order.id}
            currentStage={order.currentStage}
            stageHistory={mockStageHistory}
            onStageClick={handleStageClick}
          />
        </Paper>

        {/* Additional sections would go here in future stories */}
        {/* Order Summary, Contact Info, Quick Actions, etc. */}
      </Box>
    </Container>
  );
};

export default OrderDetail;