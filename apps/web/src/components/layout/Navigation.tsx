import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  useTheme,
  useMediaQuery,
  Chip,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  ListItemButton,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Receipt as OrdersIcon,
  AccountCircle as AccountIcon,
  ExitToApp as LogoutIcon,
  Settings as SettingsIcon,
  Business as OrganizationIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';

/**
 * Navigation menu item interface
 */
interface NavItem {
  label: string;
  path: string;
  icon: React.ReactElement;
  roles: string[];
  requiresOrganization: boolean;
}

/**
 * Responsive navigation component for the client portal.
 * Features mobile hamburger menu, role-based menu items, and user profile section.
 * Optimized for mobile devices with collapsible sidebar navigation.
 * 
 * @component
 * @returns {JSX.Element} Navigation component
 * 
 * @example
 * ```tsx
 * // Used in main layout
 * <Navigation />
 * ```
 * 
 * @since 1.0.0
 */
export const Navigation: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  
  const { user, logout } = useAppStore();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);

  /**
   * Gets navigation items based on user role
   * @returns Array of navigation items
   */
  const getNavigationItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
      {
        label: 'Dashboard',
        path: '/dashboard',
        icon: <DashboardIcon />,
        roles: ['Director', 'Finance'],
        requiresOrganization: true,
      },
      {
        label: 'Orders',
        path: '/orders',
        icon: <OrdersIcon />,
        roles: ['Director', 'Finance'],
        requiresOrganization: true,
      },
      {
        label: 'Organization',
        path: '/organization',
        icon: <OrganizationIcon />,
        roles: ['Director'],
        requiresOrganization: true,
      },
    ];

    // Filter items based on user role
    if (!user) return [];

    return baseItems.filter(item => 
      item.roles.includes(user.role) &&
      (!item.requiresOrganization || user.organizationId)
    );
  };

  /**
   * Handles mobile drawer toggle
   */
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  /**
   * Handles navigation to a route
   * @param path Route path to navigate to
   */
  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  /**
   * Handles profile menu open
   * @param event Click event
   */
  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileMenuAnchor(event.currentTarget);
  };

  /**
   * Handles profile menu close
   */
  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
  };

  /**
   * Handles user logout
   */
  const handleLogout = () => {
    logout();
    navigate('/auth/login');
    handleProfileMenuClose();
  };

  /**
   * Handles navigation to profile settings
   */
  const handleProfileSettings = () => {
    navigate('/profile');
    handleProfileMenuClose();
  };

  /**
   * Gets user initials for avatar
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
   * Checks if a path is currently active
   * @param path Route path to check
   * @returns True if path is active
   */
  const isActiveRoute = (path: string): boolean => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navigationItems = getNavigationItems();

  /**
   * Desktop navigation items
   */
  const DesktopNavItems = () => (
    <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
      {navigationItems.map((item) => (
        <Button
          key={item.path}
          color="inherit"
          startIcon={item.icon}
          onClick={() => handleNavigate(item.path)}
          sx={{
            px: 2,
            py: 1,
            borderRadius: 2,
            backgroundColor: isActiveRoute(item.path) ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            },
          }}
        >
          {item.label}
        </Button>
      ))}
    </Box>
  );

  /**
   * Mobile navigation drawer
   */
  const MobileDrawer = () => (
    <Drawer
      variant="temporary"
      anchor="left"
      open={mobileOpen}
      onClose={handleDrawerToggle}
      ModalProps={{
        keepMounted: true, // Better mobile performance
      }}
      sx={{
        display: { xs: 'block', md: 'none' },
        '& .MuiDrawer-paper': {
          boxSizing: 'border-box',
          width: 280,
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
          ColorGarb
        </Typography>
        {user && (
          <Typography variant="body2" color="text.secondary">
            {user.name}
          </Typography>
        )}
      </Box>
      <Divider />
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              onClick={() => handleNavigate(item.path)}
              selected={isActiveRoute(item.path)}
              sx={{
                borderRadius: 1,
                mx: 1,
                mb: 0.5,
                '&.Mui-selected': {
                  backgroundColor: 'primary.light',
                  color: 'primary.contrastText',
                  '&:hover': {
                    backgroundColor: 'primary.main',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: isActiveRoute(item.path) ? 'inherit' : 'inherit',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );

  if (!user) {
    return null;
  }

  return (
    <>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          {/* Mobile menu button */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Logo */}
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              flexGrow: { xs: 1, md: 0 },
              mr: 4,
              fontWeight: 700,
              letterSpacing: '-0.5px',
            }}
          >
            ColorGarb
          </Typography>

          {/* Desktop navigation */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            <DesktopNavItems />
          </Box>

          {/* User role indicator */}
          <Chip
            label={user.role}
            size="small"
            variant="outlined"
            sx={{
              color: 'white',
              borderColor: 'rgba(255, 255, 255, 0.5)',
              mr: 2,
              display: { xs: 'none', sm: 'flex' },
            }}
          />

          {/* User profile menu */}
          <Box>
            <IconButton
              onClick={handleProfileMenuOpen}
              color="inherit"
              aria-label="user account"
              aria-controls={Boolean(profileMenuAnchor) ? 'profile-menu' : undefined}
              aria-haspopup="true"
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  fontSize: '0.875rem',
                }}
              >
                {getUserInitials(user.name)}
              </Avatar>
            </IconButton>

            <Menu
              id="profile-menu"
              anchorEl={profileMenuAnchor}
              open={Boolean(profileMenuAnchor)}
              onClose={handleProfileMenuClose}
              onClick={handleProfileMenuClose}
              PaperProps={{
                elevation: 3,
                sx: {
                  minWidth: 220,
                  mt: 1.5,
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem disabled>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {user.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                  <Chip
                    label={user.role}
                    size="small"
                    variant="outlined"
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleProfileSettings}>
                <ListItemIcon>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                Profile Settings
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <MobileDrawer />
    </>
  );
};

export default Navigation;