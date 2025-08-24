import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Edit,
  PersonAdd,
  Block,
  CheckCircle,
  AdminPanelSettings,
  Business,
  AccountBalance
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
} from '@mui/icons-material';
import { UserRole, type User, RoleUtils } from '../../../../../packages/shared/src/types/user';
import RoleBasedNavigation from '../../components/common/RoleBasedNavigation';
import useRolePermissions from '../../hooks/useRolePermissions';

/**
 * Mock user data - in real app this would come from API
 */
const mockUsers: User[] = [
  {
    id: '1',
    email: 'director@lincolnhigh.edu',
    name: 'Jane Smith',
    role: UserRole.Director,
    organizationId: '11111111-1111-1111-1111-111111111111',
    isActive: true,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  },
  {
    id: '2',
    email: 'finance@lincolnhigh.edu',
    name: 'John Doe',
    role: UserRole.Finance,
    organizationId: '11111111-1111-1111-1111-111111111111',
    isActive: true,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  },
  {
    id: '3',
    email: 'admin@colorgarb.com',
    name: 'Admin User',
    role: UserRole.ColorGarbStaff,
    isActive: true,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z')
  }
];

/**
 * Role icon mapping
 */
const getRoleIcon = (role: UserRole) => {
  switch (role) {
    case UserRole.Director:
      return <Business />;
    case UserRole.Finance:
      return <AccountBalance />;
    case UserRole.ColorGarbStaff:
      return <AdminPanelSettings />;
    default:
      return <Business />;
  }
};

/**
 * Role color mapping
 */
const getRoleColor = (role: UserRole): 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
  switch (role) {
    case UserRole.Director:
      return 'primary';
    case UserRole.Finance:
      return 'info';
    case UserRole.ColorGarbStaff:
      return 'error';
    default:
      return 'secondary';
  }
};

/**
 * UserManagement component for managing user roles and permissions.
 * Only accessible by ColorGarb staff members.
 * 
 * @component
 * @returns {JSX.Element} User management interface
 * 
 * @since 1.0.0
 */
export const UserManagement: React.FC = () => {
  const { isColorGarbStaff, canPerformAction } = useRolePermissions();
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>(UserRole.Director);
  const [error, setError] = useState<string | null>(null);

  // Check if user can manage other users
  const canManageUsers = canPerformAction('manage_all_organizations').hasPermission;

  if (!isColorGarbStaff || !canManageUsers) {
    return (
      <Container maxWidth="lg" className="py-8">
        <Alert severity="error">
          You don't have permission to access user management.
        </Alert>
      </Container>
    );
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setEditDialogOpen(true);
    setError(null);
  };

  const handleSaveUserRole = async () => {
    if (!selectedUser) return;

    try {
      // In real app, this would call API
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === selectedUser.id
            ? { ...user, role: newRole, updatedAt: new Date() }
            : user
        )
      );

      setEditDialogOpen(false);
      setSelectedUser(null);
      setError(null);
    } catch {
      setError('Failed to update user role');
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      // In real app, this would call API
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === user.id
            ? { ...u, isActive: !u.isActive, updatedAt: new Date() }
            : u
        )
      );
    } catch {
      setError('Failed to toggle user status');
    }
  };

  const handleCloseDialog = () => {
    setEditDialogOpen(false);
    setSelectedUser(null);
    setError(null);
  };

  return (
    <Box className="min-h-screen bg-gray-50">
      <RoleBasedNavigation />
      
      <Container maxWidth="lg" className="py-8">
        <Box className="mb-6">
          <Typography variant="h4" component="h1" gutterBottom>
            User Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage user roles and permissions across the platform
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" className="mb-4" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Organization</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Updated</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Box className="flex items-center gap-2">
                        {getRoleIcon(user.role)}
                        {user.name}
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        icon={getRoleIcon(user.role)}
                        label={RoleUtils.getRoleInfo(user.role).name}
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {user.organizationId ? (
                        <Chip label="Lincoln High School" size="small" variant="outlined" />
                      ) : (
                        <Chip label="ColorGarb" size="small" color="error" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={user.isActive ? <CheckCircle /> : <Block />}
                        label={user.isActive ? 'Active' : 'Inactive'}
                        color={user.isActive ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(user.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="center">
                      <Box className="flex gap-1">
                        <Tooltip title="Edit Role">
                          <IconButton
                            size="small"
                            onClick={() => handleEditUser(user)}
                            color="primary"
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={user.isActive ? 'Deactivate User' : 'Activate User'}>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleUserStatus(user)}
                            color={user.isActive ? 'error' : 'success'}
                          >
                            {user.isActive ? <Block /> : <CheckCircle />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Box className="mt-4">
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => {/* Handle add user */}}
          >
            Add New User
          </Button>
        </Box>
      </Container>

      {/* Edit User Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Edit User Role: {selectedUser?.name}
        </DialogTitle>
        <DialogContent>
          <Box className="pt-4">
            <TextField
              label="Email"
              value={selectedUser?.email || ''}
              disabled
              fullWidth
              className="mb-4"
            />
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                label="Role"
              >
                {RoleUtils.getAllRoles().map((role: UserRole) => (
                  <MenuItem key={role} value={role}>
                    <Box className="flex items-center gap-2">
                      {getRoleIcon(role)}
                      {RoleUtils.getRoleInfo(role).name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {newRole && (
              <Typography variant="body2" color="text.secondary" className="mt-2">
                {RoleUtils.getRoleInfo(newRole).description}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSaveUserRole}
            variant="contained"
            disabled={!selectedUser || newRole === selectedUser.role}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;