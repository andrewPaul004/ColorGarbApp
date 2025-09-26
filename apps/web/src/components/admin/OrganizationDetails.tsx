import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Business,
  Email,
  Phone,
  LocationOn,
  LocalShipping,
  Assignment,
  TrendingUp,
  Schedule,
  CheckCircle,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import organizationService, { type OrganizationDetails as OrganizationDetailsType } from '../../services/organizationService';

/**
 * Props for OrganizationDetails component
 */
interface OrganizationDetailsProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Organization ID to display details for */
  organizationId: string | null;
  /** Callback when edit is requested */
  onEdit?: (id: string) => void;
}

/**
 * Organization details component for viewing comprehensive organization information.
 * Features organization statistics, order history, and contact information.
 *
 * @component
 * @param {OrganizationDetailsProps} props - Component props
 * @returns {JSX.Element} Organization details dialog component
 *
 * @example
 * ```tsx
 * <OrganizationDetails
 *   open={isOpen}
 *   onClose={handleClose}
 *   organizationId="12345"
 *   onEdit={handleEdit}
 * />
 * ```
 *
 * @since 2.5.0
 */
export const OrganizationDetails: React.FC<OrganizationDetailsProps> = ({
  open,
  onClose,
  organizationId,
  onEdit,
}) => {
  // State management
  const [organization, setOrganization] = useState<OrganizationDetailsType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load organization details when dialog opens or organizationId changes
   */
  useEffect(() => {
    if (open && organizationId) {
      loadOrganizationDetails();
    }
  }, [open, organizationId]);

  /**
   * Load organization details from the API
   */
  const loadOrganizationDetails = async () => {
    if (!organizationId) return;

    try {
      setLoading(true);
      setError(null);
      const details = await organizationService.getOrganizationDetails(organizationId);
      setOrganization(details);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organization details');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle edit organization
   */
  const handleEdit = () => {
    if (organization && onEdit) {
      onEdit(organization.id);
      onClose();
    }
  };

  /**
   * Get organization type display label
   */
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      school: 'School',
      theater: 'Theater',
      dance_company: 'Dance Company',
      other: 'Other',
    };
    return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  /**
   * Get organization type color
   */
  const getTypeColor = (type: string) => {
    const colors: Record<string, 'primary' | 'secondary' | 'success' | 'default'> = {
      school: 'primary',
      theater: 'secondary',
      dance_company: 'success',
      other: 'default',
    };
    return colors[type] || 'default';
  };

  /**
   * Format currency amount
   */
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  /**
   * Format date
   */
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        formatted: date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        relative: formatDistanceToNow(date, { addSuffix: true }),
      };
    } catch {
      return { formatted: 'Invalid date', relative: '' };
    }
  };

  /**
   * Get status chip props
   */
  const getStatusChip = (isActive?: boolean) => {
    const active = isActive !== false; // Default to active if undefined
    return {
      label: active ? 'Active' : 'Inactive',
      color: active ? 'success' : 'default' as const,
      icon: active ? <CheckCircle /> : undefined,
    };
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { maxHeight: '90vh' }
      }}
    >
      <DialogTitle>
        <Typography variant="h6">Organization Details</Typography>
      </DialogTitle>

      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {organization && !loading && (
          <Box>
            {/* Header Information */}
            <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Business sx={{ fontSize: 32, mr: 2 }} />
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    {organization.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Chip
                      label={getTypeLabel(organization.type)}
                      color={getTypeColor(organization.type)}
                      size="small"
                    />
                    <Chip
                      {...getStatusChip(organization.isActive)}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </Box>
              </Box>
            </Paper>

            <Grid container spacing={3}>
              {/* Contact Information */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Contact Information
                </Typography>
                <List>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon>
                      <Email color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Email Address"
                      secondary={organization.contactEmail}
                    />
                  </ListItem>
                  {organization.contactPhone && (
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon>
                        <Phone color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Phone Number"
                        secondary={organization.contactPhone}
                      />
                    </ListItem>
                  )}
                </List>
              </Grid>

              {/* Statistics */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Order Statistics
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Assignment color="primary" sx={{ fontSize: 28, mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {organization.totalOrders}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Orders
                    </Typography>
                  </Paper>

                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <CheckCircle color="success" sx={{ fontSize: 28, mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 600, color: 'success.main' }}>
                      {organization.activeOrders}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Orders
                    </Typography>
                  </Paper>

                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <TrendingUp color="info" sx={{ fontSize: 28, mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {formatCurrency(organization.totalOrderValue)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Value
                    </Typography>
                  </Paper>

                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Schedule color="secondary" sx={{ fontSize: 28, mb: 1 }} />
                    <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {organization.lastOrderDate
                        ? formatDate(organization.lastOrderDate).formatted
                        : 'No Orders'
                      }
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Last Order
                    </Typography>
                  </Paper>
                </Box>
              </Grid>

              {/* Address Information */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Address Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <LocationOn color="primary" sx={{ mr: 1 }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          Billing Address
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {organization.address}
                      </Typography>
                    </Paper>
                  </Grid>

                  {organization.shippingAddress && (
                    <Grid item xs={12} md={6}>
                      <Paper sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <LocalShipping color="primary" sx={{ mr: 1 }} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            Shipping Address
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {organization.shippingAddress}
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </Grid>

              {/* Metadata */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Organization History
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Created
                    </Typography>
                    <Typography variant="body1">
                      {organization.createdAt
                        ? formatDate(organization.createdAt).formatted
                        : 'Unknown'
                      }
                    </Typography>
                    {organization.createdAt && (
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(organization.createdAt).relative}
                      </Typography>
                    )}
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Last Updated
                    </Typography>
                    <Typography variant="body1">
                      {organization.updatedAt
                        ? formatDate(organization.updatedAt).formatted
                        : 'Unknown'
                      }
                    </Typography>
                    {organization.updatedAt && (
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(organization.updatedAt).relative}
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>
          Close
        </Button>
        {organization && onEdit && (
          <Button onClick={handleEdit} variant="contained">
            Edit Organization
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};