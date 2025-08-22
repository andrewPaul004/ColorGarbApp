/**
 * Reset Password page component for confirming password reset.
 * Allows users to set a new password using a secure reset token.
 * 
 * @component
 * @returns {JSX.Element} Password reset confirmation form
 * 
 * @example
 * ```tsx
 * <ResetPasswordPage />
 * ```
 * 
 * @since 1.0.0
 */
import React, { useState, useEffect } from 'react';
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
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useSearchParams } from 'react-router-dom';
import authService from '../../services/authService';

interface ResetPasswordFormData {
  newPassword: string;
  confirmPassword: string;
}

export const ResetPasswordPage: React.FC = () => {
  const [formData, setFormData] = useState<ResetPasswordFormData>({
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  /**
   * Extract reset token from URL parameters on component mount
   */
  useEffect(() => {
    const resetToken = searchParams.get('token');
    if (!resetToken) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }
    setToken(resetToken);
  }, [searchParams]);

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
   * @param {ResetPasswordFormData} data - Form data to validate
   * @returns {string | null} Error message or null if valid
   */
  const validateForm = (data: ResetPasswordFormData): string | null => {
    if (!data.newPassword.trim()) {
      return 'New password is required';
    }
    
    if (data.newPassword.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    
    if (!data.confirmPassword.trim()) {
      return 'Please confirm your password';
    }
    
    if (data.newPassword !== data.confirmPassword) {
      return 'Passwords do not match';
    }
    
    // Basic password strength validation
    const hasUpperCase = /[A-Z]/.test(data.newPassword);
    const hasLowerCase = /[a-z]/.test(data.newPassword);
    const hasNumbers = /\d/.test(data.newPassword);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    
    return null;
  };

  /**
   * Handles form submission for password reset confirmation
   * @param {React.FormEvent} event - Form submission event
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!token) {
      setError('Invalid reset token. Please request a new password reset.');
      return;
    }
    
    const validationError = validateForm(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authService.confirmPasswordReset(token, formData.newPassword, formData.confirmPassword);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles navigation to login page after successful reset
   */
  const handleGoToLogin = () => {
    navigate('/auth/login');
  };

  /**
   * Handles requesting a new reset link
   */
  const handleRequestNewLink = () => {
    navigate('/auth/forgot-password');
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
            <CheckCircleIcon className="mx-auto h-12 w-12 text-success" />
            <Typography 
              component="h1" 
              variant="h4" 
              className="mt-6 text-center text-3xl font-extrabold text-gray-900"
            >
              Password Reset Successful
            </Typography>
          </Box>

          {/* Success Message */}
          <Card className="shadow-lg">
            <CardContent className="p-8">
              <Box className="text-center space-y-4">
                <Typography variant="body1" className="text-gray-700">
                  Your password has been successfully reset. You can now log in with your new password.
                </Typography>

                <Box className="mt-6">
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleGoToLogin}
                    className="py-3"
                  >
                    Continue to Login
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Container>
    );
  }

  if (!token) {
    return (
      <Container 
        component="main" 
        maxWidth="sm"
        className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      >
        <Box className="w-full max-w-md space-y-8">
          <Card className="shadow-lg">
            <CardContent className="p-8">
              <Box className="text-center space-y-4">
                <Alert severity="error">
                  Invalid or missing reset token. This link may have expired or been used already.
                </Alert>
                
                <Button
                  variant="contained"
                  onClick={handleRequestNewLink}
                  className="mt-4"
                >
                  Request New Reset Link
                </Button>
              </Box>
            </CardContent>
          </Card>
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
          <LockIcon className="mx-auto h-12 w-12 text-primary" />
          <Typography 
            component="h1" 
            variant="h4" 
            className="mt-6 text-center text-3xl font-extrabold text-gray-900"
          >
            Set New Password
          </Typography>
          <Typography 
            variant="body2" 
            className="mt-2 text-center text-sm text-gray-600"
          >
            Enter your new password below
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

                {/* New Password Field */}
                <TextField
                  required
                  fullWidth
                  id="newPassword"
                  name="newPassword"
                  label="New Password"
                  type="password"
                  autoComplete="new-password"
                  autoFocus
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  disabled={loading}
                  error={!!error && error.toLowerCase().includes('password')}
                  InputProps={{
                    startAdornment: <LockIcon className="mr-2 text-gray-400" />
                  }}
                  variant="outlined"
                  className="w-full"
                  helperText="Must be at least 8 characters with uppercase, lowercase, and numbers"
                />

                {/* Confirm Password Field */}
                <TextField
                  required
                  fullWidth
                  id="confirmPassword"
                  name="confirmPassword"
                  label="Confirm New Password"
                  type="password"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  disabled={loading}
                  error={!!error && (error.toLowerCase().includes('confirm') || error.toLowerCase().includes('match'))}
                  InputProps={{
                    startAdornment: <LockIcon className="mr-2 text-gray-400" />
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
                      Resetting Password...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>

                {/* Back to Login */}
                <Box className="text-center mt-4">
                  <Button
                    variant="text"
                    color="primary"
                    onClick={handleGoToLogin}
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

export default ResetPasswordPage;