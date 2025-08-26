import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NotificationPreferences } from '../../../src/components/profile/NotificationPreferences';
import { useNotificationStore } from '../../../src/stores/notificationStore';

// Mock the notification store
jest.mock('../../../src/stores/notificationStore');
const mockUseNotificationStore = useNotificationStore as jest.MockedFunction<typeof useNotificationStore>;

// Mock Material-UI components that might cause issues in tests
jest.mock('@mui/material', () => ({
  ...jest.requireActual('@mui/material'),
  CircularProgress: () => <div data-testid="loading-spinner">Loading...</div>,
}));

describe('NotificationPreferences', () => {
  const mockUserId = 'test-user-123';
  
  const mockStoreState = {
    preferences: {
      id: 'pref-123',
      userId: mockUserId,
      emailEnabled: true,
      milestonesJson: JSON.stringify([
        { type: 'MeasurementsDue', enabled: true, notifyBefore: 24 },
        { type: 'ProofApproval', enabled: true },
        { type: 'ProductionStart', enabled: false },
        { type: 'Shipping', enabled: true },
        { type: 'Delivery', enabled: true },
      ]),
      frequency: 'Immediate',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    history: [],
    loading: false,
    error: null,
    fetchPreferences: jest.fn(),
    updatePreferences: jest.fn(),
    fetchNotificationHistory: jest.fn(),
    clearError: jest.fn(),
    reset: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNotificationStore.mockReturnValue(mockStoreState);
  });

  describe('Component Rendering', () => {
    test('renders loading state correctly', () => {
      mockUseNotificationStore.mockReturnValue({
        ...mockStoreState,
        loading: true,
        preferences: null,
      });

      render(<NotificationPreferences userId={mockUserId} />);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    test('renders error state correctly', () => {
      const errorMessage = 'Failed to load preferences';
      mockUseNotificationStore.mockReturnValue({
        ...mockStoreState,
        loading: false,
        error: errorMessage,
        preferences: null,
      });

      render(<NotificationPreferences userId={mockUserId} />);
      
      expect(screen.getByText('Error Loading Preferences')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    test('renders preferences form correctly', () => {
      render(<NotificationPreferences userId={mockUserId} />);
      
      // Check main sections are present
      expect(screen.getByText('Email Notification Preferences')).toBeInTheDocument();
      expect(screen.getByText('Email Notifications')).toBeInTheDocument();
      expect(screen.getByText('Notification Frequency')).toBeInTheDocument();
      expect(screen.getByText('Milestone Notifications')).toBeInTheDocument();
    });

    test('displays current preference settings correctly', () => {
      render(<NotificationPreferences userId={mockUserId} />);
      
      // Check email toggle is on
      const emailSwitch = screen.getByRole('checkbox', { name: /Email Notifications/i });
      expect(emailSwitch).toBeChecked();
      
      // Check frequency selection
      const immediateRadio = screen.getByDisplayValue('Immediate');
      expect(immediateRadio).toBeChecked();
    });

    test('displays milestone preferences correctly', () => {
      render(<NotificationPreferences userId={mockUserId} />);
      
      // Check milestone switches
      expect(screen.getByText('Measurements Due')).toBeInTheDocument();
      expect(screen.getByText('Proof Approval')).toBeInTheDocument();
      expect(screen.getByText('Production Start')).toBeInTheDocument();
      expect(screen.getByText('Shipping')).toBeInTheDocument();
      expect(screen.getByText('Delivery')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    test('handles email toggle changes', async () => {
      render(<NotificationPreferences userId={mockUserId} />);
      
      const emailSwitch = screen.getByRole('checkbox', { name: /Email Notifications/i });
      
      fireEvent.click(emailSwitch);
      
      // Should show save button as enabled due to changes
      const saveButton = screen.getByRole('button', { name: /Save Preferences/i });
      expect(saveButton).not.toBeDisabled();
    });

    test('handles frequency changes', async () => {
      render(<NotificationPreferences userId={mockUserId} />);
      
      const dailyRadio = screen.getByDisplayValue('Daily');
      
      fireEvent.click(dailyRadio);
      
      // Should show save button as enabled due to changes
      const saveButton = screen.getByRole('button', { name: /Save Preferences/i });
      expect(saveButton).not.toBeDisabled();
    });

    test('handles milestone toggle changes', async () => {
      render(<NotificationPreferences userId={mockUserId} />);
      
      // Find milestone switches (need to be more specific due to multiple switches)
      const milestoneCards = screen.getAllByRole('checkbox').filter(
        checkbox => checkbox !== screen.getByRole('checkbox', { name: /Email Notifications/i })
      );
      
      // Toggle first milestone
      fireEvent.click(milestoneCards[0]);
      
      // Should show save button as enabled due to changes
      const saveButton = screen.getByRole('button', { name: /Save Preferences/i });
      expect(saveButton).not.toBeDisabled();
    });

    test('handles save preferences', async () => {
      const mockUpdatePreferences = jest.fn().mockResolvedValue(undefined);
      mockUseNotificationStore.mockReturnValue({
        ...mockStoreState,
        updatePreferences: mockUpdatePreferences,
      });

      render(<NotificationPreferences userId={mockUserId} />);
      
      // Make a change to enable save
      const emailSwitch = screen.getByRole('checkbox', { name: /Email Notifications/i });
      fireEvent.click(emailSwitch);
      
      // Click save
      const saveButton = screen.getByRole('button', { name: /Save Preferences/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockUpdatePreferences).toHaveBeenCalledWith(mockUserId, expect.any(Object));
      });
    });

    test('displays save success message', async () => {
      const mockUpdatePreferences = jest.fn().mockResolvedValue(undefined);
      mockUseNotificationStore.mockReturnValue({
        ...mockStoreState,
        updatePreferences: mockUpdatePreferences,
      });

      render(<NotificationPreferences userId={mockUserId} />);
      
      // Make a change and save
      const emailSwitch = screen.getByRole('checkbox', { name: /Email Notifications/i });
      fireEvent.click(emailSwitch);
      
      const saveButton = screen.getByRole('button', { name: /Save Preferences/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Notification preferences saved successfully!')).toBeInTheDocument();
      });
    });

    test('displays save error message', async () => {
      const mockUpdatePreferences = jest.fn().mockRejectedValue(new Error('Save failed'));
      mockUseNotificationStore.mockReturnValue({
        ...mockStoreState,
        updatePreferences: mockUpdatePreferences,
        error: 'Save failed',
      });

      render(<NotificationPreferences userId={mockUserId} />);
      
      // Make a change and save
      const emailSwitch = screen.getByRole('checkbox', { name: /Email Notifications/i });
      fireEvent.click(emailSwitch);
      
      const saveButton = screen.getByRole('button', { name: /Save Preferences/i });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to save preferences. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Preference Validation', () => {
    test('disables milestone settings when email is disabled', () => {
      mockUseNotificationStore.mockReturnValue({
        ...mockStoreState,
        preferences: {
          ...mockStoreState.preferences!,
          emailEnabled: false,
        },
      });

      render(<NotificationPreferences userId={mockUserId} />);
      
      // Frequency radio buttons should be disabled
      const immediateRadio = screen.getByDisplayValue('Immediate');
      expect(immediateRadio).toBeDisabled();
      
      const dailyRadio = screen.getByDisplayValue('Daily');
      expect(dailyRadio).toBeDisabled();
    });

    test('shows notify before input for measurements due milestone', () => {
      render(<NotificationPreferences userId={mockUserId} />);
      
      // Should show the hours input for measurements due
      const hoursInput = screen.getByLabelText('Notify before deadline');
      expect(hoursInput).toBeInTheDocument();
      expect(hoursInput).toHaveValue(24);
    });

    test('updates notify before hours correctly', async () => {
      render(<NotificationPreferences userId={mockUserId} />);
      
      const hoursInput = screen.getByLabelText('Notify before deadline');
      
      fireEvent.change(hoursInput, { target: { value: '48' } });
      
      expect(hoursInput).toHaveValue(48);
    });
  });

  describe('Component Lifecycle', () => {
    test('fetches preferences on mount', () => {
      const mockFetchPreferences = jest.fn();
      mockUseNotificationStore.mockReturnValue({
        ...mockStoreState,
        fetchPreferences: mockFetchPreferences,
      });

      render(<NotificationPreferences userId={mockUserId} />);
      
      expect(mockFetchPreferences).toHaveBeenCalledWith(mockUserId);
    });

    test('handles malformed milestones JSON gracefully', () => {
      mockUseNotificationStore.mockReturnValue({
        ...mockStoreState,
        preferences: {
          ...mockStoreState.preferences!,
          milestonesJson: 'invalid json',
        },
      });

      // Should not throw error and use default milestones
      expect(() => render(<NotificationPreferences userId={mockUserId} />)).not.toThrow();
      
      expect(screen.getByText('Measurements Due')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper form labels and structure', () => {
      render(<NotificationPreferences userId={mockUserId} />);
      
      // Check for proper heading structure
      expect(screen.getByRole('heading', { name: 'Email Notification Preferences' })).toBeInTheDocument();
      
      // Check for form elements with labels
      expect(screen.getByLabelText(/Email Notifications/i)).toBeInTheDocument();
      expect(screen.getByText('Notification Frequency')).toBeInTheDocument();
    });

    test('save button has proper disabled state', () => {
      render(<NotificationPreferences userId={mockUserId} />);
      
      const saveButton = screen.getByRole('button', { name: /Save Preferences/i });
      
      // Should be disabled initially (no changes)
      expect(saveButton).toBeDisabled();
    });
  });
});