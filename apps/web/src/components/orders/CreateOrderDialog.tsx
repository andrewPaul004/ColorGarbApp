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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  Stack,
  Divider,
} from '@mui/material';
import {
  Assignment,
  CalendarMonth,
  Save,
  Cancel,
  CheckCircle,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAppStore } from '../../stores/appStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5132';

/**
 * Props for the CreateOrderDialog component
 */
interface CreateOrderDialogProps {
  /** Dialog open state */
  open: boolean;
  /** Dialog close handler */
  onClose: () => void;
  /** Callback when order is successfully created */
  onOrderCreated?: (order: any) => void;
}

/**
 * Request interface matching the backend CreateOrderRequest DTO for Story 9A.3
 */
interface CreateOrderRequest {
  description: string;
  measurementDate: string;
  deliveryDate: string;
  needsSample: boolean;
  notes?: string;
}

/**
 * Create Order Dialog component for Director and Finance users.
 * Creates orders directly in the system with streamlined form matching Story 9A.3.
 * Orders are created immediately with auto-generated order numbers and default settings.
 * Features responsive design and follows Material-UI patterns.
 *
 * @component
 * @param {CreateOrderDialogProps} props - Component props
 * @returns {JSX.Element} Create order dialog
 *
 * @since 2.5.0
 */
export const CreateOrderDialog: React.FC<CreateOrderDialogProps> = ({
  open,
  onClose,
  onOrderCreated,
}) => {
  const { user, organization } = useAppStore();

  // Form state
  const [description, setDescription] = useState('');
  const [measurementDate, setMeasurementDate] = useState<Date | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [needsSample, setNeedsSample] = useState(false);
  const [notes, setNotes] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  /**
   * Reset form when dialog opens or closes
   */
  useEffect(() => {
    if (open) {
      // Reset form state
      setDescription('');
      setMeasurementDate(null);
      setDeliveryDate(null);
      setNeedsSample(false);
      setNotes('');
      setError(null);
      setSuccess(null);
      setValidationErrors({});
    }
  }, [open]);

  /**
   * Validates form data before submission
   */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for date comparison

    // Description validation
    if (!description.trim()) {
      errors.description = 'Order description is required';
    } else if (description.trim().length > 500) {
      errors.description = 'Description cannot exceed 500 characters';
    }

    // Measurement date validation
    if (!measurementDate) {
      errors.measurementDate = 'Measurement date is required';
    } else {
      const measurementDateOnly = new Date(measurementDate);
      measurementDateOnly.setHours(0, 0, 0, 0);

      if (measurementDateOnly <= today) {
        errors.measurementDate = 'Measurement date must be in the future';
      }
    }

    // Delivery date validation
    if (!deliveryDate) {
      errors.deliveryDate = 'Delivery date is required';
    } else {
      const deliveryDateOnly = new Date(deliveryDate);
      deliveryDateOnly.setHours(0, 0, 0, 0);

      if (deliveryDateOnly <= today) {
        errors.deliveryDate = 'Delivery date must be in the future';
      }

      // Check that delivery date is after measurement date
      if (measurementDate) {
        const measurementDateOnly = new Date(measurementDate);
        measurementDateOnly.setHours(0, 0, 0, 0);

        if (deliveryDateOnly <= measurementDateOnly) {
          errors.deliveryDate = 'Delivery date must be after measurement date';
        }
      }
    }

    // Notes validation
    if (notes.length > 2000) {
      errors.notes = 'Notes cannot exceed 2000 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handles form submission
   */
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!user) {
      setError('User authentication required. Please log in again.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Get auth token
      const token = localStorage.getItem('colorgarb_auth_token');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      // Prepare request data
      const requestData: CreateOrderRequest = {
        description: description.trim(),
        measurementDate: measurementDate!.toISOString(),
        deliveryDate: deliveryDate!.toISOString(),
        needsSample: needsSample,
        notes: notes.trim() || undefined,
      };

      // Submit to API
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }
        if (response.status === 403) {
          throw new Error('You do not have permission to submit order requests.');
        }
        if (response.status === 400) {
          const errorData = await response.json().catch(() => ({ message: 'Invalid request data' }));
          throw new Error(`Invalid request: ${errorData.message || 'Please check your input'}`);
        }
        throw new Error(`Failed to create order: ${response.statusText}`);
      }

      const order = await response.json();

      setSuccess(`Order ${order.orderNumber} created successfully! You will be redirected to the order details.`);

      // Call the callback to refresh orders and navigate to new order
      if (onOrderCreated) {
        onOrderCreated(order);
      }

    } catch (error) {
      console.error('Error creating order:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred while submitting the order request');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handles dialog close
   */
  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  /**
   * Gets minimum date for date pickers (tomorrow)
   */
  const getMinDate = (): Date => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Assignment color="primary" />
            <Box>
              <Typography variant="h6" component="div">
                Create New Order
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {organization?.name || 'Unknown Organization'}
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ pt: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Order Description */}
            <Grid item xs={12}>
              <TextField
                label="Order Description"
                placeholder="Describe the costume order (e.g., Fall 2024 Marching Band Uniforms)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                error={!!validationErrors.description}
                helperText={validationErrors.description || `${description.length}/500 characters`}
                required
                fullWidth
                multiline
                rows={2}
                disabled={isSubmitting || !!success}
                inputProps={{ maxLength: 500 }}
              />
            </Grid>

            {/* When will you provide measurements? */}
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="When will you provide measurements?"
                value={measurementDate}
                onChange={(date) => setMeasurementDate(date)}
                minDate={getMinDate()}
                disabled={isSubmitting || !!success}
                slots={{
                  textField: (params) => (
                    <TextField
                      {...params}
                      required
                      fullWidth
                      error={!!validationErrors.measurementDate}
                      helperText={validationErrors.measurementDate || 'Date when measurements will be provided'}
                    />
                  ),
                }}
              />
            </Grid>

            {/* When do you need these by? */}
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="When do you need these by?"
                value={deliveryDate}
                onChange={(date) => setDeliveryDate(date)}
                minDate={measurementDate ? new Date(measurementDate.getTime() + 24 * 60 * 60 * 1000) : getMinDate()}
                disabled={isSubmitting || !!success}
                slots={{
                  textField: (params) => (
                    <TextField
                      {...params}
                      required
                      fullWidth
                      error={!!validationErrors.deliveryDate}
                      helperText={validationErrors.deliveryDate || 'Final delivery date needed'}
                    />
                  ),
                }}
              />
            </Grid>

            {/* Do you need a sample prior to production? */}
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <Typography variant="body1" sx={{ mb: 1 }}>
                  Do you need a sample prior to production?
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Button
                    variant={needsSample ? "contained" : "outlined"}
                    onClick={() => setNeedsSample(true)}
                    disabled={isSubmitting || !!success}
                    sx={{ minWidth: 100 }}
                  >
                    Yes
                  </Button>
                  <Button
                    variant={!needsSample ? "contained" : "outlined"}
                    onClick={() => setNeedsSample(false)}
                    disabled={isSubmitting || !!success}
                    sx={{ minWidth: 100 }}
                  >
                    No
                  </Button>
                </Stack>
              </FormControl>
            </Grid>

            {/* Additional Notes */}
            <Grid item xs={12}>
              <TextField
                label="Additional Notes"
                placeholder="Any special instructions, requirements, or details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                error={!!validationErrors.notes}
                helperText={validationErrors.notes || `${notes.length}/2000 characters (optional)`}
                fullWidth
                multiline
                rows={3}
                disabled={isSubmitting || !!success}
                inputProps={{ maxLength: 2000 }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={handleClose}
            disabled={isSubmitting}
            startIcon={<Cancel />}
          >
            {success ? 'Close' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={isSubmitting || !!success}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : <Save />}
          >
            {isSubmitting ? 'Creating...' : 'Create Order'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default CreateOrderDialog;