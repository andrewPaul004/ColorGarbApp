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
  FormControlLabel,
  Checkbox,
  Grid,
  CircularProgress,
  Stack,
  Divider,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Autocomplete,
} from '@mui/material';
import {
  Assignment,
  Save,
  Cancel,
  CheckCircle,
  Business,
  People,
  AttachMoney,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAdminStore } from '../../stores/adminStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5132';

/**
 * Props for the AdminCreateOrderDialog component
 */
interface AdminCreateOrderDialogProps {
  /** Dialog open state */
  open: boolean;
  /** Dialog close handler */
  onClose: () => void;
  /** Callback when order is successfully created */
  onOrderCreated?: (order: { orderNumber: string; id: string }) => void;
}

/**
 * Admin order request interface matching the backend AdminCreateOrderRequest DTO
 */
interface AdminCreateOrderRequest {
  organizationId: string;
  orderName?: string;
  description: string;
  numberOfPerformers?: number;
  measurementDate: string;
  deliveryDate: string;
  needsSample: boolean;
  initialStage: string;
  totalAmount?: number;
  specialInstructions?: string;
  notes?: string;
}

/**
 * Organization interface for dropdown
 */
interface Organization {
  id: string;
  name: string;
  type: string;
  contactEmail: string;
}

/**
 * Admin Create Order Dialog component for ColorGarb staff.
 * Provides enhanced order creation capabilities with organization selection,
 * stage customization, and advanced configuration options.
 * 
 * @component
 * @param {AdminCreateOrderDialogProps} props - Component props
 * @returns {JSX.Element} Admin create order dialog
 * 
 * @since 2.5.0
 */
export const AdminCreateOrderDialog: React.FC<AdminCreateOrderDialogProps> = ({
  open,
  onClose,
  onOrderCreated,
}) => {
  const { organizations } = useAdminStore();

  // Form state
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [orderName, setOrderName] = useState('');
  const [description, setDescription] = useState('');
  const [numberOfPerformers, setNumberOfPerformers] = useState<number | ''>('');
  const [measurementDate, setMeasurementDate] = useState<Date | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [needsSample, setNeedsSample] = useState(false);
  const [initialStage, setInitialStage] = useState('Design Proposal');
  const [totalAmount, setTotalAmount] = useState<number | ''>('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [notes, setNotes] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  /**
   * Available manufacturing stages for admin selection
   */
  const availableStages = [
    'Design Proposal',
    'Proof Approval', 
    'Measurements',
    'Production Planning',
    'Cutting',
    'Sewing',
    'Quality Control',
    'Finishing',
    'Final Inspection',
    'Packaging',
    'Shipping Preparation',
    'Ship Order',
    'Delivery'
  ];

  /**
   * Reset form when dialog opens or closes
   */
  useEffect(() => {
    if (open) {
      // Reset form state
      setSelectedOrganization(null);
      setOrderName('');
      setDescription('');
      setNumberOfPerformers('');
      setMeasurementDate(null);
      setDeliveryDate(null);
      setNeedsSample(false);
      setInitialStage('Design Proposal');
      setTotalAmount('');
      setSpecialInstructions('');
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

    // Organization validation
    if (!selectedOrganization) {
      errors.organization = 'Organization selection is required';
    }

    // Description validation
    if (!description.trim()) {
      errors.description = 'Order description is required';
    } else if (description.trim().length > 500) {
      errors.description = 'Description cannot exceed 500 characters';
    }

    // Order name validation
    if (orderName.length > 200) {
      errors.orderName = 'Order name cannot exceed 200 characters';
    }

    // Number of performers validation
    if (numberOfPerformers !== '' && (numberOfPerformers < 1 || numberOfPerformers > 10000)) {
      errors.numberOfPerformers = 'Number of performers must be between 1 and 10,000';
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
    } else if (measurementDate) {
      const deliveryDateOnly = new Date(deliveryDate);
      deliveryDateOnly.setHours(0, 0, 0, 0);
      const measurementDateOnly = new Date(measurementDate);
      measurementDateOnly.setHours(0, 0, 0, 0);

      if (deliveryDateOnly <= measurementDateOnly) {
        errors.deliveryDate = 'Delivery date must be after measurement date';
      }
    }

    // Total amount validation
    if (totalAmount !== '' && (totalAmount < 0 || totalAmount > 1000000)) {
      errors.totalAmount = 'Total amount must be between $0 and $1,000,000';
    }

    // Special instructions validation
    if (specialInstructions.length > 5000) {
      errors.specialInstructions = 'Special instructions cannot exceed 5000 characters';
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

    if (!selectedOrganization) {
      setError('Organization selection is required');
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
      const requestData: AdminCreateOrderRequest = {
        organizationId: selectedOrganization.id,
        orderName: orderName.trim() || undefined,
        description: description.trim(),
        numberOfPerformers: numberOfPerformers === '' ? undefined : Number(numberOfPerformers),
        measurementDate: measurementDate!.toISOString(),
        deliveryDate: deliveryDate!.toISOString(),
        needsSample: needsSample,
        initialStage: initialStage,
        totalAmount: totalAmount === '' ? undefined : Number(totalAmount),
        specialInstructions: specialInstructions.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      // Submit to API
      const response = await fetch(`${API_BASE_URL}/api/orders/admin`, {
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
          throw new Error('You do not have admin permissions to create orders.');
        }
        if (response.status === 400) {
          const errorData = await response.json().catch(() => ({ message: 'Invalid request data' }));
          throw new Error(`Invalid request: ${errorData.message || 'Please check your input'}`);
        }
        throw new Error(`Failed to create order: ${response.statusText}`);
      }

      const newOrder = await response.json();
      
      setSuccess(`Order ${newOrder.orderNumber} created successfully for ${selectedOrganization.name}!`);
      
      // Call callback if provided
      if (onOrderCreated) {
        onOrderCreated(newOrder);
      }

      // Close dialog after a brief delay to show success message
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error creating admin order:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred while creating the order');
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

  /**
   * Gets minimum delivery date (day after measurement date)
   */
  const getMinDeliveryDate = (): Date => {
    if (measurementDate) {
      const minDate = new Date(measurementDate);
      minDate.setDate(minDate.getDate() + 1);
      minDate.setHours(0, 0, 0, 0);
      return minDate;
    }
    return getMinDate();
  };

  // Convert organizations to the expected format
  const organizationOptions: Organization[] = organizations.map(org => ({
    id: org.id,
    name: org.name,
    type: org.type,
    contactEmail: org.contactEmail
  }));

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
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
                Create New Order (Admin)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enhanced order creation for any organization
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
            {/* Organization Selection */}
            <Grid item xs={12}>
              <Autocomplete
                options={organizationOptions}
                getOptionLabel={(option) => option.name}
                value={selectedOrganization}
                onChange={(_, newValue) => setSelectedOrganization(newValue)}
                disabled={isSubmitting}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Business sx={{ mr: 2, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="body2">{option.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.type} • {option.contactEmail}
                      </Typography>
                    </Box>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Organization"
                    required
                    error={!!validationErrors.organization}
                    helperText={validationErrors.organization || 'Select the organization for this order'}
                  />
                )}
              />
            </Grid>

            {/* Order Name */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Order Name"
                placeholder="e.g., Fall 2025 Marching Band"
                value={orderName}
                onChange={(e) => setOrderName(e.target.value)}
                error={!!validationErrors.orderName}
                helperText={validationErrors.orderName || `${orderName.length}/200 characters (optional)`}
                fullWidth
                disabled={isSubmitting}
                inputProps={{ maxLength: 200 }}
              />
            </Grid>

            {/* Number of Performers */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Number of Performers"
                type="number"
                value={numberOfPerformers}
                onChange={(e) => setNumberOfPerformers(e.target.value === '' ? '' : Number(e.target.value))}
                error={!!validationErrors.numberOfPerformers}
                helperText={validationErrors.numberOfPerformers || 'Optional sizing estimate'}
                fullWidth
                disabled={isSubmitting}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><People /></InputAdornment>,
                  inputProps: { min: 1, max: 10000 }
                }}
              />
            </Grid>

            {/* Order Description */}
            <Grid item xs={12}>
              <TextField
                label="Order Description"
                placeholder="Describe the costume order requirements..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                error={!!validationErrors.description}
                helperText={validationErrors.description || `${description.length}/500 characters`}
                required
                fullWidth
                multiline
                rows={2}
                disabled={isSubmitting}
                inputProps={{ maxLength: 500 }}
              />
            </Grid>

            {/* Initial Stage */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={isSubmitting}>
                <InputLabel>Initial Manufacturing Stage</InputLabel>
                <Select
                  value={initialStage}
                  label="Initial Manufacturing Stage"
                  onChange={(e) => setInitialStage(e.target.value)}
                >
                  {availableStages.map((stage) => (
                    <MenuItem key={stage} value={stage}>
                      {stage}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Total Amount */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Total Amount"
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value === '' ? '' : Number(e.target.value))}
                error={!!validationErrors.totalAmount}
                helperText={validationErrors.totalAmount || 'Leave blank for "Pending Design Approval"'}
                fullWidth
                disabled={isSubmitting}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><AttachMoney /></InputAdornment>,
                  inputProps: { min: 0, max: 1000000, step: 0.01 }
                }}
              />
            </Grid>

            {/* Measurement Date */}
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Measurement Date"
                value={measurementDate}
                onChange={(date) => setMeasurementDate(date)}
                minDate={getMinDate()}
                disabled={isSubmitting}
                enableAccessibleFieldDOMStructure={false}
                slots={{
                  textField: (params) => (
                    <TextField
                      {...params}
                      required
                      fullWidth
                      error={!!validationErrors.measurementDate}
                      helperText={validationErrors.measurementDate || 'When will measurements be provided?'}
                    />
                  ),
                }}
              />
            </Grid>

            {/* Delivery Date */}
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Delivery Date"
                value={deliveryDate}
                onChange={(date) => setDeliveryDate(date)}
                minDate={getMinDeliveryDate()}
                disabled={isSubmitting}
                enableAccessibleFieldDOMStructure={false}
                slots={{
                  textField: (params) => (
                    <TextField
                      {...params}
                      required
                      fullWidth
                      error={!!validationErrors.deliveryDate}
                      helperText={validationErrors.deliveryDate || 'When are costumes needed?'}
                    />
                  ),
                }}
              />
            </Grid>

            {/* Sample Checkbox */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={needsSample}
                      onChange={(e) => setNeedsSample(e.target.checked)}
                      disabled={isSubmitting}
                    />
                  }
                  label="Customer needs a sample prior to production"
                />
              </FormControl>
            </Grid>

            {/* Special Instructions */}
            <Grid item xs={12}>
              <TextField
                label="Special Instructions"
                placeholder="Detailed requirements, specifications, or special considerations..."
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                error={!!validationErrors.specialInstructions}
                helperText={validationErrors.specialInstructions || `${specialInstructions.length}/5000 characters (optional)`}
                fullWidth
                multiline
                rows={3}
                disabled={isSubmitting}
                inputProps={{ maxLength: 5000 }}
              />
            </Grid>

            {/* Administrative Notes */}
            <Grid item xs={12}>
              <TextField
                label="Administrative Notes"
                placeholder="Internal notes for ColorGarb staff..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                error={!!validationErrors.notes}
                helperText={validationErrors.notes || `${notes.length}/2000 characters (optional)`}
                fullWidth
                multiline
                rows={2}
                disabled={isSubmitting}
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
            Cancel
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

export default AdminCreateOrderDialog;