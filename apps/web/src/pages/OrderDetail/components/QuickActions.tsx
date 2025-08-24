import React from 'react';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  Button, 
  Box, 
  Typography,
  Stack
} from '@mui/material';
import { 
  Assignment as AssignmentIcon,
  Straighten as MeasurementIcon,
  Message as MessageIcon,
  Upload as UploadIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import type { OrderDetail } from '../../../types/shared';

interface QuickActionsProps {
  /** Order detail information */
  order: OrderDetail;
}

/**
 * Quick actions component with stage-appropriate action buttons.
 * Displays relevant actions based on current order stage and status.
 * 
 * @component
 * @param {QuickActionsProps} props - Component props
 * @returns {JSX.Element} Quick action buttons relevant to current stage
 * 
 * @example
 * ```tsx
 * <QuickActions order={orderDetail} />
 * ```
 * 
 * @since 2.1.0
 */
const QuickActions: React.FC<QuickActionsProps> = ({ order }) => {
  /**
   * Handles submit measurements action
   */
  const handleSubmitMeasurements = () => {
    // TODO: Navigate to measurements submission page
    console.log('Navigate to measurements submission for order:', order.id);
  };

  /**
   * Handles view messages action
   */
  const handleViewMessages = () => {
    // TODO: Navigate to order messages/communication page
    console.log('Navigate to messages for order:', order.id);
  };

  /**
   * Handles upload documents action
   */
  const handleUploadDocuments = () => {
    // TODO: Open document upload modal/page
    console.log('Open document upload for order:', order.id);
  };

  /**
   * Handles make payment action
   */
  const handleMakePayment = () => {
    // TODO: Navigate to payment processing page
    console.log('Navigate to payment for order:', order.id);
  };

  /**
   * Gets stage-appropriate actions based on current order stage
   */
  const getStageActions = () => {
    const actions = [];

    // Always available actions
    actions.push({
      key: 'messages',
      label: 'View Messages',
      icon: <MessageIcon />,
      handler: handleViewMessages,
      color: 'primary' as const
    });

    actions.push({
      key: 'documents',
      label: 'Upload Documents',
      icon: <UploadIcon />,
      handler: handleUploadDocuments,
      color: 'secondary' as const
    });

    // Stage-specific actions
    switch (order.currentStage) {
      case 'Measurements':
        actions.unshift({
          key: 'measurements',
          label: 'Submit Measurements',
          icon: <MeasurementIcon />,
          handler: handleSubmitMeasurements,
          color: 'success' as const
        });
        break;

      case 'DesignProposal':
      case 'ProofApproval':
        // Payment actions for early stages
        if (order.paymentStatus !== 'Completed') {
          actions.push({
            key: 'payment',
            label: 'Make Payment',
            icon: <PaymentIcon />,
            handler: handleMakePayment,
            color: 'warning' as const
          });
        }
        break;

      default:
        // No additional stage-specific actions
        break;
    }

    return actions;
  };

  const actions = getStageActions();

  /**
   * Gets instruction text based on current stage
   */
  const getStageInstructions = () => {
    switch (order.currentStage) {
      case 'Measurements':
        return 'Submit performer measurements to continue with production planning.';
      case 'DesignProposal':
        return 'Review the design proposal and provide feedback or approval.';
      case 'ProofApproval':
        return 'Review and approve the final design proof before production begins.';
      case 'ProductionPlanning':
        return 'Production is being planned. You will be notified when manufacturing begins.';
      case 'Cutting':
      case 'Sewing':
      case 'QualityControl':
      case 'Finishing':
      case 'FinalInspection':
        return 'Your order is currently in production. We will keep you updated on progress.';
      case 'Packaging':
      case 'ShippingPreparation':
        return 'Your order is being prepared for shipment.';
      case 'ShipOrder':
        return 'Your order has been shipped! Tracking information will be provided.';
      case 'Delivery':
        return 'Your order has been delivered. Thank you for choosing ColorGarb!';
      default:
        return 'Use the actions below to manage your order.';
    }
  };

  return (
    <Card elevation={1}>
      <CardHeader
        avatar={<AssignmentIcon color="primary" />}
        title="Quick Actions"
        titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
        sx={{ pb: 1 }}
      />
      <CardContent sx={{ pt: 0 }}>
        {/* Stage Instructions */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.50', borderRadius: 1, border: 1, borderColor: 'primary.200' }}>
          <Typography variant="body2" color="primary.dark">
            {getStageInstructions()}
          </Typography>
        </Box>

        {/* Action Buttons */}
        <Stack spacing={2}>
          {actions.map((action) => (
            <Button
              key={action.key}
              variant="contained"
              color={action.color}
              startIcon={action.icon}
              onClick={action.handler}
              fullWidth
              size="large"
              sx={{
                justifyContent: 'flex-start',
                textAlign: 'left',
                py: 1.5,
                '&:hover': {
                  transform: 'translateY(-1px)',
                  transition: 'transform 0.2s ease-in-out'
                }
              }}
            >
              {action.label}
            </Button>
          ))}
        </Stack>

        {/* Next Actions from API */}
        {order.nextActions && order.nextActions.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Recommended Next Steps
            </Typography>
            <Box sx={{ pl: 2 }}>
              {order.nextActions.map((action, index) => (
                <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                  • {action}
                </Typography>
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickActions;