import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Stack,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material';
import {
  MoreVert,
  Edit,
  Visibility,
  Business,
  Delete as DeleteIcon,
  Email,
  Phone,
  LocationOn,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import organizationService, { type Organization } from '../../services/organizationService';

/**
 * Props for OrganizationList component
 */
interface OrganizationListProps {
  /** Array of organizations to display */
  organizations: Organization[];
  /** Callback when an organization is selected for editing */
  onEdit: (id: string) => void;
  /** Callback when an organization is deactivated */
  onDeactivate: (organizationName: string) => void;
  /** Callback when an error occurs */
  onError: (error: string) => void;
}

/**
 * Organization List component with advanced filtering, actions, and responsive design.
 * Features comprehensive organization display with statistics and management actions.
 *
 * @component
 * @param {OrganizationListProps} props - Component props
 * @returns {JSX.Element} Organization list component
 *
 * @example
 * ```tsx
 * <OrganizationList
 *   organizations={organizations}
 *   onEdit={handleEdit}
 *   onDeactivate={handleDeactivate}
 *   onError={handleError}
 * />
 * ```
 *
 * @since 2.5.0
 */
export const OrganizationList: React.FC<OrganizationListProps> = ({
  organizations,
  onEdit,
  onDeactivate,
  onError,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State management
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  /**
   * Handle page change in pagination
   */
  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  /**
   * Handle rows per page change
   */
  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  /**
   * Handle action menu open
   */
  const handleActionMenuOpen = (event: React.MouseEvent<HTMLElement>, organization: Organization) => {
    setAnchorEl(event.currentTarget);
    setSelectedOrganization(organization);
  };

  /**
   * Handle action menu close
   */
  const handleActionMenuClose = () => {
    setAnchorEl(null);
    setSelectedOrganization(null);
  };

  /**
   * Handle view organization details
   */
  const handleViewDetails = () => {
    if (selectedOrganization) {
      onEdit(selectedOrganization.id);
    }
    handleActionMenuClose();
  };

  /**
   * Handle edit organization
   */
  const handleEdit = () => {
    if (selectedOrganization) {
      onEdit(selectedOrganization.id);
    }
    handleActionMenuClose();
  };

  /**
   * Handle deactivate organization confirmation
   */
  const handleDeactivateConfirm = () => {
    setDeactivateDialogOpen(true);
    handleActionMenuClose();
  };

  /**
   * Handle organization deactivation
   */
  const handleDeactivate = async () => {
    if (!selectedOrganization) return;

    try {
      setDeactivating(true);
      await organizationService.deactivateOrganization(selectedOrganization.id);
      onDeactivate(selectedOrganization.name);
      setDeactivateDialogOpen(false);
      setSelectedOrganization(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to deactivate organization');
    } finally {
      setDeactivating(false);
    }
  };

  /**
   * Cancel deactivation
   */
  const handleCancelDeactivate = () => {
    setDeactivateDialogOpen(false);
    setSelectedOrganization(null);
  };

  /**
   * Get organization type color
   */
  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      school: 'primary',
      theater: 'secondary',
      dance_company: 'success',
      other: 'default',
    };
    return colors[type] || 'default';
  };

  /**
   * Format creation date
   */
  const formatCreatedDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Invalid date';
    }
  };

  /**
   * Get status chip color and label
   */
  const getStatusChip = (isActive?: boolean) => {
    const active = isActive !== false; // Default to active if undefined
    return {
      label: active ? 'Active' : 'Inactive',
      color: active ? 'success' : 'default' as const,
    };
  };

  // Calculate pagination
  const paginatedOrganizations = organizations.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (organizations.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Business sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
          No Organizations Found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No organizations match your current filters. Try adjusting your search criteria or create a new organization.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Organization
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Type
                  </Typography>
                </TableCell>
                {!isMobile && (
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Contact
                    </Typography>
                  </TableCell>
                )}
                <TableCell align="center">
                  <Typography variant="subtitle2" fontWeight="bold">
                    Status
                  </Typography>
                </TableCell>
                {!isMobile && (
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Created
                    </Typography>
                  </TableCell>
                )}
                <TableCell align="center">
                  <Typography variant="subtitle2" fontWeight="bold">
                    Actions
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedOrganizations.map((organization) => {
                const statusChip = getStatusChip(organization.isActive);

                return (
                  <TableRow key={organization.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <Business />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {organization.name}
                          </Typography>
                          {isMobile && (
                            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                <Email sx={{ fontSize: 12, mr: 0.5 }} />
                                {organization.contactEmail}
                              </Typography>
                            </Stack>
                          )}
                          {organization.address && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                              <LocationOn sx={{ fontSize: 12, mr: 0.5 }} />
                              {organization.address.length > 50 ? `${organization.address.substring(0, 50)}...` : organization.address}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={organization.type.replace('_', ' ').toUpperCase()}
                        color={getTypeColor(organization.type) as 'primary' | 'secondary' | 'success' | 'default'}
                        variant="outlined"
                      />
                    </TableCell>

                    {!isMobile && (
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                            <Email sx={{ fontSize: 14, mr: 1, color: 'text.secondary' }} />
                            {organization.contactEmail}
                          </Typography>
                          {organization.contactPhone && (
                            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                              <Phone sx={{ fontSize: 14, mr: 1 }} />
                              {organization.contactPhone}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                    )}

                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={statusChip.label}
                        color={statusChip.color}
                        variant={statusChip.color === 'success' ? 'filled' : 'outlined'}
                      />
                    </TableCell>

                    {!isMobile && (
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatCreatedDate(organization.createdAt)}
                        </Typography>
                      </TableCell>
                    )}

                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={(event) => handleActionMenuOpen(event, organization)}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={organizations.length}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Organizations per page"
        />
      </Paper>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleActionMenuClose}
        PaperProps={{
          sx: { minWidth: 180 }
        }}
      >
        <MenuItem onClick={handleViewDetails}>
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={handleDeactivateConfirm}
          disabled={selectedOrganization?.isActive === false}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Deactivate</ListItemText>
        </MenuItem>
      </Menu>

      {/* Deactivate Confirmation Dialog */}
      <Dialog
        open={deactivateDialogOpen}
        onClose={handleCancelDeactivate}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Organization Deactivation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to deactivate "{selectedOrganization?.name}"?
            This will make the organization inactive but preserve all historical data.
            Organizations with active orders cannot be deactivated.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDeactivate} disabled={deactivating}>
            Cancel
          </Button>
          <Button
            onClick={handleDeactivate}
            color="error"
            variant="contained"
            disabled={deactivating}
          >
            {deactivating ? 'Deactivating...' : 'Deactivate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};