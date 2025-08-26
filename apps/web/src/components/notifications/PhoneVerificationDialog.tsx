import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  Step,
  Stepper,
  StepLabel,
} from '@mui/material';
import {
  Phone as PhoneIcon,
  Sms as SmsIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { notificationService } from '../../services/notificationService';

interface PhoneVerificationDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onVerificationComplete: () => void;
}

const steps = ['Enter Phone Number', 'Verify Code'];

/**
 * PhoneVerificationDialog provides a two-step process for SMS opt-in verification.
 * Step 1: Enter and validate phone number, send verification code
 * Step 2: Enter verification code to complete phone number verification
 * 
 * Features:
 * - Phone number formatting and validation
 * - Verification code sending with rate limiting
 * - Code input with automatic formatting
 * - Error handling and user feedback
 * - TCPA compliance messaging
 * 
 * @since 3.2.0
 */
export const PhoneVerificationDialog: React.FC<PhoneVerificationDialogProps> = ({
  open,
  onClose,
  userId,
  onVerificationComplete,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /**
   * Handles phone number input changes with formatting
   */
  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/\D/g, ''); // Remove non-digits
    let formatted = value;

    // Format as (XXX) XXX-XXXX for US numbers
    if (value.length >= 6) {
      formatted = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
    } else if (value.length >= 3) {
      formatted = `(${value.slice(0, 3)}) ${value.slice(3)}`;
    }

    setPhoneNumber(formatted);
    setError(null);
  };

  /**
   * Handles verification code input with formatting
   */
  const handleCodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/\D/g, '').slice(0, 6); // Max 6 digits
    setVerificationCode(value);
    setError(null);
  };

  /**
   * Validates phone number format
   */
  const validatePhoneNumber = (phone: string): { isValid: boolean; error?: string } => {
    const cleaned = phone.replace(/\D/g, '');
    
    if (!cleaned) {
      return { isValid: false, error: 'Phone number is required' };
    }
    
    if (cleaned.length !== 10) {
      return { isValid: false, error: 'Please enter a 10-digit phone number' };
    }
    
    if (cleaned[0] === '0' || cleaned[0] === '1') {
      return { isValid: false, error: 'Phone number cannot start with 0 or 1' };
    }
    
    return { isValid: true };
  };

  /**
   * Sends verification code to the entered phone number
   */
  const handleSendCode = async () => {
    const validation = validatePhoneNumber(phoneNumber);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid phone number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Convert to E.164 format
      const cleaned = phoneNumber.replace(/\D/g, '');
      const e164Number = `+1${cleaned}`;

      await notificationService.sendPhoneVerification(userId, e164Number);
      
      setSuccess('Verification code sent to your phone!');
      setActiveStep(1);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verifies the entered verification code
   */
  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await notificationService.verifyPhoneNumber(userId, verificationCode);
      
      setSuccess('Phone number verified successfully!');
      onVerificationComplete();
      
      // Close dialog after showing success message
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to verify phone number');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles dialog close and resets state
   */
  const handleClose = () => {
    setActiveStep(0);
    setPhoneNumber('');
    setVerificationCode('');
    setError(null);
    setSuccess(null);
    setLoading(false);
    onClose();
  };

  /**
   * Goes back to previous step
   */
  const handleBack = () => {
    setActiveStep(0);
    setVerificationCode('');
    setError(null);
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <PhoneIcon color="primary" />
          <Box>
            <Typography variant="h6">
              SMS Notification Setup
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Verify your phone number to receive SMS notifications
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Step 1: Phone Number Entry */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Enter your phone number to receive a verification code via SMS.
            </Typography>
            
            <TextField
              fullWidth
              label="Phone Number"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder="(555) 123-4567"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneIcon color="action" />
                  </InputAdornment>
                ),
              }}
              inputProps={{
                maxLength: 14, // Formatted length
              }}
              sx={{ mb: 2 }}
            />

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Message and data rates may apply.</strong> By providing your phone number, 
                you consent to receive SMS notifications from ColorGarb. You can opt out at any time 
                by replying "STOP" to any message.
              </Typography>
            </Alert>
          </Box>
        )}

        {/* Step 2: Verification Code Entry */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Enter the 6-digit code we sent to {phoneNumber}
            </Typography>
            
            <TextField
              fullWidth
              label="Verification Code"
              value={verificationCode}
              onChange={handleCodeChange}
              placeholder="123456"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SmsIcon color="action" />
                  </InputAdornment>
                ),
              }}
              inputProps={{
                maxLength: 6,
                style: { textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.5em' }
              }}
              sx={{ mb: 2 }}
            />

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Didn't receive the code? Check your messages or try again with a different number.
            </Typography>
          </Box>
        )}

        {/* Success Message */}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />}>
            <Typography>{success}</Typography>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography>{error}</Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        
        {activeStep === 1 && (
          <Button onClick={handleBack} disabled={loading}>
            Back
          </Button>
        )}
        
        <Button
          variant="contained"
          onClick={activeStep === 0 ? handleSendCode : handleVerifyCode}
          disabled={loading || (activeStep === 0 ? !phoneNumber : verificationCode.length !== 6)}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Please wait...' : activeStep === 0 ? 'Send Code' : 'Verify'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PhoneVerificationDialog;