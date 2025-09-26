import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Add as AddIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  Search,
} from '@mui/icons-material';
import { useAdminAccess } from '../../hooks/useAdminAccess';
import { OrganizationList } from '../../components/admin/OrganizationList';
import { OrganizationForm } from '../../components/admin/OrganizationForm';
import { BulkImportDialog } from '../../components/admin/BulkImportDialog';
import organizationService, { type Organization, type OrganizationDetails } from '../../services/organizationService';

/**
 * Organization Management page for ColorGarb staff to manage all organization records.
 * Features comprehensive organization CRUD operations, bulk import/export, and filtering.
 * Only accessible by users with ColorGarbStaff role.
 *
 * @component
 * @returns {JSX.Element} Organization management page component
 *
 * @since 2.5.0
 */
export const OrganizationManagement: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Admin access control
  const { hasAccess, reason } = useAdminAccess();

  // State management
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filteredOrganizations, setFilteredOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationDetails | null>(null);

  /**
   * Load organizations on component mount
   */
  useEffect(() => {
    if (hasAccess) {
      loadOrganizations();
    }
  }, [hasAccess]);

  /**
   * Apply filters when organizations or filter criteria change
   */
  useEffect(() => {
    applyFilters();
  }, [organizations, searchQuery, statusFilter, typeFilter]);

  /**
   * Auto-dismiss success messages after 5 seconds
   */
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  /**
   * Loads all organizations from the API
   */
  const loadOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await organizationService.getAllOrganizations();
      setOrganizations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Applies current filters to the organizations list
   */
  const applyFilters = () => {
    let filtered = [...organizations];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(org =>
        org.name.toLowerCase().includes(query) ||
        org.type.toLowerCase().includes(query) ||
        org.contactEmail.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(org => {
        const isActive = org.isActive !== false; // Default to active if undefined
        return statusFilter === 'active' ? isActive : !isActive;
      });
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(org => org.type === typeFilter);
    }

    setFilteredOrganizations(filtered);
  };

  /**
   * Get unique organization types for filter dropdown
   */
  const getOrganizationTypes = (): string[] => {
    const types = new Set(organizations.map(org => org.type));
    return Array.from(types).sort();
  };

  /**
   * Handle search input change
   */
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  /**
   * Handle status filter change
   */
  const handleStatusFilterChange = (event: SelectChangeEvent) => {
    setStatusFilter(event.target.value as 'all' | 'active' | 'inactive');
  };

  /**
   * Handle type filter change
   */
  const handleTypeFilterChange = (event: SelectChangeEvent) => {
    setTypeFilter(event.target.value);
  };

  /**
   * Handle create organization
   */
  const handleCreateOrganization = () => {
    setSelectedOrganization(null);
    setCreateDialogOpen(true);
  };

  /**
   * Handle edit organization
   */
  const handleEditOrganization = async (id: string) => {
    try {
      const details = await organizationService.getOrganizationDetails(id);
      setSelectedOrganization(details);
      setEditDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organization details');
    }
  };

  /**
   * Handle organization created/updated
   */
  const handleOrganizationSaved = (organization: OrganizationDetails) => {
    setCreateDialogOpen(false);
    setEditDialogOpen(false);
    setSelectedOrganization(null);
    setSuccessMessage(`Organization "${organization.name}" ${createDialogOpen ? 'created' : 'updated'} successfully`);
    loadOrganizations(); // Refresh the list
  };

  /**
   * Handle organization deactivated
   */
  const handleOrganizationDeactivated = (organizationName: string) => {
    setSuccessMessage(`Organization "${organizationName}" deactivated successfully`);
    loadOrganizations(); // Refresh the list
  };

  /**
   * Handle bulk import
   */
  const handleBulkImport = () => {
    setBulkImportDialogOpen(true);
  };

  /**
   * Handle bulk import completed
   */
  const handleBulkImportCompleted = (successCount: number) => {
    setBulkImportDialogOpen(false);
    setSuccessMessage(`Bulk import completed: ${successCount} organizations imported successfully`);
    loadOrganizations(); // Refresh the list
  };

  /**
   * Handle export organizations
   */
  const handleExportOrganizations = async () => {
    try {
      const blob = await organizationService.exportOrganizations(statusFilter === 'all');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `organizations_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMessage('Organizations exported successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export organizations');
    }
  };

  /**
   * Clear error message
   */
  const clearError = () => {
    setError(null);
  };

  /**
   * Clear success message
   */
  const clearSuccessMessage = () => {
    setSuccessMessage(null);
  };

  // Access control check
  if (!hasAccess) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error">
          {reason || 'You do not have permission to access organization management.'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
            Organization Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage client organizations, bulk operations, and export functionality
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<ImportIcon />}
            onClick={handleBulkImport}
            size={isMobile ? 'small' : 'medium'}
          >
            Bulk Import
          </Button>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExportOrganizations}
            size={isMobile ? 'small' : 'medium'}
          >
            Export CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateOrganization}
            size={isMobile ? 'small' : 'medium'}
          >
            {isMobile ? 'Create' : 'Create Organization'}
          </Button>
        </Box>
      </Box>

      {/* Success/Error Messages */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={clearSuccessMessage}>
          {successMessage}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={handleStatusFilterChange}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={typeFilter}
                label="Type"
                onChange={handleTypeFilterChange}
              >
                <MenuItem value="all">All Types</MenuItem>
                {getOrganizationTypes().map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredOrganizations.length} of {organizations.length} organizations
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Organizations List */}
      {!loading && (
        <OrganizationList
          organizations={filteredOrganizations}
          onEdit={handleEditOrganization}
          onDeactivate={handleOrganizationDeactivated}
          onError={setError}
        />
      )}

      {/* Create Organization Dialog */}
      <OrganizationForm
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSave={handleOrganizationSaved}
        title="Create Organization"
      />

      {/* Edit Organization Dialog */}
      <OrganizationForm
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onSave={handleOrganizationSaved}
        organization={selectedOrganization}
        title="Edit Organization"
      />

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={bulkImportDialogOpen}
        onClose={() => setBulkImportDialogOpen(false)}
        onImportCompleted={handleBulkImportCompleted}
        onError={setError}
      />
    </Container>
  );
};

export default OrganizationManagement;