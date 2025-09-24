import React, { useState } from 'react';
import {
  Box,
  Typography,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  DialogContentText
} from '@mui/material';
import { CheckCircle, RadioButtonChecked, RadioButtonUnchecked } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import type { OrderStage, StageHistory } from '@colorgarb/shared';

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
  /** Optional callback when a stage checkbox is toggled (for admin users) */
  onStageToggle?: (stage: OrderStage, completed: boolean) => void;
  /** Whether the timeline is in admin mode (shows checkboxes) */
  adminMode?: boolean;
}

/**
 * Displays the 13-stage manufacturing timeline for a costume order.
 * Shows current progress, completed stages, and upcoming milestones.
 * In admin mode, provides interactive checkboxes for Todoist-style stage management.
 *
 * @component
 * @param {OrderTimelineProps} props - Component props
 * @returns {JSX.Element} Timeline visualization component
 *
 * @example
 * ```tsx
 * // Regular timeline view
 * <OrderTimeline
 *   orderId="12345"
 *   currentStage="Measurements"
 *   stageHistory={historyData}
 *   onStageClick={handleStageClick}
 * />
 *
 * // Admin mode with checkboxes
 * <OrderTimeline
 *   orderId="12345"
 *   currentStage="Measurements"
 *   stageHistory={historyData}
 *   adminMode={true}
 *   onStageToggle={handleStageToggle}
 * />
 * ```
 *
 * @since 1.0.0
 */
export const OrderTimeline: React.FC<OrderTimelineProps> = ({
  orderId,
  currentStage,
  stageHistory,
  onStageClick,
  onStageToggle,
  adminMode = false
}) => {
  // orderId preserved for API compatibility but currently unused
  void orderId;
  const theme = useTheme();

  // State for confirmation dialog when unchecking completed stages
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    stage: OrderStage | null;
    stageName: string;
  }>({
    open: false,
    stage: null,
    stageName: ''
  });

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
   * Gets the appropriate checkbox component for a stage based on its status.
   * In admin mode, shows interactive checkboxes. Otherwise shows status icons.
   *
   * @param {OrderStage} stage - The stage
   * @param {'completed' | 'current' | 'pending'} status - Stage status
   * @param {number} index - Stage index
   * @returns {React.ReactElement} Checkbox or icon component
   */
  const getStageElement = (stage: OrderStage, status: 'completed' | 'current' | 'pending', index: number) => {
    if (adminMode && onStageToggle) {
      const isChecked = status === 'completed';
      const isCurrentOrFuture = index >= currentStageIndex;
      const hasHistoryEntry = stageHistory.some(h => h.stage === stage);
      const canToggle = isCurrentOrFuture || (isChecked && hasHistoryEntry); // Can toggle current/future stages or uncheck stages that actually have history

      return (
        <Checkbox
          checked={isChecked}
          onChange={(e) => handleCheckboxChange(stage, e.target.checked)}
          disabled={!canToggle}
          data-testid={`checkbox-${stage}`}
          aria-label={`${stageDisplayNames[stage]} - ${isChecked ? 'completed' : 'pending'}`}
          sx={{
            minWidth: '44px',
            minHeight: '44px',
            padding: '10px',
            color: isChecked ? theme.palette.success.main :
                   status === 'current' ? theme.palette.primary.main :
                   theme.palette.grey[400],
            '&.Mui-checked': {
              color: theme.palette.success.main,
            },
            '&:hover': canToggle ? {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            } : {},
          }}
        />
      );
    }

    // Fallback to original icons for non-admin mode
    switch (status) {
      case 'completed':
        return <CheckCircle sx={{ color: theme.palette.success.main, minWidth: '44px', minHeight: '44px', padding: '10px' }} />;
      case 'current':
        return <RadioButtonChecked sx={{ color: theme.palette.primary.main, minWidth: '44px', minHeight: '44px', padding: '10px' }} />;
      case 'pending':
        return <RadioButtonUnchecked sx={{ color: theme.palette.grey[400], minWidth: '44px', minHeight: '44px', padding: '10px' }} />;
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

  /**
   * Handles checkbox change events for stage toggles.
   *
   * @param {OrderStage} stage - The stage being toggled
   * @param {boolean} checked - Whether the checkbox is being checked
   */
  const handleCheckboxChange = (stage: OrderStage, checked: boolean) => {
    if (!onStageToggle) return;

    if (!checked && getStageStatus(stage, stages.indexOf(stage)) === 'completed') {
      // Show confirmation dialog for unchecking completed stages
      setConfirmDialog({
        open: true,
        stage,
        stageName: stageDisplayNames[stage]
      });
    } else {
      // Direct toggle for checking stages
      onStageToggle(stage, checked);
    }
  };

  /**
   * Handles confirmation dialog actions.
   */
  const handleConfirmDialogClose = () => {
    setConfirmDialog({ open: false, stage: null, stageName: '' });
  };

  const handleConfirmUncheck = () => {
    if (confirmDialog.stage && onStageToggle) {
      onStageToggle(confirmDialog.stage, false);
    }
    handleConfirmDialogClose();
  };

  /**
   * Handles keyboard navigation and interaction.
   *
   * @param {React.KeyboardEvent} event - Keyboard event
   * @param {OrderStage} stage - The stage being interacted with
   * @param {'completed' | 'current' | 'pending'} status - Stage status
   * @param {number} index - Stage index
   */
  const handleKeyDown = (
    event: React.KeyboardEvent,
    stage: OrderStage,
    status: 'completed' | 'current' | 'pending',
    index: number
  ) => {
    // Handle space/enter for checkbox toggle in admin mode
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();

      if (adminMode && onStageToggle) {
        const isChecked = status === 'completed';
        const isCurrentOrFuture = index >= currentStageIndex;
        const canToggle = isCurrentOrFuture || isChecked;

        if (canToggle) {
          handleCheckboxChange(stage, !isChecked);
        }
      } else if (onStageClick) {
        handleStageClick(stage);
      }
      return;
    }

    // Handle arrow key navigation
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();

      const currentIndex = stages.indexOf(stage);
      let nextIndex: number;

      if (event.key === 'ArrowDown') {
        nextIndex = currentIndex < stages.length - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : stages.length - 1;
      }

      const nextStage = stages[nextIndex];
      const nextElement = document.querySelector(`[data-testid="stage-${nextStage}"]`) as HTMLElement;
      nextElement?.focus();
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
            tabIndex={onStageClick || (adminMode && onStageToggle) ? 0 : -1}
            role={adminMode && onStageToggle ? 'checkbox' : 'button'}
            aria-checked={adminMode && onStageToggle ? (status === 'completed') : undefined}
            onKeyDown={(e) => handleKeyDown(e, stage, status, index)}
            className={status} // For testing
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing(2),
              minHeight: '44px', // Touch-friendly target
              padding: theme.spacing(1),
              borderRadius: theme.spacing(1),
              cursor: onStageClick || (adminMode && onStageToggle) ? 'pointer' : 'default',
              backgroundColor:
                status === 'completed' ? `${theme.palette.success.light}1A` : // 10% opacity
                status === 'current' ? `${theme.palette.primary.light}26` : // 15% opacity
                theme.palette.grey[50],
              border: status === 'current' ? `2px solid ${theme.palette.primary.main}` : 'none',
              '&:hover': onStageClick || (adminMode && onStageToggle) ? {
                backgroundColor:
                  status === 'completed' ? `${theme.palette.success.light}33` :
                  status === 'current' ? `${theme.palette.primary.light}4D` :
                  theme.palette.grey[100]
              } : {},
              '&:focus-visible': {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: '2px',
              },
            }}
          >
            {getStageElement(stage, status, index)}
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

      {/* Confirmation dialog for unchecking completed stages */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleConfirmDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Uncheck Completed Stage</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to uncheck "{confirmDialog.stageName}"?
            This will mark the stage as incomplete and may affect the order timeline.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleConfirmDialogClose} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmUncheck}
            color="primary"
            variant="contained"
            data-testid="confirm-uncheck-button"
          >
            Uncheck Stage
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderTimeline;