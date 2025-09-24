import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  Chip,
  Divider,
  LinearProgress,
  CircularProgress,
  Avatar,
  Stack,
  Checkbox,
} from '@mui/material';
// Grid component replaced with Box for layout
import {
  Assignment,
  Business,
  Schedule,
  AttachMoney,
  TrendingUp,
  Save,
  Cancel,
} from '@mui/icons-material';
import { useAdminOperations } from '../../hooks/useAdminOperations';
import type { AdminOrder } from '../../services/adminService';
import type { OrderStage } from '@colorgarb/shared';

/**
 * Props for the OrderStatusUpdate component
 */
interface OrderStatusUpdateProps {
  /** Dialog open state */
  open: boolean;
  /** Dialog close handler */
  onClose: () => void;
  /** Order to update */
  order: AdminOrder;
}

/**
 * Order Status Update component for individual order management.
 * Allows admin users to update order stage, ship date, and add notes.
 * Features form validation, progress tracking, and success/error handling.
 * 
 * @component
 * @param {OrderStatusUpdateProps} props - Component props
 * @returns {JSX.Element} Order status update dialog
 * 
 * @since 2.4.0
 */
export const OrderStatusUpdate: React.FC<OrderStatusUpdateProps> = ({
  open,
  onClose,
  order,
}) => {
  // Admin operations hook
  const {
    updateOrder,
    isUpdating,
    error,
    success,
    clearMessages,
  } = useAdminOperations();

  // Form state
  const [stage, setStage] = useState(order.currentStage);
  const [shipDate, setShipDate] = useState<Date | null>(order.currentShipDate);
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [stageChangePending, setStageChangePending] = useState(false);
  // Track current stage locally for immediate UI updates
  const [localCurrentStage, setLocalCurrentStage] = useState(order.currentStage);

  /**
   * Reset form when order changes or dialog opens
   */
  useEffect(() => {
    if (open) {
      setStage(order.currentStage);
      setShipDate(order.currentShipDate);
      setReason('');
      setFormError(null);
      setLocalCurrentStage(order.currentStage);
      clearMessages();
    }
  }, [open, order, clearMessages]);

  /**
   * Get available manufacturing stages with OrderStage types
   */
  const getAvailableStages = (): OrderStage[] => {
    return [
      'DesignProposal', 'ProofApproval', 'Measurements', 'ProductionPlanning',
      'Cutting', 'Sewing', 'QualityControl', 'Finishing',
      'FinalInspection', 'Packaging', 'ShippingPreparation', 'ShipOrder', 'Delivery'
    ];
  };

  /**
   * Create stage display names mapping
   */
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

  /**
   * Convert display name back to OrderStage
   */
  const displayNameToStage = (displayName: string): OrderStage => {
    const entry = Object.entries(stageDisplayNames).find(([, display]) => display === displayName);
    return (entry?.[0] as OrderStage) || 'DesignProposal';
  };

  /**
   * Get the status of a stage (completed, current, or pending)
   */
  const getStageStatus = (stage: OrderStage, index: number): 'completed' | 'current' | 'pending' => {
    const currentIndex = getAvailableStages().indexOf(displayNameToStage(localCurrentStage));
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'current';
    return 'pending';
  };

  /**
   * Get stage progress percentage
   */
  const getStageProgress = (stageName: string): number => {
    const stages = getAvailableStages();
    const currentIndex = stages.findIndex(s => stageDisplayNames[s]?.toLowerCase() === stageName.toLowerCase());
    return currentIndex >= 0 ? Math.round(((currentIndex + 1) / stages.length) * 100) : 0;
  };

  /**
   * Get payment status color
   */
  const getPaymentColor = (status: string): 'success' | 'warning' | 'info' | 'error' | 'default' => {
    switch (status.toLowerCase()) {
      case 'paid': return 'success';
      case 'partial': return 'warning';
      case 'pending': return 'info';
      case 'refunded': return 'error';
      default: return 'default';
    }
  };


  /**
   * Format currency amount
   */
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  /**
   * Format date for display
   */
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  /**
   * Validate form inputs
   */
  const validateForm = (): boolean => {
    setFormError(null);

    if (!stage || !stage.trim()) {
      setFormError('Stage is required');
      return false;
    }

    if (!shipDate) {
      setFormError('Ship date is required');
      return false;
    }

    // Only require reason when ship date is changing
    const shipDateChanged = shipDate?.getTime() !== order.currentShipDate.getTime();
    if (shipDateChanged) {
      if (!reason.trim()) {
        setFormError('Reason is required when changing ship date');
        return false;
      }

      if (reason.length < 5) {
        setFormError('Reason must be at least 5 characters');
        return false;
      }
    }

    return true;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const result = await updateOrder(
        order.id,
        stage,
        shipDate?.toISOString().split('T')[0], // Format as YYYY-MM-DD
        reason
      );

      if (result.success) {
        onClose();
      }
    } catch (err) {
      // Error handled by the hook
      console.error('Update failed:', err);
    }
  };

  /**
   * Handle dialog close
   */
  const handleClose = () => {
    if (!isUpdating) {
      onClose();
    }
  };

  /**
   * Handle stage checkbox changes - automatically progress to next stage
   */
  const handleStageToggle = (selectedStage: OrderStage, checked: boolean) => {
    const stages = getAvailableStages();
    const stageIndex = stages.indexOf(selectedStage);
    const currentStageIndex = stages.indexOf(displayNameToStage(localCurrentStage));

    if (checked && stageIndex >= currentStageIndex) {
      // When checking a stage, progress to the NEXT stage (Todoist behavior)
      const nextStageIndex = stageIndex + 1;
      const nextStage = nextStageIndex < stages.length ? stages[nextStageIndex] : selectedStage;
      const newStageDisplayName = stageDisplayNames[nextStage];

      setStage(newStageDisplayName);
      setStageChangePending(true);

      // Auto-save stage change immediately
      handleStageUpdate(newStageDisplayName);
    } else if (!checked && stageIndex < currentStageIndex) {
      // When unchecking a completed stage, move back to that stage
      const newStage = stageDisplayNames[selectedStage];
      setStage(newStage);
      setStageChangePending(true);

      // Auto-save stage change immediately
      handleStageUpdate(newStage);
    }
  };

  /**
   * Handle automatic stage update
   */
  const handleStageUpdate = async (newStage: string) => {
    try {
      const result = await updateOrder(
        order.id,
        newStage,
        shipDate?.toISOString().split('T')[0],
        reason || 'Stage progression update'
      );

      if (result.success) {
        // Reset pending state
        setStageChangePending(false);
        // Update both the order object and local state to reflect the change
        order.currentStage = newStage;
        setLocalCurrentStage(newStage);
      } else {
        // Revert stage change on failure
        setStage(order.currentStage);
        setLocalCurrentStage(order.currentStage);
        setStageChangePending(false);
      }
    } catch (err) {
      // Revert stage change on error
      setStage(order.currentStage);
      setLocalCurrentStage(order.currentStage);
      setStageChangePending(false);
      console.error('Stage update failed:', err);
    }
  };

  /**
   * Check if ship date has been changed
   */
  const isShipDateChanged = (): boolean => {
    return shipDate?.getTime() !== order.currentShipDate.getTime();
  };

  /**
   * Get the appropriate button text based on form state
   */
  const getButtonText = (): string => {
    if (isUpdating) return 'Updating...';
    if (isShipDateChanged() && !reason.trim()) return 'Reason Required';
    return 'Save';
  };

  /**
   * Determine if the save button should be disabled
   */
  const isSaveButtonDisabled = (): boolean => {
    if (isUpdating) return true;
    // Only disable if ship date changed but no reason provided
    return isShipDateChanged() && !reason.trim();
  };

  const currentProgress = getStageProgress(localCurrentStage);
  const newProgress = getStageProgress(stage);

  return (
      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <Assignment />
            </Avatar>
            <Box>
              <Typography variant="h6" component="div">
                Update Order Status
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {order.orderNumber}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {/* Order Summary */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Order Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Business sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    Organization:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {order.organizationName}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AttachMoney sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    Total:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatCurrency(order.totalAmount)}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Schedule sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    Current Ship Date:
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ fontWeight: 500 }}
                  >
                    {formatDate(order.currentShipDate)}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <Chip 
                    label={order.isActive ? 'Active' : 'Inactive'} 
                    color={order.isActive ? 'success' : 'default'}
                    size="small"
                  />
                  <Chip 
                    label={order.paymentStatus} 
                    color={getPaymentColor(order.paymentStatus)}
                    size="small"
                  />
                </Stack>
              </Box>
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Description:
              </Typography>
              <Typography variant="body2">
                {order.description}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Current Progress */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              Current Progress
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <TrendingUp sx={{ color: 'primary.main' }} />
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {localCurrentStage}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ({currentProgress}% complete)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={currentProgress}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                },
              }}
            />
          </Box>

          {/* Error/Success Messages */}
          {(error || formError) && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error || formError}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          {/* Update Form */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Todoist-style Stage Checklist */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                Manufacturing Stages
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {getAvailableStages().map((stageKey, index) => {
                  const status = getStageStatus(stageKey, index);
                  const isChecked = status === 'completed';
                  const isCurrent = status === 'current';
                  const currentStageIndex = getAvailableStages().indexOf(displayNameToStage(localCurrentStage));
                  const canToggle = index >= currentStageIndex || isChecked;

                  // Hide completed stages (Todoist behavior)
                  if (isChecked) {
                    return null;
                  }

                  return (
                    <Box
                      key={stageKey}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        minHeight: '44px',
                        padding: 1,
                        borderRadius: 1,
                        cursor: canToggle ? 'pointer' : 'default',
                        backgroundColor:
                          isChecked ? 'success.light' + '1A' :
                          isCurrent ? 'primary.light' + '26' :
                          'grey.50',
                        border: isCurrent ? '2px solid' : 'none',
                        borderColor: isCurrent ? 'primary.main' : 'transparent',
                        '&:hover': canToggle ? {
                          backgroundColor:
                            isChecked ? 'success.light' + '33' :
                            isCurrent ? 'primary.light' + '4D' :
                            'grey.100'
                        } : {}
                      }}
                    >
                      <Checkbox
                        checked={isChecked}
                        onChange={(e) => handleStageToggle(stageKey, e.target.checked)}
                        disabled={!canToggle || isUpdating || stageChangePending}
                        data-testid={`stage-checkbox-${stageKey}`}
                        sx={{
                          minWidth: '44px',
                          minHeight: '44px',
                          color: isChecked ? 'success.main' :
                                 isCurrent ? 'primary.main' :
                                 'grey.400',
                          '&.Mui-checked': {
                            color: 'success.main',
                          }
                        }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: isCurrent ? 600 : 'medium',
                            color: isChecked ? 'success.dark' :
                                   isCurrent ? 'primary.main' :
                                   'text.primary'
                          }}
                        >
                          {stageDisplayNames[stageKey]}
                        </Typography>
                      </Box>
                      {isCurrent && (
                        <Chip label="Current" size="small" color="primary" />
                      )}
                      {isChecked && !isCurrent && (
                        <Chip label="Complete" size="small" color="success" />
                      )}
                      {stageChangePending && isCurrent && (
                        <CircularProgress size={16} />
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>

            <TextField
              label="Ship Date"
              type="date"
              value={shipDate ? shipDate.toISOString().split('T')[0] : ''}
              onChange={(e) => setShipDate(e.target.value ? new Date(e.target.value) : null)}
              disabled={isUpdating}
              InputLabelProps={{
                shrink: true,
              }}
              helperText="Update the expected ship date for this order"
              fullWidth
            />

            <TextField
              label="Reason for Update"
              multiline
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isUpdating}
              placeholder="Explain why this update is being made..."
              helperText={
                shipDate?.getTime() !== order.currentShipDate.getTime() 
                  ? `Required for ship date changes • ${reason.length}/500 characters`
                  : `Optional for stage changes • ${reason.length}/500 characters`
              }
              inputProps={{ maxLength: 500 }}
              fullWidth
            />

            {/* New Progress Preview */}
            {stage !== localCurrentStage && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'primary.main' }}>
                  New Progress Preview
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <TrendingUp sx={{ color: 'primary.main' }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {stage}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ({newProgress}% complete)
                  </Typography>
                  {newProgress > currentProgress && (
                    <Chip label="Progress!" color="success" size="small" />
                  )}
                  {newProgress < currentProgress && (
                    <Chip label="Regression" color="warning" size="small" />
                  )}
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={newProgress}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      backgroundColor: newProgress > currentProgress ? 'success.main' : 'warning.main',
                    },
                  }}
                />
              </Box>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button 
            onClick={handleClose}
            disabled={isUpdating}
            startIcon={<Cancel />}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={isSaveButtonDisabled()}
            startIcon={isUpdating ? <CircularProgress size={20} /> : <Save />}
          >
            {getButtonText()}
          </Button>
        </DialogActions>
      </Dialog>
  );
};

export default OrderStatusUpdate;