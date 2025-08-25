import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  Chip,
  Divider,
  LinearProgress,
  Grid,
  Avatar,
  Stack,
} from '@mui/material';
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

  /**
   * Reset form when order changes or dialog opens
   */
  useEffect(() => {
    if (open) {
      setStage(order.currentStage);
      setShipDate(order.currentShipDate);
      setReason('');
      setFormError(null);
      clearMessages();
    }
  }, [open, order, clearMessages]);

  /**
   * Get available manufacturing stages
   */
  const getAvailableStages = (): string[] => {
    return [
      'Initial Consultation',
      'Contract & Payment',
      'Design Development',
      'Measurements',
      'Fabric Selection',
      'Pattern Development',
      'Production Planning',
      'First Fitting',
      'Production',
      'Second Fitting',
      'Final Alterations',
      'Quality Control',
      'Packaging',
      'Shipped',
      'Delivered',
    ];
  };

  /**
   * Get stage progress percentage
   */
  const getStageProgress = (stageName: string): number => {
    const stages = getAvailableStages();
    const currentIndex = stages.findIndex(s => s.toLowerCase() === stageName.toLowerCase());
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
   * Check if order is overdue
   */
  const isOverdue = (): boolean => {
    return new Date(order.currentShipDate) < new Date() && order.isActive;
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

    if (!stage.trim()) {
      setFormError('Stage is required');
      return false;
    }

    if (!shipDate) {
      setFormError('Ship date is required');
      return false;
    }

    if (!reason.trim()) {
      setFormError('Reason for update is required');
      return false;
    }

    if (reason.length < 5) {
      setFormError('Reason must be at least 5 characters');
      return false;
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
   * Check if form has changes
   */
  const hasChanges = (): boolean => {
    return (
      stage !== order.currentStage ||
      shipDate?.getTime() !== order.currentShipDate.getTime() ||
      reason.trim() !== ''
    );
  };

  const currentProgress = getStageProgress(order.currentStage);
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
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
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
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Schedule sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    Current Ship Date:
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: 500,
                      color: isOverdue() ? 'error.main' : 'text.primary'
                    }}
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
                  {isOverdue() && (
                    <Chip 
                      label="Overdue" 
                      color="error"
                      size="small"
                    />
                  )}
                </Stack>
              </Grid>
            </Grid>
            
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
                {order.currentStage}
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
            <FormControl fullWidth>
              <InputLabel>New Stage</InputLabel>
              <Select
                value={stage}
                label="New Stage"
                onChange={(e) => setStage(e.target.value)}
                disabled={isUpdating}
              >
                {getAvailableStages().map((stageName) => (
                  <MenuItem key={stageName} value={stageName}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography>{stageName}</Typography>
                      {stageName === order.currentStage && (
                        <Chip label="Current" size="small" color="primary" />
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

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
              helperText={`${reason.length}/500 characters`}
              inputProps={{ maxLength: 500 }}
              fullWidth
            />

            {/* New Progress Preview */}
            {stage !== order.currentStage && (
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
            disabled={isUpdating || !hasChanges() || !reason.trim()}
            startIcon={isUpdating ? <LinearProgress size={20} /> : <Save />}
          >
            {isUpdating ? 'Updating...' : 'Update Order'}
          </Button>
        </DialogActions>
      </Dialog>
  );
};

export default OrderStatusUpdate;