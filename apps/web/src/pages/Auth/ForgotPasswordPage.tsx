/**
 * Forgot Password page component for initiating password reset.
 * Provides secure password reset request with user-friendly interface.
 * 
 * @component
 * @returns {JSX.Element} Password reset request form
 * 
 * @example
 * ```tsx
 * <ForgotPasswordPage />
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
  Link
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';

interface ForgotPasswordFormData {
  email: string;
}

export const ForgotPasswordPage: React.FC = () => {
  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

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
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  /**
   * Validates form data before submission
   * @param {ForgotPasswordFormData} data - Form data to validate
   * @returns {string | null} Error message or null if valid
   */
  const validateForm = (data: ForgotPasswordFormData): string | null => {
    if (!data.email.trim()) {
      return 'Email is required';
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return 'Please enter a valid email address';
    }
    
    return null;
  };

  /**
   * Handles form submission for password reset request
   * @param {React.FormEvent} event - Form submission event
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    const validationError = validateForm(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authService.requestPasswordReset(formData.email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles navigation back to login page
   */
  const handleBackToLogin = () => {
    navigate('/auth/login');
  };

  if (success) {
    return (
      <Container 
        component="main" 
        maxWidth="sm"
        className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      >
        <Box className="w-full max-w-md space-y-8">
          {/* Header */}
          <Box className="text-center">
            <EmailIcon className="mx-auto h-12 w-12 text-success" />
            <Typography 
              component="h1" 
              variant="h4" 
              className="mt-6 text-center text-3xl font-extrabold text-gray-900"
            >
              Check Your Email
            </Typography>
          </Box>

          {/* Success Message */}
          <Card className="shadow-lg">
            <CardContent className="p-8">
              <Box className="text-center space-y-4">
                <Typography variant="body1" className="text-gray-700">
                  If an account with the email <strong>{formData.email}</strong> exists, 
                  you will receive a password reset link shortly.
                </Typography>
                
                <Typography variant="body2" color="textSecondary">
                  Please check your email and follow the instructions to reset your password.
                </Typography>

                <Box className="mt-6">
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<ArrowBackIcon />}
                    onClick={handleBackToLogin}
                    className="py-3"
                  >
                    Back to Login
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Footer */}
          <Box className="text-center">
            <Typography variant="body2" color="textSecondary">
              Didn't receive the email? Check your spam folder or{' '}
              <Link 
                component="button" 
                variant="body2" 
                onClick={() => setSuccess(false)}
                className="text-primary"
              >
                try again
              </Link>
            </Typography>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container 
      component="main" 
      maxWidth="sm"
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
    >
      <Box className="w-full max-w-md space-y-8">
        {/* Header */}
        <Box className="text-center">
          <EmailIcon className="mx-auto h-12 w-12 text-primary" />
          <Typography 
            component="h1" 
            variant="h4" 
            className="mt-6 text-center text-3xl font-extrabold text-gray-900"
          >
            Reset Your Password
          </Typography>
          <Typography 
            variant="body2" 
            className="mt-2 text-center text-sm text-gray-600"
          >
            Enter your email address and we'll send you a reset link
          </Typography>
        </Box>

        {/* Reset Form */}
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} noValidate>
              <Box className="space-y-6">
                {/* Error Alert */}
                {error && (
                  <Alert 
                    severity="error" 
                    className="w-full"
                    onClose={() => setError(null)}
                  >
                    {error}
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
                  disabled={loading}
                  error={!!error && error.toLowerCase().includes('email')}
                  InputProps={{
                    startAdornment: <EmailIcon className="mr-2 text-gray-400" />
                  }}
                  variant="outlined"
                  className="w-full"
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  className="relative mt-6 w-full py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  {loading ? (
                    <>
                      <CircularProgress size={20} className="mr-2" />
                      Sending Reset Link...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>

                {/* Back to Login */}
                <Box className="text-center mt-4">
                  <Button
                    variant="text"
                    color="primary"
                    onClick={handleBackToLogin}
                    disabled={loading}
                    startIcon={<ArrowBackIcon />}
                    className="text-primary hover:text-primary-dark"
                  >
                    Back to Login
                  </Button>
                </Box>
              </Box>
            </form>
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

export default ForgotPasswordPage;