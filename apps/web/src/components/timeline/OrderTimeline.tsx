import React from 'react';
import { Box, Typography } from '@mui/material';
import { CheckCircle, RadioButtonChecked, RadioButtonUnchecked } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import type { OrderStage, StageHistory } from '@colorgarb/shared/types/order';

/**
 * Props for the OrderTimeline component.
 * 
 * @interface OrderTimelineProps
 * @since 1.0.0
 */
interface OrderTimelineProps {
  /** Unique identifier of the order */
  orderId: string;
  /** Current stage in the manufacturing process */
  currentStage: OrderStage;
  /** Array of completed stage history entries */
  stageHistory: StageHistory[];
  /** Optional callback when a stage is clicked */
  onStageClick?: (stage: OrderStage) => void;
}

/**
 * Displays the 13-stage manufacturing timeline for a costume order.
 * Shows current progress, completed stages, and upcoming milestones.
 * 
 * @component
 * @param {OrderTimelineProps} props - Component props
 * @returns {JSX.Element} Timeline visualization component
 * 
 * @example
 * ```tsx
 * <OrderTimeline
 *   orderId="12345"
 *   currentStage="Measurements"
 *   stageHistory={historyData}
 *   onStageClick={handleStageClick}
 * />
 * ```
 * 
 * @since 1.0.0
 */
export const OrderTimeline: React.FC<OrderTimelineProps> = ({
  orderId,
  currentStage,
  stageHistory,
  onStageClick
}) => {
  // orderId preserved for API compatibility but currently unused
  void orderId;
  const theme = useTheme();

  // Define all 13 manufacturing stages in correct order
  const stages: OrderStage[] = [
    'DesignProposal', 'ProofApproval', 'Measurements', 'ProductionPlanning',
    'Cutting', 'Sewing', 'QualityControl', 'Finishing',
    'FinalInspection', 'Packaging', 'ShippingPreparation', 'ShipOrder', 'Delivery'
  ];

  // Create stage display names mapping
  const stageDisplayNames: Record<OrderStage, string> = {
    'DesignProposal': 'Design Proposal',
    'ProofApproval': 'Proof Approval', 
    'Measurements': 'Measurements',
    'ProductionPlanning': 'Production Planning',
    'Cutting': 'Cutting',
    'Sewing': 'Sewing',
    'QualityControl': 'Quality Control',
    'Finishing': 'Finishing',
    'FinalInspection': 'Final Inspection',
    'Packaging': 'Packaging',
    'ShippingPreparation': 'Shipping Preparation',
    'ShipOrder': 'Ship Order',
    'Delivery': 'Delivery'
  };

  // Add stage descriptions and estimated durations
  const stageDescriptions: Record<OrderStage, string> = {
    'DesignProposal': 'Initial design concepts and artwork creation',
    'ProofApproval': 'Client review and approval of design proof',
    'Measurements': 'Collection and verification of performer measurements',
    'ProductionPlanning': 'Scheduling and material procurement',
    'Cutting': 'Fabric cutting and pattern preparation',
    'Sewing': 'Garment construction and assembly',
    'QualityControl': 'Quality inspection and testing',
    'Finishing': 'Final touches and embellishments',
    'FinalInspection': 'Complete quality verification',
    'Packaging': 'Protective packaging for shipment',
    'ShippingPreparation': 'Labeling and shipping logistics',
    'ShipOrder': 'Order shipped to destination',
    'Delivery': 'Order delivered to client'
  };

  const currentStageIndex = stages.indexOf(currentStage);

  /**
   * Gets the status of a stage (completed, current, or pending).
   * 
   * @param {OrderStage} stage - The stage to check
   * @param {number} index - The index of the stage in the stages array
   * @returns {'completed' | 'current' | 'pending'} Stage status
   */
  const getStageStatus = (stage: OrderStage, index: number): 'completed' | 'current' | 'pending' => {
    if (index < currentStageIndex) return 'completed';
    if (index === currentStageIndex) return 'current';
    return 'pending';
  };

  /**
   * Gets the appropriate icon for a stage based on its status.
   * 
   * @param {'completed' | 'current' | 'pending'} status - Stage status
   * @returns {React.ReactElement} MUI icon component
   */
  const getStageIcon = (status: 'completed' | 'current' | 'pending') => {
    switch (status) {
      case 'completed':
        return <CheckCircle sx={{ color: theme.palette.success.main }} />;
      case 'current':
        return <RadioButtonChecked sx={{ color: theme.palette.primary.main }} />;
      case 'pending':
        return <RadioButtonUnchecked sx={{ color: theme.palette.grey[400] }} />;
    }
  };

  /**
   * Gets the stage history entry for a specific stage.
   * 
   * @param {OrderStage} stage - The stage to find history for
   * @returns {StageHistory | undefined} Stage history entry if found
   */
  const getStageHistory = (stage: OrderStage): StageHistory | undefined => {
    return stageHistory.find(history => history.stage === stage);
  };

  /**
   * Handles click events on timeline stages.
   * 
   * @param {OrderStage} stage - The clicked stage
   */
  const handleStageClick = (stage: OrderStage) => {
    if (onStageClick) {
      onStageClick(stage);
    }
  };

  return (
    <Box data-testid="order-timeline" sx={{ display: 'flex', flexDirection: 'column', gap: theme.spacing(2) }}>
      <Typography variant="h6">Order Progress</Typography>
      {stages.map((stage, index) => {
        const status = getStageStatus(stage, index);
        const history = getStageHistory(stage);
        
        return (
          <Box
            key={stage}
            data-testid={`stage-${stage}`}
            onClick={() => handleStageClick(stage)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing(2),
              minHeight: '44px', // Touch-friendly target
              padding: theme.spacing(1),
              borderRadius: theme.spacing(1),
              cursor: onStageClick ? 'pointer' : 'default',
              backgroundColor: 
                status === 'completed' ? `${theme.palette.success.light}1A` : // 10% opacity
                status === 'current' ? `${theme.palette.primary.light}26` : // 15% opacity  
                theme.palette.grey[50],
              border: status === 'current' ? `2px solid ${theme.palette.primary.main}` : 'none',
              '&:hover': onStageClick ? {
                backgroundColor: 
                  status === 'completed' ? `${theme.palette.success.light}33` :
                  status === 'current' ? `${theme.palette.primary.light}4D` :
                  theme.palette.grey[100]
              } : {},
              className: status // For testing
            }}
          >
            {getStageIcon(status)}
            <Box sx={{ flex: 1 }}>
              <Typography 
                variant="body1" 
                sx={{ fontWeight: 'medium' }}
              >
                {stageDisplayNames[stage]}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ color: 'text.secondary' }}
              >
                {stageDescriptions[stage]}
              </Typography>
              {history && (
                <Typography 
                  variant="body2" 
                  sx={{ color: 'text.secondary', mt: 0.5 }}
                >
                  Completed: {history.enteredAt.toLocaleDateString()}
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default OrderTimeline;