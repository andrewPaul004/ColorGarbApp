import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './stores/appStore';
import colorGarbTheme from './theme/colorGarbTheme';
import ProtectedRoute from './components/common/ProtectedRoute';
import Navigation from './components/layout/Navigation';
import LoginPage from './pages/Auth/LoginPage';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/Auth/ResetPasswordPage';
import Dashboard from './pages/Dashboard/Dashboard';
import OrderDetail from './pages/OrderDetail/OrderDetail';
import UserProfile from './pages/Profile/UserProfile';
import UserManagement from './pages/Admin/UserManagement';

/**
 * Layout component that provides consistent navigation and structure
 * @param children React children to render within the layout
 * @returns {JSX.Element} Layout with navigation
 */
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Navigation />
      {children}
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
  }, []); // Empty dependency array - only run once on mount

  return (
    <ThemeProvider theme={colorGarbTheme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Public routes - no navigation */}
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
          
          {/* Protected routes with layout */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/orders/:orderId" 
            element={
              <ProtectedRoute>
                <Layout>
                  <OrderDetail />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Layout>
                  <UserProfile />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          {/* Admin routes */}
          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute>
                <Layout>
                  <UserManagement />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          {/* Default redirect based on authentication */}
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
