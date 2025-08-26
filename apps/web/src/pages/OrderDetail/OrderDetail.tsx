import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Container, CircularProgress, Alert } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { OrderTimeline } from '../../components/timeline/OrderTimeline';
import { ShipDateDisplay, type ShipDateChangeHistory } from '../../components/timeline/ShipDateDisplay';
import { OrderSummary } from './components/OrderSummary';
import { ContactInfo } from './components/ContactInfo';
import { QuickActions } from './components/QuickActions';
import { Breadcrumb, type BreadcrumbItem } from '../../components/common/Breadcrumb';
import { StageDetailModal } from '../../components/timeline/StageDetailModal';
import type { OrderStage, StageHistory, OrderDetail } from '@colorgarb/shared';

/**
 * Order detail workspace page that displays comprehensive order information
 * including order summary, contact information, and 13-stage progress timeline.
 * 
 * @component
 * @returns {JSX.Element} Order detail workspace with complete order information
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
  const { fetchOrder } = useAppStore();
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<OrderStage | null>(null);

  /**
   * Loads order detail data from the API.
   */
  useEffect(() => {
    const loadOrderDetail = async () => {
      if (!orderId) {
        setError('Order ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const detail = await fetchOrder(orderId);
        setOrderDetail(detail);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load order details';
        setError(errorMessage);
        console.error('Error loading order detail:', err);
      } finally {
        setLoading(false);
      }
    };

    loadOrderDetail();
  }, [orderId, fetchOrder]);

  /**
   * Gets the stage history from the API data or falls back to mock data if not available.
   * Converts Date objects properly for timeline display.
   * 
   * @param {OrderDetail} order - Order detail with potential stage history
   * @returns {StageHistory[]} Array of stage history entries
   */
  const getStageHistory = (order: OrderDetail): StageHistory[] => {
    // Use real API data if available
    if (order.stageHistory && order.stageHistory.length > 0) {
      return order.stageHistory.map(history => ({
        ...history,
        enteredAt: new Date(history.enteredAt),
        previousShipDate: history.previousShipDate ? new Date(history.previousShipDate) : undefined,
        newShipDate: history.newShipDate ? new Date(history.newShipDate) : undefined
      }));
    }

    // Fallback to mock data generation if no real data (for backwards compatibility)
    const allStages: OrderStage[] = [
      'DesignProposal', 'ProofApproval', 'Measurements', 'ProductionPlanning',
      'Cutting', 'Sewing', 'QualityControl', 'Finishing',
      'FinalInspection', 'Packaging', 'ShippingPreparation', 'ShipOrder', 'Delivery'
    ];

    const currentStageIndex = allStages.indexOf(order.currentStage);
    const completedStages = allStages.slice(0, currentStageIndex);

    const stageDetails: Record<OrderStage, { updatedBy: string; notes: string; date: string }> = {
      'DesignProposal': {
        updatedBy: 'ColorGarb Design Team',
        notes: 'Initial design concepts and artwork creation',
        date: '2024-12-31'
      },
      'ProofApproval': {
        updatedBy: 'Band Director Johnson', 
        notes: 'Client review and approval of design proof',
        date: '2025-01-04'
      },
      'Measurements': {
        updatedBy: 'Measurements Team',
        notes: 'Collection and verification of performer measurements',
        date: '2025-01-10'
      },
      'ProductionPlanning': {
        updatedBy: 'Production Manager',
        notes: 'Scheduling and material procurement',
        date: '2025-01-15'
      },
      'Cutting': {
        updatedBy: 'Cutting Department',
        notes: 'Fabric cutting and pattern preparation',
        date: '2025-01-20'
      },
      'Sewing': {
        updatedBy: 'Sewing Team',
        notes: 'Garment construction and assembly',
        date: '2025-02-01'
      },
      'QualityControl': {
        updatedBy: 'QC Inspector',
        notes: 'Quality inspection and testing',
        date: '2025-02-10'
      },
      'Finishing': {
        updatedBy: 'Finishing Team',
        notes: 'Final touches and embellishments',
        date: '2025-02-15'
      },
      'FinalInspection': {
        updatedBy: 'QA Manager',
        notes: 'Complete quality verification',
        date: '2025-02-20'
      },
      'Packaging': {
        updatedBy: 'Packaging Team',
        notes: 'Protective packaging for shipment',
        date: '2025-02-25'
      },
      'ShippingPreparation': {
        updatedBy: 'Shipping Department',
        notes: 'Labeling and shipping logistics',
        date: '2025-03-01'
      },
      'ShipOrder': {
        updatedBy: 'Shipping Coordinator',
        notes: 'Order shipped to destination',
        date: '2025-03-05'
      },
      'Delivery': {
        updatedBy: 'Delivery Service',
        notes: 'Order delivered to client',
        date: '2025-03-10'
      }
    };

    return completedStages.map((stage, index) => ({
      id: `fallback-${index + 1}`,
      stage,
      enteredAt: new Date(stageDetails[stage].date),
      updatedBy: stageDetails[stage].updatedBy,
      notes: stageDetails[stage].notes
    }));
  };

  // Mock ship date change history for demonstration - would come from API in production
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
   * Opens the stage detail modal with information about the clicked stage.
   * 
   * @param {OrderStage} stage - The clicked stage
   */
  const handleStageClick = (stage: OrderStage) => {
    console.log(`Opening stage detail modal for: ${stage}`);
    setSelectedStage(stage);
    setStageModalOpen(true);
  };

  /**
   * Closes the stage detail modal.
   */
  const handleCloseStageModal = () => {
    setStageModalOpen(false);
    setSelectedStage(null);
  };

  /**
   * Gets the status of a stage (completed, current, or pending).
   * 
   * @param {OrderStage} stage - The stage to check
   * @param {OrderDetail} order - The order detail
   * @returns {'completed' | 'current' | 'pending'} The stage status
   */
  const getStageStatus = (stage: OrderStage, order: OrderDetail): 'completed' | 'current' | 'pending' => {
    const allStages: OrderStage[] = [
      'DesignProposal', 'ProofApproval', 'Measurements', 'ProductionPlanning',
      'Cutting', 'Sewing', 'QualityControl', 'Finishing',
      'FinalInspection', 'Packaging', 'ShippingPreparation', 'ShipOrder', 'Delivery'
    ];

    const currentStageIndex = allStages.indexOf(order.currentStage);
    const stageIndex = allStages.indexOf(stage);

    if (stageIndex < currentStageIndex) {
      return 'completed';
    } else if (stageIndex === currentStageIndex) {
      return 'current';
    } else {
      return 'pending';
    }
  };

  /**
   * Finds the stage history entry for a specific stage.
   * 
   * @param {OrderStage} stage - The stage to find history for
   * @param {OrderDetail} order - The order detail
   * @returns {StageHistory | undefined} The stage history entry or undefined
   */
  const findStageHistory = (stage: OrderStage, order: OrderDetail): StageHistory | undefined => {
    const stageHistory = getStageHistory(order);
    return stageHistory.find(history => history.stage === stage);
  };

  /**
   * Handles submit measurements action.
   */
  const handleSubmitMeasurements = () => {
    console.log('Submit measurements clicked for order:', orderId);
    // Future implementation: Navigate to measurements submission form or open modal
    alert('Submit Measurements functionality will be implemented in a future story.');
  };

  /**
   * Handles view messages action.
   */
  const handleViewMessages = () => {
    console.log('View messages clicked for order:', orderId);
    // Future implementation: Navigate to messages page or open messages panel
    alert('View Messages functionality will be implemented in a future story.');
  };

  /**
   * Handles upload documents action.
   */
  const handleUploadDocuments = () => {
    console.log('Upload documents clicked for order:', orderId);
    // Future implementation: Open file upload modal or navigate to documents page
    alert('Upload Documents functionality will be implemented in a future story.');
  };

  /**
   * Generates breadcrumb navigation items based on current order context.
   * 
   * @param {OrderDetail} order - Current order details
   * @returns {BreadcrumbItem[]} Array of breadcrumb items
   */
  const generateBreadcrumbItems = (order: OrderDetail): BreadcrumbItem[] => {
    return [
      {
        label: 'Dashboard',
        path: '/dashboard'
      },
      {
        label: 'Orders',
        path: '/dashboard' // Could be '/orders' if separate orders list page exists
      },
      {
        label: `Order ${order.orderNumber}`,
        current: true
      }
    ];
  };

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  // No order data
  if (!orderDetail) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          Order not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Breadcrumb Navigation */}
      <Breadcrumb items={generateBreadcrumbItems(orderDetail)} />
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Order Header Section */}
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
                Order {orderDetail.orderNumber}
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                {orderDetail.description}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Current Stage
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {orderDetail.currentStage.replace(/([A-Z])/g, ' $1').trim()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Original Ship Date
              </Typography>
              <Typography variant="body1">
                {orderDetail.originalShipDate.toLocaleDateString()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Current Ship Date
              </Typography>
              <Typography variant="body1">
                {orderDetail.currentShipDate.toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Order Summary Section */}
        <OrderSummary
          order={orderDetail}
          totalAmount={orderDetail.totalAmount}
          paymentStatus={orderDetail.paymentStatus}
          notes={orderDetail.notes}
        />

        {/* Contact and Shipping Information Section */}
        <ContactInfo
          organizationName={orderDetail.organizationName}
          organizationType={orderDetail.organization?.type}
          contactEmail={orderDetail.organization?.contactEmail}
          contactPhone={orderDetail.organization?.contactPhone}
          address={orderDetail.organization?.address}
          paymentTerms={orderDetail.organization?.paymentTerms}
        />

        {/* Quick Actions Section */}
        <QuickActions
          orderId={orderDetail.id}
          currentStage={orderDetail.currentStage}
          onSubmitMeasurements={handleSubmitMeasurements}
          onViewMessages={handleViewMessages}
          onUploadDocuments={handleUploadDocuments}
        />

        {/* Ship Date Information Section */}
        <ShipDateDisplay
          orderId={orderDetail.id}
          originalShipDate={orderDetail.originalShipDate}
          currentShipDate={orderDetail.currentShipDate}
          changeHistory={mockShipDateHistory}
          onHistoryExpand={() => console.log('Ship date history expanded')}
        />

        {/* Order Timeline Section */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
            Manufacturing Progress
          </Typography>
          <OrderTimeline
            orderId={orderDetail.id}
            currentStage={orderDetail.currentStage}
            stageHistory={getStageHistory(orderDetail)}
            onStageClick={handleStageClick}
          />
        </Paper>
      </Box>

      {/* Stage Detail Modal */}
      <StageDetailModal
        open={stageModalOpen}
        onClose={handleCloseStageModal}
        stage={selectedStage}
        stageHistory={selectedStage && orderDetail ? findStageHistory(selectedStage, orderDetail) : undefined}
        status={selectedStage && orderDetail ? getStageStatus(selectedStage, orderDetail) : 'pending'}
      />
    </Container>
  );
};

export default OrderDetail;