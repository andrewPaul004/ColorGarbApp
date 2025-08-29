import React from 'react';
import { Box, Typography, Paper, Button, Grid, Chip, Badge } from '@mui/material';
import { 
  Upload as UploadIcon, 
  Message as MessageIcon, 
  Assignment as MeasurementIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import type { OrderStage } from '@colorgarb/shared';

/**
 * Quick action buttons component displaying stage-appropriate actions.
 * Shows relevant action buttons based on the current order stage.
 * 
 * @component
 * @param {QuickActionsProps} props - Component props
 * @returns {JSX.Element} Quick actions component with stage-specific buttons
 * 
 * @example
 * ```tsx
 * <QuickActions
 *   orderId="12345"
 *   currentStage="Measurements"
 *   onSubmitMeasurements={() => console.log('Submit measurements')}
 *   onViewMessages={() => console.log('View messages')}
 *   onUploadDocuments={() => console.log('Upload documents')}
 * />
 * ```
 * 
 * @since 1.0.0
 */
export interface QuickActionsProps {
  /** Order ID for action context */
  orderId: string;
  /** Current stage of the order */
  currentStage: OrderStage;
  /** Number of unread messages */
  unreadMessageCount?: number;
  /** Handler for submitting measurements */
  onSubmitMeasurements?: () => void;
  /** Handler for viewing messages */
  onViewMessages?: () => void;
  /** Handler for uploading documents */
  onUploadDocuments?: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  orderId,
  currentStage,
  unreadMessageCount = 0,
  onSubmitMeasurements,
  onViewMessages,
  onUploadDocuments
}) => {
  /**
   * Gets stage-appropriate primary action button.
   * 
   * @returns {React.ReactElement | null} Primary action button or null
   */
  const getPrimaryAction = (): React.ReactElement | null => {
    switch (currentStage) {
      case 'Measurements':
        return (
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<MeasurementIcon />}
            onClick={onSubmitMeasurements}
            sx={{ minWidth: 200 }}
          >
            Submit Measurements
          </Button>
        );
      
      case 'DesignProposal':
        return (
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<InfoIcon />}
            disabled
            sx={{ minWidth: 200 }}
          >
            Review Design
          </Button>
        );

      case 'ProofApproval':
        return (
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<InfoIcon />}
            disabled
            sx={{ minWidth: 200 }}
          >
            Approve Proof
          </Button>
        );

      default:
        return null;
    }
  };

  /**
   * Gets the current stage display name.
   * 
   * @returns {string} Formatted stage name
   */
  const getStageDisplayName = (): string => {
    return currentStage.replace(/([A-Z])/g, ' $1').trim();
  };

  /**
   * Gets stage-specific instructions or status message.
   * 
   * @returns {string} Stage instructions
   */
  const getStageInstructions = (): string => {
    switch (currentStage) {
      case 'Measurements':
        return 'Ready to submit performer measurements for this order. Please ensure all measurements are accurate before submitting.';
      
      case 'DesignProposal':
        return 'ColorGarb design team is working on initial design concepts. You will be notified when ready for review.';
      
      case 'ProofApproval':
        return 'Design proof is ready for your review and approval. Check messages for proof documents.';
      
      case 'ProductionPlanning':
        return 'Order is in production planning. Manufacturing timeline is being finalized.';
      
      case 'Cutting':
      case 'Sewing':
      case 'QualityControl':
      case 'Finishing':
      case 'FinalInspection':
      case 'Packaging':
        return 'Order is currently in manufacturing. You will receive updates as it progresses through production stages.';
      
      case 'ShippingPreparation':
        return 'Order is being prepared for shipping. You will receive tracking information once shipped.';
      
      case 'ShipOrder':
        return 'Order has been shipped! Check messages for tracking details.';
      
      case 'Delivery':
        return 'Order has been delivered. Thank you for choosing ColorGarb!';
      
      default:
        return 'Order is progressing through the manufacturing process.';
    }
  };

  /**
   * Gets the status color for the current stage.
   * 
   * @returns {string} MUI color name
   */
  const getStageStatusColor = (): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info' => {
    switch (currentStage) {
      case 'Measurements':
      case 'DesignProposal':
      case 'ProofApproval':
        return 'warning';
      case 'ProductionPlanning':
      case 'Cutting':
      case 'Sewing':
      case 'QualityControl':
      case 'Finishing':
      case 'FinalInspection':
      case 'Packaging':
        return 'info';
      case 'ShippingPreparation':
      case 'ShipOrder':
        return 'primary';
      case 'Delivery':
        return 'success';
      default:
        return 'default';
    }
  };

  const primaryAction = getPrimaryAction();

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
        Quick Actions
      </Typography>
      
      {/* Current Stage Status */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h6">
            Current Stage:
          </Typography>
          <Chip 
            label={getStageDisplayName()} 
            color={getStageStatusColor()}
            size="medium"
          />
        </Box>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {getStageInstructions()}
        </Typography>
      </Box>

      {/* Action Buttons */}
      <Grid container spacing={2} alignItems="center">
        {/* Primary Stage Action */}
        {primaryAction && (
          <Grid item xs={12} sm="auto">
            {primaryAction}
          </Grid>
        )}

        {/* Always Available Actions */}
        <Grid item xs={12} sm="auto">
          <Badge 
            badgeContent={unreadMessageCount} 
            color="error"
            invisible={unreadMessageCount === 0}
            max={99}
          >
            <Button
              variant="outlined"
              size="large"
              startIcon={<MessageIcon />}
              onClick={onViewMessages}
              sx={{ minWidth: 160 }}
              color={unreadMessageCount > 0 ? "error" : "inherit"}
            >
              View Messages
            </Button>
          </Badge>
        </Grid>

        <Grid item xs={12} sm="auto">
          <Button
            variant="outlined"
            size="large"
            startIcon={<UploadIcon />}
            onClick={onUploadDocuments}
            sx={{ minWidth: 180 }}
          >
            Upload Documents
          </Button>
        </Grid>
      </Grid>

      {/* Help Text */}
      <Box sx={{ mt: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Need help?</strong> Contact ColorGarb support if you have questions about your order or need assistance with any of these actions.
        </Typography>
      </Box>
    </Paper>
  );
};

export default QuickActions;