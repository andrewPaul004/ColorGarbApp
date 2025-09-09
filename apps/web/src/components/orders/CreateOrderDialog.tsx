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
 * Request interface matching the backend CreateOrderRequestDto DTO
 */
interface CreateOrderRequestDto {
  description: string;
  performerCount: number;
  preferredCompletionDate: string;
  estimatedBudget?: number;
  priority: string;
  notes?: string;
}

/**
 * Create Order Request Dialog component for Director and Finance users.
 * Allows submission of order requests that ColorGarb staff will review and approve.
 * No longer creates orders directly - instead sends requests for staff approval.
 * Features responsive design and follows Material-UI patterns.
 * 
 * @component
 * @param {CreateOrderDialogProps} props - Component props
 * @returns {JSX.Element} Create order request dialog
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
  const [performerCount, setPerformerCount] = useState<number>(1);
  const [preferredCompletionDate, setPreferredCompletionDate] = useState<Date | null>(null);
  const [estimatedBudget, setEstimatedBudget] = useState<number | null>(null);
  const [priority, setPriority] = useState('Normal');
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
      setPerformerCount(1);
      setPreferredCompletionDate(null);
      setEstimatedBudget(null);
      setPriority('Normal');
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

    // Performer count validation
    if (!performerCount || performerCount < 1) {
      errors.performerCount = 'Performer count must be at least 1';
    } else if (performerCount > 10000) {
      errors.performerCount = 'Performer count cannot exceed 10,000';
    }

    // Preferred completion date validation
    if (!preferredCompletionDate) {
      errors.preferredCompletionDate = 'Preferred completion date is required';
    } else {
      const completionDateOnly = new Date(preferredCompletionDate);
      completionDateOnly.setHours(0, 0, 0, 0);
      
      if (completionDateOnly <= today) {
        errors.preferredCompletionDate = 'Completion date must be in the future';
      }
    }

    // Budget validation
    if (estimatedBudget !== null && estimatedBudget !== undefined) {
      if (estimatedBudget < 0.01) {
        errors.estimatedBudget = 'Budget must be at least $0.01';
      } else if (estimatedBudget > 999999.99) {
        errors.estimatedBudget = 'Budget cannot exceed $999,999.99';
      }
    }

    // Priority validation
    if (!['Low', 'Normal', 'High', 'Urgent'].includes(priority)) {
      errors.priority = 'Please select a valid priority level';
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
      const requestData: CreateOrderRequestDto = {
        description: description.trim(),
        performerCount: performerCount,
        preferredCompletionDate: preferredCompletionDate!.toISOString(),
        estimatedBudget: estimatedBudget || undefined,
        priority: priority,
        notes: notes.trim() || undefined,
      };

      // Submit to API
      const response = await fetch(`${API_BASE_URL}/api/orders/request`, {
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
        throw new Error(`Failed to submit order request: ${response.statusText}`);
      }

      const orderRequest = await response.json();
      
      setSuccess(`Order request submitted successfully! ColorGarb staff will review and contact you soon.`);
      
      // Note: Dialog remains open so user can see success message and close manually
      // No automatic redirect or callback to avoid navigating away from dashboard

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
                Submit Order Request
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

            {/* Performer Count */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Performer Count"
                type="number"
                placeholder="Number of performers/costumes needed"
                value={performerCount}
                onChange={(e) => setPerformerCount(parseInt(e.target.value) || 1)}
                error={!!validationErrors.performerCount}
                helperText={validationErrors.performerCount || 'How many costumes do you need?'}
                required
                fullWidth
                disabled={isSubmitting || !!success}
                inputProps={{ min: 1, max: 10000 }}
              />
            </Grid>

            {/* Priority */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required error={!!validationErrors.priority}>
                <InputLabel id="priority-select-label">Priority</InputLabel>
                <Select
                  labelId="priority-select-label"
                  label="Priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  disabled={isSubmitting || !!success}
                >
                  <MenuItem value="Low">Low</MenuItem>
                  <MenuItem value="Normal">Normal</MenuItem>
                  <MenuItem value="High">High</MenuItem>
                  <MenuItem value="Urgent">Urgent</MenuItem>
                </Select>
                {validationErrors.priority && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 2 }}>
                    {validationErrors.priority}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Preferred Completion Date */}
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Preferred Completion Date"
                value={preferredCompletionDate}
                onChange={(date) => setPreferredCompletionDate(date)}
                minDate={getMinDate()}
                disabled={isSubmitting || !!success}
                slots={{
                  textField: (params) => (
                    <TextField
                      {...params}
                      required
                      fullWidth
                      error={!!validationErrors.preferredCompletionDate}
                      helperText={validationErrors.preferredCompletionDate || 'When would you like this completed?'}
                    />
                  ),
                }}
              />
            </Grid>

            {/* Estimated Budget */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Estimated Budget"
                type="number"
                placeholder="Your estimated budget (optional)"
                value={estimatedBudget || ''}
                onChange={(e) => setEstimatedBudget(e.target.value ? parseFloat(e.target.value) : null)}
                error={!!validationErrors.estimatedBudget}
                helperText={validationErrors.estimatedBudget || 'Optional - helps with planning'}
                fullWidth
                disabled={isSubmitting || !!success}
                inputProps={{ min: 0.01, max: 999999.99, step: 0.01 }}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                }}
              />
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
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default CreateOrderDialog;