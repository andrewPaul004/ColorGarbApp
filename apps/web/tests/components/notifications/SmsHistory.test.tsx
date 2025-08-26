import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { SmsHistory } from '../../../src/components/notifications/SmsHistory';

// Mock data for testing
const mockSmsHistory = [
  {
    id: '1',
    phoneNumber: '+15551234567',
    message: 'Order CG-2023-001 has shipped! Track: https://portal.colorgarb.com/orders/123 Reply STOP to opt out',
    status: 'delivered',
    createdAt: new Date('2023-08-26T10:00:00Z'),
    deliveredAt: new Date('2023-08-26T10:01:00Z'),
    cost: 0.0075,
    deliveryAttempts: 1
  },
  {
    id: '2',
    phoneNumber: '+15551234567',
    message: 'Payment due for order CG-2023-002. Pay now: https://portal.colorgarb.com/orders/456 Reply STOP to opt out',
    status: 'sent',
    createdAt: new Date('2023-08-25T15:30:00Z'),
    deliveredAt: null,
    cost: 0.0075,
    deliveryAttempts: 1
  },
  {
    id: '3',
    phoneNumber: '+15551234567',
    message: 'Urgent: Issue with order CG-2023-003. Details: https://portal.colorgarb.com/orders/789 Reply STOP to opt out',
    status: 'failed',
    createdAt: new Date('2023-08-24T09:15:00Z'),
    deliveredAt: null,
    cost: 0,
    deliveryAttempts: 3,
    errorMessage: 'Invalid destination number'
  }
];

// Helper to render with Material-UI theme
const renderWithTheme = (component: React.ReactElement) => {
  const theme = createTheme();
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('SmsHistory', () => {
  const defaultProps = {
    smsHistory: mockSmsHistory,
    loading: false,
    onLoadMore: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SMS History Display', () => {
    it('should render SMS history list', () => {
      renderWithTheme(<SmsHistory {...defaultProps} />);

      expect(screen.getByText('SMS Notification History')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });

    it('should display SMS details correctly', () => {
      renderWithTheme(<SmsHistory {...defaultProps} />);

      // Check first SMS (delivered)
      expect(screen.getByText('Order CG-2023-001 has shipped!')).toBeInTheDocument();
      expect(screen.getByText('delivered', { exact: false })).toBeInTheDocument();
      expect(screen.getByText('Aug 26, 2023 10:00 AM')).toBeInTheDocument();

      // Check second SMS (sent)
      expect(screen.getByText('Payment due for order CG-2023-002')).toBeInTheDocument();
      expect(screen.getByText('sent', { exact: false })).toBeInTheDocument();

      // Check third SMS (failed)
      expect(screen.getByText('Urgent: Issue with order CG-2023-003')).toBeInTheDocument();
      expect(screen.getByText('failed', { exact: false })).toBeInTheDocument();
    });

    it('should show delivery status with appropriate icons', () => {
      renderWithTheme(<SmsHistory {...defaultProps} />);

      // Look for status indicators - these would be rendered as chips or badges
      const deliveredStatus = screen.getByText((content, element) => 
        element?.textContent?.includes('delivered') ?? false
      );
      const sentStatus = screen.getByText((content, element) => 
        element?.textContent?.includes('sent') ?? false
      );
      const failedStatus = screen.getByText((content, element) => 
        element?.textContent?.includes('failed') ?? false
      );

      expect(deliveredStatus).toBeInTheDocument();
      expect(sentStatus).toBeInTheDocument();
      expect(failedStatus).toBeInTheDocument();
    });

    it('should display cost information', () => {
      renderWithTheme(<SmsHistory {...defaultProps} />);

      expect(screen.getByText('$0.01')).toBeInTheDocument(); // Delivered SMS cost
      expect(screen.getByText('$0.01')).toBeInTheDocument(); // Sent SMS cost  
      expect(screen.getByText('$0.00')).toBeInTheDocument(); // Failed SMS cost
    });
  });

  describe('Message Expansion', () => {
    it('should show truncated messages initially', () => {
      renderWithTheme(<SmsHistory {...defaultProps} />);

      // Long messages should be truncated
      expect(screen.getByText(/Order CG-2023-001 has shipped!/)).toBeInTheDocument();
      expect(screen.queryByText('https://portal.colorgarb.com/orders/123')).not.toBeInTheDocument();
    });

    it('should expand message on click', async () => {
      const user = userEvent.setup();
      renderWithTheme(<SmsHistory {...defaultProps} />);

      // Click on first message to expand
      const firstMessage = screen.getByText(/Order CG-2023-001 has shipped!/);
      await user.click(firstMessage);

      // Full message should now be visible
      expect(screen.getByText('https://portal.colorgarb.com/orders/123')).toBeInTheDocument();
      expect(screen.getByText('Reply STOP to opt out')).toBeInTheDocument();
    });

    it('should collapse expanded message on second click', async () => {
      const user = userEvent.setup();
      renderWithTheme(<SmsHistory {...defaultProps} />);

      const firstMessage = screen.getByText(/Order CG-2023-001 has shipped!/);
      
      // Expand
      await user.click(firstMessage);
      expect(screen.getByText('https://portal.colorgarb.com/orders/123')).toBeInTheDocument();
      
      // Collapse
      await user.click(firstMessage);
      expect(screen.queryByText('https://portal.colorgarb.com/orders/123')).not.toBeInTheDocument();
    });
  });

  describe('Error Display', () => {
    it('should show error message for failed SMS', async () => {
      const user = userEvent.setup();
      renderWithTheme(<SmsHistory {...defaultProps} />);

      // Click on failed message
      const failedMessage = screen.getByText(/Urgent: Issue with order CG-2023-003/);
      await user.click(failedMessage);

      expect(screen.getByText('Invalid destination number')).toBeInTheDocument();
      expect(screen.getByText('3 attempts')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      renderWithTheme(<SmsHistory {...defaultProps} loading={true} />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should show load more button when not loading', () => {
      renderWithTheme(<SmsHistory {...defaultProps} />);

      expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
    });

    it('should call onLoadMore when load more button is clicked', async () => {
      const user = userEvent.setup();
      renderWithTheme(<SmsHistory {...defaultProps} />);

      const loadMoreButton = screen.getByRole('button', { name: /load more/i });
      await user.click(loadMoreButton);

      expect(defaultProps.onLoadMore).toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no SMS history', () => {
      renderWithTheme(<SmsHistory {...defaultProps} smsHistory={[]} />);

      expect(screen.getByText(/no SMS notifications/i)).toBeInTheDocument();
      expect(screen.getByText(/SMS notifications will appear here/i)).toBeInTheDocument();
    });
  });

  describe('Phone Number Display', () => {
    it('should format phone numbers consistently', () => {
      renderWithTheme(<SmsHistory {...defaultProps} />);

      // All SMS should show the same formatted phone number
      const phoneNumbers = screen.getAllByText(/\(\d{3}\) \d{3}-\d{4}/);
      expect(phoneNumbers.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithTheme(<SmsHistory {...defaultProps} />);

      expect(screen.getByRole('list', { name: /SMS notification history/i })).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(3);
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithTheme(<SmsHistory {...defaultProps} />);

      const loadMoreButton = screen.getByRole('button', { name: /load more/i });
      
      // Should be focusable
      loadMoreButton.focus();
      expect(loadMoreButton).toHaveFocus();

      // Should activate on Enter
      await user.keyboard('{Enter}');
      expect(defaultProps.onLoadMore).toHaveBeenCalled();
    });
  });

  describe('Date Formatting', () => {
    it('should format dates consistently', () => {
      renderWithTheme(<SmsHistory {...defaultProps} />);

      expect(screen.getByText('Aug 26, 2023 10:00 AM')).toBeInTheDocument();
      expect(screen.getByText('Aug 25, 2023 3:30 PM')).toBeInTheDocument();
      expect(screen.getByText('Aug 24, 2023 9:15 AM')).toBeInTheDocument();
    });

    it('should show delivery time when available', () => {
      renderWithTheme(<SmsHistory {...defaultProps} />);

      // First SMS has delivery time
      expect(screen.getByText(/delivered.*10:01 AM/)).toBeInTheDocument();
    });
  });
});