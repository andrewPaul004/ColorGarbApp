import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, Typography, Box } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserRole } from '@colorgarb/shared';
import { useAppStore } from './stores/appStore';
import ProtectedRoute from './components/common/ProtectedRoute';
import RoleBasedNavigation from './components/common/RoleBasedNavigation';
import LoginPage from './pages/Auth/LoginPage';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/Auth/ResetPasswordPage';
import UserManagement from './pages/Admin/UserManagement';

/**
 * Material-UI theme configuration
 * Follows ColorGarb branding guidelines
 */
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2', // Blue primary color
    },
    secondary: {
      main: '#dc004e', // Accent color
    },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
});

/**
 * Dashboard component for Director and Finance users
 * @component
 * @returns {JSX.Element} Dashboard layout
 */
function Dashboard() {
  const { user } = useAppStore();

  return (
    <Box className="min-h-screen bg-gray-50">
      <RoleBasedNavigation />
      
      <Container maxWidth="lg" className="py-8">
        <Box className="text-center">
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome to ColorGarb
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Your costume manufacturing portal is ready.
          </Typography>
          {user && (
            <Typography variant="h6" color="primary" className="mt-4">
              Hello, {user.name} ({user.role})
            </Typography>
          )}
        </Box>
      </Container>
    </Box>
  );
}

/**
 * Admin Dashboard component for ColorGarb staff
 * @component
 * @returns {JSX.Element} Admin dashboard layout
 */
function AdminDashboard() {
  const { user } = useAppStore();

  return (
    <Box className="min-h-screen bg-gray-50">
      <RoleBasedNavigation />
      
      <Container maxWidth="lg" className="py-8">
        <Box className="text-center">
          <Typography variant="h4" component="h1" gutterBottom>
            ColorGarb Administration
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Manage orders, organizations, and users across the platform.
          </Typography>
          {user && (
            <Typography variant="h6" color="primary" className="mt-4">
              Hello, {user.name} ({user.role})
            </Typography>
          )}
        </Box>
      </Container>
    </Box>
  );
}

/**
 * Unauthorized access page
 * @component
 * @returns {JSX.Element} Unauthorized page
 */
function UnauthorizedPage() {
  return (
    <Box className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Container maxWidth="sm" className="text-center">
        <Typography variant="h4" component="h1" gutterBottom color="error">
          Access Denied
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          You don't have permission to access this resource.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please contact your administrator if you believe this is an error.
        </Typography>
      </Container>
    </Box>
  );
}

/**
 * Main application component with routing
 * Provides theme context and routing structure
 * 
 * @component
 * @returns {JSX.Element} Main application with routing
 */
function App() {
  const { isAuthenticated, initializeAuth } = useAppStore();
  
  // Initialize authentication state on app start
  React.useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Public routes */}
          <Route 
            path="/auth/login" 
            element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" replace />} 
          />
          <Route 
            path="/auth/forgot-password" 
            element={!isAuthenticated ? <ForgotPasswordPage /> : <Navigate to="/dashboard" replace />} 
          />
          <Route 
            path="/auth/reset-password" 
            element={!isAuthenticated ? <ResetPasswordPage /> : <Navigate to="/dashboard" replace />} 
          />
          
          {/* Protected routes for organization users (Director/Finance) */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute requiredRole={UserRole.Director}>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Protected routes for ColorGarb staff */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute requiredRole={UserRole.ColorGarbStaff}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute requiredRole={UserRole.ColorGarbStaff}>
                <UserManagement />
              </ProtectedRoute>
            } 
          />
          
          {/* Unauthorized access page */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          
          {/* Default redirect based on user role */}
          <Route 
            path="/" 
            element={<Navigate to={isAuthenticated ? "/dashboard" : "/auth/login"} replace />} 
          />
          
          {/* Catch all - redirect to appropriate page */}
          <Route 
            path="*" 
            element={<Navigate to={isAuthenticated ? "/dashboard" : "/auth/login"} replace />} 
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
