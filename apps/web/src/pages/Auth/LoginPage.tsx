/**
 * Login page component with email/password authentication.
 * Provides secure user login with Material-UI components and responsive design.
 * 
 * @component
 * @returns {JSX.Element} Mobile-responsive login form
 * 
 * @example
 * ```tsx
 * <LoginPage />
 * ```
 * 
 * @since 1.0.0
 */
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  Link,
  Divider
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import EmailIcon from '@mui/icons-material/Email';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';

interface LoginFormData {
  email: string;
  password: string;
}

export const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  const { login, isLoading, error: authError, clearError } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Use auth error from store or local error
  const displayError = authError || error;

  /**
   * Handles form field changes with validation
   * @param {React.ChangeEvent<HTMLInputElement>} event - Input change event
   */
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Only clear validation errors when user corrects the specific field
    // Don't clear server authentication errors automatically
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      handleSubmit(event as any);
    }
  };

  /**
   * Validates form data before submission
   * @param {LoginFormData} data - Form data to validate
   * @returns {string | null} Error message or null if valid
   */
  const validateForm = (data: LoginFormData): string | null => {
    if (!data.email.trim()) {
      return 'Email is required';
    }
    if (!data.password.trim()) {
      return 'Password is required';
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return 'Please enter a valid email address';
    }
    return null;
  };

  /**
   * Handles form submission with validation and error handling
   * @param {React.FormEvent} event - Form submission event
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const validationError = validateForm(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Clear any previous errors before new login attempt
    setError(null);
    clearError();

    try {
      await login(formData.email, formData.password);
      // Navigate based on user role after successful login
      const user = useAppStore.getState().user;
      if (user?.role === 'ColorGarbStaff') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      // Error is handled by the store, but we can add local handling if needed
      console.error('Login failed:', err);
    }
  };

  /**
   * Handles password reset navigation
   */
  const handleForgotPassword = () => {
    navigate('/auth/forgot-password');
  };

  return (
    <Container 
      component="main" 
      maxWidth="sm"
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
    >
      <Box className="w-full max-w-md space-y-8">
        {/* Header */}
        <Box className="text-center">
          <LockIcon className="mx-auto h-12 w-12 text-primary" />
          <Typography 
            component="h1" 
            variant="h4" 
            className="mt-6 text-center text-3xl font-extrabold text-gray-900"
          >
            ColorGarb Client Portal
          </Typography>
          <Typography 
            variant="body2" 
            className="mt-2 text-center text-sm text-gray-600"
          >
            Sign in to access your costume orders
          </Typography>
        </Box>

        {/* Login Form */}
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <Box className="space-y-6">
                {/* Error Alert */}
                {displayError && (
                  <Alert
                    severity="error"
                    className="w-full"
                    data-testid="login-error-alert"
                    onClose={() => {
                      setError(null);
                      clearError();
                    }}
                  >
                    {displayError}
                  </Alert>
                )}

                {/* Email Field */}
                <TextField
                  required
                  fullWidth
                  id="email"
                  name="email"
                  label="Email Address"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={formData.email}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  error={!!displayError && displayError.toLowerCase().includes('email')}
                  inputProps={{
                    'data-testid': 'email-input'
                  }}
                  InputProps={{
                    startAdornment: <EmailIcon className="mr-2 text-gray-400" />
                  }}
                  variant="outlined"
                  className="w-full"
                />

                {/* Password Field */}
                <TextField
                  required
                  fullWidth
                  id="password"
                  name="password"
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  error={!!displayError && displayError.toLowerCase().includes('password')}
                  inputProps={{
                    'data-testid': 'password-input'
                  }}
                  InputProps={{
                    startAdornment: <LockIcon className="mr-2 text-gray-400" />
                  }}
                  variant="outlined"
                  className="w-full"
                />

                {/* Submit Button */}
                <Button
                  type="button"
                  fullWidth
                  variant="contained"
                  disabled={isLoading}
                  onClick={handleSubmit}
                  data-testid="login-submit-button"
                  className="relative mt-6 w-full py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  {isLoading ? (
                    <>
                      <CircularProgress size={20} className="mr-2" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>

                {/* Divider */}
                <Divider className="my-6" />

                {/* Forgot Password Link */}
                <Box className="text-center">
                  <Link
                    component="button"
                    type="button"
                    variant="body2"
                    onClick={handleForgotPassword}
                    disabled={isLoading}
                    data-testid="forgot-password-link"
                    className="text-primary hover:text-primary-dark"
                  >
                    Forgot your password?
                  </Link>
                </Box>
              </Box>
          </CardContent>
        </Card>

        {/* Footer */}
        <Box className="text-center">
          <Typography variant="body2" color="textSecondary">
            Need help? Contact{' '}
            <Link href="mailto:support@colorgarb.com" className="text-primary">
              support@colorgarb.com
            </Link>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default LoginPage;