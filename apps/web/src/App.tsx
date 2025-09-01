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
import { OrderDetail } from './pages/OrderDetail/OrderDetail';
import OrdersList from './pages/Orders/OrdersList';
import UserProfile from './pages/Profile/UserProfile';
import UserManagement from './pages/Admin/UserManagement';
import AdminDashboard from './pages/Admin/AdminDashboard';

// Placeholder components for new routes
const OrganizationPage = () => <div style={{padding: '20px'}}><h1>Organization Management</h1><p>Coming soon...</p></div>;
const AdminOrganizationsPage = () => <div style={{padding: '20px'}}><h1>Organizations Management</h1><p>Coming soon...</p></div>;
const AdminSystemSettingsPage = () => <div style={{padding: '20px'}}><h1>System Settings</h1><p>Coming soon...</p></div>;

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
  const { isAuthenticated, user, initializeAuth } = useAppStore();
  
  // Get default route based on user role
  const getDefaultRoute = () => {
    if (!isAuthenticated) return "/auth/login";
    if (user?.role === "ColorGarbStaff") return "/admin/dashboard";
    return "/dashboard";
  };
  
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
            element={!isAuthenticated ? <LoginPage /> : <Navigate to={getDefaultRoute()} replace />} 
          />
          <Route 
            path="/auth/forgot-password" 
            element={!isAuthenticated ? <ForgotPasswordPage /> : <Navigate to={getDefaultRoute()} replace />} 
          />
          <Route 
            path="/auth/reset-password" 
            element={!isAuthenticated ? <ResetPasswordPage /> : <Navigate to={getDefaultRoute()} replace />} 
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
            path="/profile" 
            element={
              <ProtectedRoute>
                <Layout>
                  <UserProfile />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          {/* Order routes */}
          <Route 
            path="/orders" 
            element={
              <ProtectedRoute>
                <Layout>
                  <OrdersList />
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
          
          {/* Admin routes */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminDashboard />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
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
          
          <Route 
            path="/admin/organizations" 
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminOrganizationsPage />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/admin/settings" 
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminSystemSettingsPage />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/organization" 
            element={
              <ProtectedRoute>
                <Layout>
                  <OrganizationPage />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          {/* Default redirect based on authentication */}
          <Route 
            path="/" 
            element={<Navigate to={getDefaultRoute()} replace />} 
          />
          
          {/* Catch all - redirect to appropriate page */}
          <Route 
            path="*" 
            element={<Navigate to={getDefaultRoute()} replace />} 
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
