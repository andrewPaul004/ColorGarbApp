import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { PhoneVerificationDialog } from '../../../src/components/notifications/PhoneVerificationDialog';
import { notificationService } from '../../../src/services/notificationService';

// Mock the notification service
jest.mock('../../../src/services/notificationService', () => ({
  notificationService: {
    sendPhoneVerification: jest.fn(),
    verifyPhone: jest.fn(),
  },
}));

const mockNotificationService = notificationService as jest.Mocked<typeof notificationService>;

// Helper to render with Material-UI theme
const renderWithTheme = (component: React.ReactElement) => {
  const theme = createTheme();
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('PhoneVerificationDialog', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    userId: '123e4567-e89b-12d3-a456-426614174000',
    onVerificationComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Step 1: Phone Number Entry', () => {
    it('should render phone number input step initially', () => {
      renderWithTheme(<PhoneVerificationDialog {...defaultProps} />);

      expect(screen.getByText('Enter Phone Number')).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
      expect(screen.getByText(/by providing your phone number/i)).toBeInTheDocument();
    });

    it('should format phone number input correctly', async () => {
      const user = userEvent.setup();
      renderWithTheme(<PhoneVerificationDialog {...defaultProps} />);

      const phoneInput = screen.getByLabelText(/phone number/i);
      
      await user.type(phoneInput, '5551234567');
      
      expect(phoneInput).toHaveValue('(555) 123-4567');
    });

    it('should show error for invalid phone number', async () => {
      const user = userEvent.setup();
      renderWithTheme(<PhoneVerificationDialog {...defaultProps} />);

      const phoneInput = screen.getByLabelText(/phone number/i);
      const nextButton = screen.getByRole('button', { name: /send code/i });

      await user.type(phoneInput, '123');
      await user.click(nextButton);

      expect(screen.getByText(/please enter a 10-digit phone number/i)).toBeInTheDocument();
    });

    it('should send verification code on valid phone number', async () => {
      const user = userEvent.setup();
      mockNotificationService.sendPhoneVerification.mockResolvedValueOnce({
        success: true,
        message: 'Verification code sent',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      });

      renderWithTheme(<PhoneVerificationDialog {...defaultProps} />);

      const phoneInput = screen.getByLabelText(/phone number/i);
      const nextButton = screen.getByRole('button', { name: /send code/i });

      await user.type(phoneInput, '5551234567');
      await user.click(nextButton);

      expect(mockNotificationService.sendPhoneVerification).toHaveBeenCalledWith('(555) 123-4567');
      
      await waitFor(() => {
        expect(screen.getByText('Verify Code')).toBeInTheDocument();
      });
    });

    it('should handle verification code sending error', async () => {
      const user = userEvent.setup();
      mockNotificationService.sendPhoneVerification.mockRejectedValueOnce(
        new Error('Rate limit exceeded')
      );

      renderWithTheme(<PhoneVerificationDialog {...defaultProps} />);

      const phoneInput = screen.getByLabelText(/phone number/i);
      const nextButton = screen.getByRole('button', { name: /send code/i });

      await user.type(phoneInput, '5551234567');
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
      });
    });
  });

  describe('Step 2: Code Verification', () => {
    beforeEach(async () => {
      mockNotificationService.sendPhoneVerification.mockResolvedValueOnce({
        success: true,
        message: 'Verification code sent',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      });
    });

    it('should advance to code verification step after sending code', async () => {
      const user = userEvent.setup();
      renderWithTheme(<PhoneVerificationDialog {...defaultProps} />);

      const phoneInput = screen.getByLabelText(/phone number/i);
      const nextButton = screen.getByRole('button', { name: /send code/i });

      await user.type(phoneInput, '5551234567');
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Verify Code')).toBeInTheDocument();
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
        expect(screen.getByText(/enter the 6-digit code/i)).toBeInTheDocument();
      });
    });

    it('should format verification code input correctly', async () => {
      const user = userEvent.setup();
      renderWithTheme(<PhoneVerificationDialog {...defaultProps} />);

      // Advance to code verification step
      const phoneInput = screen.getByLabelText(/phone number/i);
      const nextButton = screen.getByRole('button', { name: /send code/i });
      await user.type(phoneInput, '5551234567');
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      const codeInput = screen.getByLabelText(/verification code/i);
      await user.type(codeInput, '123456789'); // Should be limited to 6 digits

      expect(codeInput).toHaveValue('123456');
    });

    it('should verify phone number with valid code', async () => {
      const user = userEvent.setup();
      mockNotificationService.verifyPhone.mockResolvedValueOnce({
        success: true,
        phoneNumber: '+15551234567',
        verifiedAt: new Date()
      });

      renderWithTheme(<PhoneVerificationDialog {...defaultProps} />);

      // Advance to code verification step
      const phoneInput = screen.getByLabelText(/phone number/i);
      let nextButton = screen.getByRole('button', { name: /send code/i });
      await user.type(phoneInput, '5551234567');
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      // Enter and verify code
      const codeInput = screen.getByLabelText(/verification code/i);
      nextButton = screen.getByRole('button', { name: /verify/i });

      await user.type(codeInput, '123456');
      await user.click(nextButton);

      expect(mockNotificationService.verifyPhone).toHaveBeenCalledWith('123456');
      
      await waitFor(() => {
        expect(defaultProps.onVerificationComplete).toHaveBeenCalled();
      });
    });

    it('should handle invalid verification code', async () => {
      const user = userEvent.setup();
      mockNotificationService.verifyPhone.mockRejectedValueOnce(
        new Error('Invalid verification code')
      );

      renderWithTheme(<PhoneVerificationDialog {...defaultProps} />);

      // Advance to code verification step
      const phoneInput = screen.getByLabelText(/phone number/i);
      let nextButton = screen.getByRole('button', { name: /send code/i });
      await user.type(phoneInput, '5551234567');
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      // Enter invalid code
      const codeInput = screen.getByLabelText(/verification code/i);
      nextButton = screen.getByRole('button', { name: /verify/i });

      await user.type(codeInput, '000000');
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid verification code/i)).toBeInTheDocument();
      });
    });
  });

  describe('Dialog Controls', () => {
    it('should close dialog when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<PhoneVerificationDialog {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should reset dialog when closed and reopened', async () => {
      const { rerender } = renderWithTheme(
        <PhoneVerificationDialog {...defaultProps} open={false} />
      );

      // Reopen dialog
      rerender(
        <ThemeProvider theme={createTheme()}>
          <PhoneVerificationDialog {...defaultProps} open={true} />
        </ThemeProvider>
      );

      expect(screen.getByText('Enter Phone Number')).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toHaveValue('');
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner when sending verification code', async () => {
      const user = userEvent.setup();
      // Mock a delayed response
      mockNotificationService.sendPhoneVerification.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: true,
          message: 'Code sent',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        }), 100))
      );

      renderWithTheme(<PhoneVerificationDialog {...defaultProps} />);

      const phoneInput = screen.getByLabelText(/phone number/i);
      const nextButton = screen.getByRole('button', { name: /send code/i });

      await user.type(phoneInput, '5551234567');
      await user.click(nextButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should show loading spinner when verifying code', async () => {
      const user = userEvent.setup();
      mockNotificationService.sendPhoneVerification.mockResolvedValueOnce({
        success: true,
        message: 'Code sent',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      });
      
      // Mock a delayed verification response
      mockNotificationService.verifyPhone.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          success: true,
          phoneNumber: '+15551234567',
          verifiedAt: new Date()
        }), 100))
      );

      renderWithTheme(<PhoneVerificationDialog {...defaultProps} />);

      // Advance to verification step
      const phoneInput = screen.getByLabelText(/phone number/i);
      let nextButton = screen.getByRole('button', { name: /send code/i });
      await user.type(phoneInput, '5551234567');
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });

      // Start verification
      const codeInput = screen.getByLabelText(/verification code/i);
      nextButton = screen.getByRole('button', { name: /verify/i });
      await user.type(codeInput, '123456');
      await user.click(nextButton);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('TCPA Compliance', () => {
    it('should display TCPA compliance messaging', () => {
      renderWithTheme(<PhoneVerificationDialog {...defaultProps} />);

      expect(screen.getByText(/by providing your phone number/i)).toBeInTheDocument();
      expect(screen.getByText(/consent to receive SMS/i)).toBeInTheDocument();
      expect(screen.getByText(/reply STOP to opt out/i)).toBeInTheDocument();
    });
  });
});