import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, Typography, Box, AppBar, Toolbar } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './stores/appStore';
import LoginPage from './pages/Auth/LoginPage';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/Auth/ResetPasswordPage';

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
 * Dashboard component for authenticated users
 * @component
 * @returns {JSX.Element} Dashboard layout
 */
function Dashboard() {
  const { user } = useAppStore();

  return (
    <Box className="min-h-screen bg-gray-50">
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            ColorGarb Client Portal
          </Typography>
          {user && (
            <Typography variant="body2">
              Welcome, {user.name}
            </Typography>
          )}
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" className="py-8">
        <Box className="text-center">
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome to ColorGarb
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Your costume manufacturing portal is ready. This is the development environment.
          </Typography>
        </Box>
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
          
          {/* Protected routes */}
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/auth/login" replace />} 
          />
          
          {/* Default redirect */}
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
