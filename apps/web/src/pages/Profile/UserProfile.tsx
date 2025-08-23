import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  Alert,
  Divider,
  Avatar,
  Chip,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import {
  Edit as EditIcon,
  ExitToApp as LogoutIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
  Business as OrganizationIcon,
} from '@mui/icons-material';
import { useAppStore } from '../../stores/appStore';
import { useNavigate } from 'react-router-dom';

/**
 * User profile page displaying account information and organization details.
 * Includes logout functionality with session cleanup and basic account information display.
 * Features responsive layout optimized for mobile and desktop viewing.
 * 
 * @component
 * @returns {JSX.Element} User profile page component
 * 
 * @example
 * ```tsx
 * // Used in routing configuration
 * <Route path="/profile" element={<UserProfile />} />
 * ```
 * 
 * @since 1.0.0
 */
export const UserProfile: React.FC = () => {
  const { user, logout, organization } = useAppStore();
  const navigate = useNavigate();

  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  /**
   * Gets user initials for avatar display
   * @param name User's full name
   * @returns User initials
   */
  const getUserInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  /**
   * Gets role display name and description
   * @param role User role
   * @returns Role display information
   */
  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'Director':
        return {
          name: 'Director',
          description: 'Full access to organization data and operations',
          color: 'primary' as const,
        };
      case 'Finance':
        return {
          name: 'Finance User',
          description: 'Access to financial and payment operations',
          color: 'secondary' as const,
        };
      case 'ColorGarbStaff':
        return {
          name: 'ColorGarb Staff',
          description: 'Cross-organization order management access',
          color: 'success' as const,
        };
      default:
        return {
          name: role,
          description: 'Standard user access',
          color: 'default' as const,
        };
    }
  };

  /**
   * Handles logout confirmation dialog open
   */
  const handleLogoutClick = () => {
    setLogoutDialogOpen(true);
  };

  /**
   * Handles logout confirmation dialog close
   */
  const handleLogoutCancel = () => {
    setLogoutDialogOpen(false);
  };

  /**
   * Handles user logout with session cleanup
   */
  const handleLogoutConfirm = () => {
    setLogoutDialogOpen(false);
    logout();
    navigate('/auth/login');
  };

  /**
   * Handles edit mode toggle
   */
  const handleEditToggle = () => {
    if (editMode) {
      // Reset form data on cancel
      setFormData({
        name: user?.name || '',
        email: user?.email || '',
      });
    }
    setEditMode(!editMode);
  };

  /**
   * Handles form input changes
   * @param event Input change event
   */
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Handles form submission (placeholder for future implementation)
   * @param event Form submit event
   */
  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // TODO: Implement profile update API call
    console.log('Profile update:', formData);
    setEditMode(false);
  };

  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="error">
          User not found. Please log in again.
        </Alert>
      </Container>
    );
  }

  const roleInfo = getRoleInfo(user.role);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
          User Profile
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your account information and settings
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* User Information Card */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <PersonIcon color="primary" />
                  <Typography variant="h6" component="h2">
                    Account Information
                  </Typography>
                </Box>
                <IconButton
                  onClick={handleEditToggle}
                  color="primary"
                  aria-label={editMode ? 'cancel edit' : 'edit profile'}
                >
                  <EditIcon />
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    backgroundColor: 'primary.main',
                    fontSize: '1.5rem',
                  }}
                >
                  {getUserInitials(user.name)}
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    {user.name}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                    {user.email}
                  </Typography>
                  <Chip
                    label={roleInfo.name}
                    color={roleInfo.color}
                    size="small"
                    icon={<SecurityIcon />}
                  />
                </Box>
              </Box>

              {editMode ? (
                <Box component="form" onSubmit={handleFormSubmit} sx={{ mt: 3 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Full Name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Email Address"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        variant="outlined"
                        disabled // Email changes typically require verification
                      />
                    </Grid>
                  </Grid>
                  <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                    <Button type="submit" variant="contained" color="primary">
                      Save Changes
                    </Button>
                    <Button onClick={handleEditToggle} variant="outlined">
                      Cancel
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ mt: 3 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Full Name
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {user.name}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Email Address
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {user.email}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        Role Description
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {roleInfo.description}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Organization Details Card */}
        {user.organizationId && (
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <OrganizationIcon color="primary" />
                  <Typography variant="h6" component="h2">
                    Organization
                  </Typography>
                </Box>

                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <Avatar
                    sx={{
                      width: 60,
                      height: 60,
                      backgroundColor: 'secondary.main',
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    <OrganizationIcon />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {organization?.name || 'Organization Name'}
                  </Typography>
                  <Chip
                    label={organization?.type || 'Organization'}
                    size="small"
                    variant="outlined"
                    sx={{ mt: 1, textTransform: 'capitalize' }}
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Organization ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 2 }}>
                    {user.organizationId}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    Contact Email
                  </Typography>
                  <Typography variant="body2">
                    {organization?.contactEmail || 'Not available'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Actions Card */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" component="h2" sx={{ mb: 3 }}>
                Account Actions
              </Typography>

              <Alert severity="info" sx={{ mb: 3 }}>
                Logging out will end your current session and you will need to log in again to access your account.
              </Alert>

              <Button
                variant="contained"
                color="error"
                startIcon={<LogoutIcon />}
                onClick={handleLogoutClick}
                size="large"
              >
                Logout
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={logoutDialogOpen}
        onClose={handleLogoutCancel}
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
      >
        <DialogTitle id="logout-dialog-title">
          Confirm Logout
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="logout-dialog-description">
            Are you sure you want to log out? You will need to enter your credentials again to access your account.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLogoutCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={handleLogoutConfirm} color="error" variant="contained">
            Logout
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserProfile;