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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Badge,
  Stack,
  LinearProgress,
  Collapse,
  Paper,
} from '@mui/material';
import {
  Assignment,
  Business,
  Save,
  Cancel,
  Warning,
  CheckCircle,
  ExpandLess,
  ExpandMore,
  Group,
  TrendingUp,
} from '@mui/icons-material';
import { useAdminStore } from '../../stores/adminStore';
import { useAdminOperations } from '../../hooks/useAdminOperations';
import type { AdminOrder } from '../../services/adminService';

/**
 * Props for the BulkUpdateModal component
 */
interface BulkUpdateModalProps {
  /** Dialog open state */
  open: boolean;
  /** Dialog close handler */
  onClose: () => void;
}

/**
 * Bulk Update Modal component for updating multiple orders simultaneously.
 * Features comprehensive validation, progress tracking, and detailed result reporting.
 * Allows admin users to update stage, ship date, and add notes for multiple orders.
 * 
 * @component
 * @param {BulkUpdateModalProps} props - Component props
 * @returns {JSX.Element} Bulk update modal dialog
 * 
 * @since 2.4.0
 */
export const BulkUpdateModal: React.FC<BulkUpdateModalProps> = ({
  open,
  onClose,
}) => {
  // Admin store state
  const {
    orders,
    selectedOrderIds,
    clearOrderSelection,
  } = useAdminStore();

  // Admin operations hook
  const {
    bulkUpdate,
    isBulkUpdating,
    error,
    success,
    clearMessages,
  } = useAdminOperations();

  // Form state
  const [stage, setStage] = useState<string>('');
  const [shipDate, setShipDate] = useState<Date | null>(null);
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [showOrdersPreview, setShowOrdersPreview] = useState(false);
  const [bulkResults, setBulkResults] = useState<{
    successful: string[];
    failed: { orderId: string; error: string }[];
  } | null>(null);

  /**
   * Reset form when dialog opens
   */
  useEffect(() => {
    if (open) {
      setStage('');
      setShipDate(null);
      setReason('');
      setFormError(null);
      setBulkResults(null);
      setShowOrdersPreview(false);
      clearMessages();
    }
  }, [open, clearMessages]);

  /**
   * Get selected orders data
   */
  const getSelectedOrders = (): AdminOrder[] => {
    return orders.filter(order => selectedOrderIds.includes(order.id));
  };

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

  /**
   * Get organization summary
   */
  const getOrganizationSummary = (): { [key: string]: number } => {
    const selectedOrders = getSelectedOrders();
    const summary: { [key: string]: number } = {};
    
    selectedOrders.forEach(order => {
      const orgName = order.organizationName;
      summary[orgName] = (summary[orgName] || 0) + 1;
    });
    
    return summary;
  };

  /**
   * Get total value of selected orders
   */
  const getTotalValue = (): number => {
    return getSelectedOrders().reduce((sum, order) => sum + order.totalAmount, 0);
  };

  /**
   * Validate form inputs
   */
  const validateForm = (): boolean => {
    setFormError(null);

    if (selectedOrderIds.length === 0) {
      setFormError('No orders selected for bulk update');
      return false;
    }

    if (!stage.trim() && !shipDate) {
      setFormError('At least one field (stage or ship date) must be updated');
      return false;
    }

    if (!reason.trim()) {
      setFormError('Reason for bulk update is required');
      return false;
    }

    if (reason.length < 10) {
      setFormError('Reason must be at least 10 characters for bulk operations');
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
      const result = await bulkUpdate(
        stage || undefined,
        shipDate?.toISOString().split('T')[0], // Format as YYYY-MM-DD
        reason
      );

      if (result.success && result.result) {
        setBulkResults(result.result);
        if (result.result.failed.length === 0) {
          // If all successful, close after a short delay
          setTimeout(() => {
            clearOrderSelection();
            onClose();
          }, 2000);
        }
      }
    } catch (err) {
      // Error handled by the hook
      console.error('Bulk update failed:', err);
    }
  };

  /**
   * Handle dialog close
   */
  const handleClose = () => {
    if (!isBulkUpdating) {
      setBulkResults(null);
      onClose();
    }
  };

  /**
   * Check if form has valid inputs
   */
  const hasValidInputs = (): boolean => {
    return (stage.trim() !== '' || shipDate !== null) && reason.trim() !== '';
  };

  const selectedOrders = getSelectedOrders();
  const orgSummary = getOrganizationSummary();
  const totalValue = getTotalValue();

  return (
      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2, maxHeight: '90vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Badge badgeContent={selectedOrderIds.length} color="primary">
              <Avatar sx={{ bgcolor: 'secondary.main' }}>
                <Group />
              </Avatar>
            </Badge>
            <Box>
              <Typography variant="h6" component="div">
                Bulk Update Orders
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Update {selectedOrderIds.length} selected {selectedOrderIds.length === 1 ? 'order' : 'orders'}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ maxHeight: '60vh', overflow: 'auto' }}>
          {/* Selection Summary */}
          {!bulkResults && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                Selection Summary
              </Typography>
              
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Assignment sx={{ color: 'primary.main' }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {selectedOrderIds.length} Orders Selected
                    </Typography>
                  </Box>
                  <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600 }}>
                    {formatCurrency(totalValue)}
                  </Typography>
                </Box>

                {/* Organization Breakdown */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Organizations:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {Object.entries(orgSummary).map(([orgName, count]) => (
                      <Chip
                        key={orgName}
                        label={`${orgName} (${count})`}
                        size="small"
                        variant="outlined"
                        icon={<Business />}
                      />
                    ))}
                  </Stack>
                </Box>

                {/* Orders Preview Toggle */}
                <Box>
                  <Button
                    onClick={() => setShowOrdersPreview(!showOrdersPreview)}
                    size="small"
                    endIcon={showOrdersPreview ? <ExpandLess /> : <ExpandMore />}
                  >
                    {showOrdersPreview ? 'Hide' : 'Show'} Order Details
                  </Button>
                  
                  <Collapse in={showOrdersPreview}>
                    <List dense sx={{ mt: 1, maxHeight: 200, overflow: 'auto' }}>
                      {selectedOrders.map((order) => (
                        <ListItem key={order.id} divider>
                          <ListItemIcon>
                            <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main', fontSize: 12 }}>
                              {order.orderNumber.split('-')[1] || 'O'}
                            </Avatar>
                          </ListItemIcon>
                          <ListItemText
                            primary={order.orderNumber}
                            secondary={`${order.organizationName} • ${order.currentStage}`}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {formatCurrency(order.totalAmount)}
                          </Typography>
                        </ListItem>
                      ))}
                    </List>
                  </Collapse>
                </Box>
              </Paper>
            </Box>
          )}

          {/* Bulk Results Display */}
          {bulkResults && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                Bulk Update Results
              </Typography>

              {/* Success Results */}
              {bulkResults.successful.length > 0 && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                    Successfully updated {bulkResults.successful.length} {bulkResults.successful.length === 1 ? 'order' : 'orders'}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {bulkResults.successful.map((orderId) => {
                      const order = orders.find(o => o.id === orderId);
                      return (
                        <Chip
                          key={orderId}
                          label={order?.orderNumber || orderId}
                          size="small"
                          icon={<CheckCircle />}
                          color="success"
                          variant="outlined"
                        />
                      );
                    })}
                  </Stack>
                </Alert>
              )}

              {/* Error Results */}
              {bulkResults.failed.length > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                    Failed to update {bulkResults.failed.length} {bulkResults.failed.length === 1 ? 'order' : 'orders'}
                  </Typography>
                  <List dense>
                    {bulkResults.failed.map((failure) => {
                      const order = orders.find(o => o.id === failure.orderId);
                      return (
                        <ListItem key={failure.orderId} sx={{ px: 0 }}>
                          <ListItemIcon>
                            <Warning color="error" />
                          </ListItemIcon>
                          <ListItemText
                            primary={order?.orderNumber || failure.orderId}
                            secondary={failure.error}
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </Alert>
              )}
            </Box>
          )}

          {/* Error/Success Messages */}
          {(error || formError) && !bulkResults && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error || formError}
            </Alert>
          )}

          {success && !bulkResults && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {success}
            </Alert>
          )}

          {/* Update Form */}
          {!bulkResults && (
            <>
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="subtitle2" sx={{ mb: 3, fontWeight: 600 }}>
                Bulk Update Settings
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>New Stage (Optional)</InputLabel>
                  <Select
                    value={stage}
                    label="New Stage (Optional)"
                    onChange={(e) => setStage(e.target.value)}
                    disabled={isBulkUpdating}
                  >
                    <MenuItem value="">
                      <em>Keep current stage</em>
                    </MenuItem>
                    {getAvailableStages().map((stageName) => (
                      <MenuItem key={stageName} value={stageName}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <TrendingUp sx={{ fontSize: 16 }} />
                          <Typography>{stageName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            ({getStageProgress(stageName)}%)
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Ship Date (Optional)"
                  type="date"
                  value={shipDate ? shipDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setShipDate(e.target.value ? new Date(e.target.value) : null)}
                  disabled={isBulkUpdating}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  helperText="Leave empty to keep current ship dates"
                  fullWidth
                />

                <TextField
                  label="Reason for Bulk Update"
                  multiline
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isBulkUpdating}
                  placeholder="Explain why this bulk update is being performed..."
                  helperText={`${reason.length}/1000 characters (minimum 10 required)`}
                  inputProps={{ maxLength: 1000 }}
                  fullWidth
                  required
                />

                {/* Progress Indicator */}
                {isBulkUpdating && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Processing bulk update...
                    </Typography>
                    <LinearProgress />
                  </Box>
                )}
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 1 }}>
          {!bulkResults ? (
            <>
              <Button 
                onClick={handleClose}
                disabled={isBulkUpdating}
                startIcon={<Cancel />}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                variant="contained"
                disabled={isBulkUpdating || !hasValidInputs() || selectedOrderIds.length === 0}
                startIcon={<Save />}
              >
                {isBulkUpdating ? 'Updating Orders...' : `Update ${selectedOrderIds.length} Orders`}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleClose}
              variant="contained"
              startIcon={<CheckCircle />}
            >
              Close
            </Button>
          )}
        </DialogActions>
      </Dialog>
  );
};

export default BulkUpdateModal;