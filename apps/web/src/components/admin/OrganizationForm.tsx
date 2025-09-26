import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  Alert,
  Divider,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import organizationService, {
  type OrganizationDetails,
  type CreateOrganizationData,
  type UpdateOrganizationData,
} from '../../services/organizationService';

/**
 * Props for OrganizationForm component
 */
interface OrganizationFormProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Callback when organization is saved */
  onSave: (organization: OrganizationDetails) => void;
  /** Organization to edit (null for create mode) */
  organization?: OrganizationDetails | null;
  /** Dialog title */
  title: string;
}

/**
 * Form data interface
 */
interface FormData {
  name: string;
  type: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  shippingAddress: string;
  sameAsAddress: boolean;
}

/**
 * Form validation errors interface
 */
interface FormErrors {
  name?: string;
  type?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  shippingAddress?: string;
}

/**
 * Organization form component for creating and editing organizations.
 * Features comprehensive validation, address management, and error handling.
 *
 * @component
 * @param {OrganizationFormProps} props - Component props
 * @returns {JSX.Element} Organization form dialog component
 *
 * @example
 * ```tsx
 * <OrganizationForm
 *   open={isOpen}
 *   onClose={handleClose}
 *   onSave={handleSave}
 *   organization={selectedOrganization}
 *   title="Edit Organization"
 * />
 * ```
 *
 * @since 2.5.0
 */
export const OrganizationForm: React.FC<OrganizationFormProps> = ({
  open,
  onClose,
  onSave,
  organization,
  title,
}) => {
  const isEditMode = Boolean(organization);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    shippingAddress: '',
    sameAsAddress: true,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Organization types
  const organizationTypes = [
    { value: 'school', label: 'School' },
    { value: 'theater', label: 'Theater' },
    { value: 'dance_company', label: 'Dance Company' },
    { value: 'other', label: 'Other' },
  ];

  /**
   * Initialize form data when dialog opens or organization changes
   */
  useEffect(() => {
    if (open) {
      if (organization) {
        // Edit mode - populate with existing data
        setFormData({
          name: organization.name || '',
          type: organization.type || '',
          contactEmail: organization.contactEmail || '',
          contactPhone: organization.contactPhone || '',
          address: organization.address || '',
          shippingAddress: organization.shippingAddress || '',
          sameAsAddress: !organization.shippingAddress || organization.shippingAddress === organization.address,
        });
      } else {
        // Create mode - reset form
        setFormData({
          name: '',
          type: '',
          contactEmail: '',
          contactPhone: '',
          address: '',
          shippingAddress: '',
          sameAsAddress: true,
        });
      }
      setErrors({});
      setSubmitError(null);
    }
  }, [open, organization]);

  /**
   * Handle form field changes
   */
  const handleFieldChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: unknown } }
  ) => {
    const value = event.target.value as string;
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear field error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  /**
   * Handle "same as address" checkbox change
   */
  const handleSameAsAddressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setFormData(prev => ({
      ...prev,
      sameAsAddress: checked,
      shippingAddress: checked ? prev.address : prev.shippingAddress,
    }));
  };

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Organization name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Organization name must be at least 2 characters';
    } else if (formData.name.trim().length > 200) {
      newErrors.name = 'Organization name cannot exceed 200 characters';
    }

    // Type validation
    if (!formData.type) {
      newErrors.type = 'Organization type is required';
    }

    // Email validation
    if (!formData.contactEmail.trim()) {
      newErrors.contactEmail = 'Contact email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.contactEmail.trim())) {
        newErrors.contactEmail = 'Please enter a valid email address';
      }
    }

    // Phone validation (optional)
    if (formData.contactPhone && formData.contactPhone.trim().length > 20) {
      newErrors.contactPhone = 'Phone number cannot exceed 20 characters';
    }

    // Address validation
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    } else if (formData.address.trim().length > 500) {
      newErrors.address = 'Address cannot exceed 500 characters';
    }

    // Shipping address validation
    if (!formData.sameAsAddress && formData.shippingAddress && formData.shippingAddress.trim().length > 500) {
      newErrors.shippingAddress = 'Shipping address cannot exceed 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setSubmitError(null);

      const organizationData = {
        name: formData.name.trim(),
        type: formData.type,
        contactEmail: formData.contactEmail.trim(),
        contactPhone: formData.contactPhone.trim() || undefined,
        address: formData.address.trim(),
        shippingAddress: formData.sameAsAddress ? undefined : formData.shippingAddress.trim() || undefined,
      };

      let savedOrganization: OrganizationDetails;

      if (isEditMode && organization) {
        // Update existing organization
        const updateData: UpdateOrganizationData = {};
        if (organizationData.name !== organization.name) updateData.name = organizationData.name;
        if (organizationData.type !== organization.type) updateData.type = organizationData.type;
        if (organizationData.contactEmail !== organization.contactEmail) updateData.contactEmail = organizationData.contactEmail;
        if (organizationData.contactPhone !== organization.contactPhone) updateData.contactPhone = organizationData.contactPhone;
        if (organizationData.address !== organization.address) updateData.address = organizationData.address;
        if (organizationData.shippingAddress !== organization.shippingAddress) updateData.shippingAddress = organizationData.shippingAddress;

        savedOrganization = await organizationService.updateOrganization(organization.id, updateData);
      } else {
        // Create new organization
        const createData: CreateOrganizationData = {
          name: organizationData.name,
          type: organizationData.type,
          contactEmail: organizationData.contactEmail,
          contactPhone: organizationData.contactPhone,
          address: organizationData.address,
          shippingAddress: organizationData.shippingAddress,
        };

        savedOrganization = await organizationService.createOrganization(createData);
      }

      onSave(savedOrganization);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An error occurred while saving the organization');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle dialog close
   */
  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { maxHeight: '90vh' }
      }}
    >
      <DialogTitle>
        <Typography variant="h6">{title}</Typography>
      </DialogTitle>

      <DialogContent dividers>
        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Basic Information
            </Typography>
          </Grid>

          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              label="Organization Name"
              value={formData.name}
              onChange={handleFieldChange('name')}
              error={Boolean(errors.name)}
              helperText={errors.name}
              placeholder="e.g., Lincoln High School Drama Department"
              disabled={loading}
              required
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <FormControl fullWidth error={Boolean(errors.type)} disabled={loading} required>
              <InputLabel>Organization Type</InputLabel>
              <Select
                value={formData.type}
                label="Organization Type"
                onChange={handleFieldChange('type')}
              >
                {organizationTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
              {errors.type && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                  {errors.type}
                </Typography>
              )}
            </FormControl>
          </Grid>

          {/* Contact Information */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Contact Information
            </Typography>
          </Grid>

          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              label="Contact Email"
              type="email"
              value={formData.contactEmail}
              onChange={handleFieldChange('contactEmail')}
              error={Boolean(errors.contactEmail)}
              helperText={errors.contactEmail}
              placeholder="contact@organization.com"
              disabled={loading}
              required
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Contact Phone"
              value={formData.contactPhone}
              onChange={handleFieldChange('contactPhone')}
              error={Boolean(errors.contactPhone)}
              helperText={errors.contactPhone}
              placeholder="(555) 123-4567"
              disabled={loading}
            />
          </Grid>

          {/* Address Information */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Address Information
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Billing Address"
              multiline
              rows={2}
              value={formData.address}
              onChange={handleFieldChange('address')}
              error={Boolean(errors.address)}
              helperText={errors.address}
              placeholder="123 Main Street, City, State, ZIP Code"
              disabled={loading}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.sameAsAddress}
                  onChange={handleSameAsAddressChange}
                  disabled={loading}
                />
              }
              label="Shipping address is the same as billing address"
            />
          </Grid>

          {!formData.sameAsAddress && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Shipping Address"
                multiline
                rows={2}
                value={formData.shippingAddress}
                onChange={handleFieldChange('shippingAddress')}
                error={Boolean(errors.shippingAddress)}
                helperText={errors.shippingAddress}
                placeholder="Different shipping address..."
                disabled={loading}
              />
            </Grid>
          )}

          {isEditMode && organization && (
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Organization Statistics
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Orders
                  </Typography>
                  <Typography variant="h6">{organization.totalOrders}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Active Orders
                  </Typography>
                  <Typography variant="h6">{organization.activeOrders}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Order Value
                  </Typography>
                  <Typography variant="h6">
                    ${organization.totalOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Typography>
                </Box>
                {organization.lastOrderDate && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Last Order Date
                    </Typography>
                    <Typography variant="h6">
                      {new Date(organization.lastOrderDate).toLocaleDateString()}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <LoadingButton
          onClick={handleSubmit}
          variant="contained"
          loading={loading}
          disabled={loading}
        >
          {isEditMode ? 'Save Changes' : 'Create Organization'}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};