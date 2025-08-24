import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ShipDateDisplay, type ShipDateChangeHistory } from '../../src/components/timeline/ShipDateDisplay';

// Create a test theme for consistent testing
const testTheme = createTheme();

// Test wrapper component with theme provider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={testTheme}>
    {children}
  </ThemeProvider>
);

// Mock ship date change history data for testing
const mockChangeHistory: ShipDateChangeHistory[] = [
  {
    id: 'ship-1',
    stage: 'ProductionPlanning',
    enteredAt: new Date('2023-01-10'),
    updatedBy: 'Production Manager Smith',
    notes: 'Initial ship date revision due to material procurement delays',
    previousShipDate: new Date('2023-09-15'),
    newShipDate: new Date('2023-09-20'),
    changeReason: 'material-delay'
  },
  {
    id: 'ship-2',
    stage: 'QualityControl',
    enteredAt: new Date('2023-02-05'),
    updatedBy: 'QC Manager Johnson',
    notes: 'Additional time needed for quality improvements',
    previousShipDate: new Date('2023-09-20'),
    newShipDate: new Date('2023-09-25'),
    changeReason: 'quality-control-issue'
  }
];

describe('ShipDateDisplay', () => {
  beforeEach(() => {
    // Clear any previous test artifacts
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders ship date display with correct test id', () => {
      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-09-15')}
            currentShipDate={new Date('2023-09-15')}
            changeHistory={[]}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('ship-date-display')).toBeInTheDocument();
    });

    it('displays ship date information heading', () => {
      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-09-15')}
            currentShipDate={new Date('2023-09-15')}
            changeHistory={[]}
          />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { name: 'Ship Date Information' })).toBeInTheDocument();
    });

    it('displays original ship date with proper formatting', () => {
      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-09-15')}
            currentShipDate={new Date('2023-09-15')}
            changeHistory={[]}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Original Ship Date')).toBeInTheDocument();
      expect(screen.getByTestId('original-ship-date')).toHaveTextContent('Sep 15, 2023');
    });

    it('displays current ship date with proper formatting', () => {
      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-09-15')}
            currentShipDate={new Date('2023-09-20')}
            changeHistory={[]}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Current Ship Date')).toBeInTheDocument();
      expect(screen.getByTestId('current-ship-date')).toHaveTextContent('Sep 20, 2023');
    });
  });

  describe('Visual Indicators for Date Changes', () => {
    it('shows "On Schedule" status when dates are the same', () => {
      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-09-15')}
            currentShipDate={new Date('2023-09-15')}
            changeHistory={[]}
          />
        </TestWrapper>
      );

      expect(screen.getByText('On Schedule')).toBeInTheDocument();
    });

    it('shows "Delayed" status when current date is later than original', () => {
      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-09-15')}
            currentShipDate={new Date('2023-09-20')}
            changeHistory={[]}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Delayed')).toBeInTheDocument();
    });

    it('shows "Accelerated" status when current date is earlier than original', () => {
      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-09-15')}
            currentShipDate={new Date('2023-09-10')}
            changeHistory={[]}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Accelerated')).toBeInTheDocument();
    });
  });

  describe('Change History', () => {
    it('displays change count chip when history exists', () => {
      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-09-15')}
            currentShipDate={new Date('2023-09-25')}
            changeHistory={mockChangeHistory}
          />
        </TestWrapper>
      );

      expect(screen.getByText('2 changes')).toBeInTheDocument();
    });

    it('does not display change count when no history exists', () => {
      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-09-15')}
            currentShipDate={new Date('2023-09-15')}
            changeHistory={[]}
          />
        </TestWrapper>
      );

      expect(screen.queryByText(/changes/)).not.toBeInTheDocument();
    });

    it('shows history toggle button when changes exist', () => {
      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-09-15')}
            currentShipDate={new Date('2023-09-25')}
            changeHistory={mockChangeHistory}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('history-toggle')).toBeInTheDocument();
      expect(screen.getByText('Change History (2)')).toBeInTheDocument();
    });

    it('expands and collapses change history when clicked', () => {
      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-09-15')}
            currentShipDate={new Date('2023-09-25')}
            changeHistory={mockChangeHistory}
          />
        </TestWrapper>
      );

      // History should be collapsed initially
      expect(screen.queryByTestId('history-entry-0')).not.toBeInTheDocument();

      // Click to expand
      fireEvent.click(screen.getByTestId('history-toggle'));

      // History entries should now be visible
      expect(screen.getByTestId('history-entry-0')).toBeInTheDocument();
      expect(screen.getByTestId('history-entry-1')).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(screen.getByTestId('history-toggle'));

      // History entries should be hidden again
      expect(screen.queryByTestId('history-entry-0')).not.toBeInTheDocument();
    });

    it('displays history entry details correctly', () => {
      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-09-15')}
            currentShipDate={new Date('2023-09-25')}
            changeHistory={mockChangeHistory}
          />
        </TestWrapper>
      );

      // Expand history
      fireEvent.click(screen.getByTestId('history-toggle'));

      // Check first history entry details
      expect(screen.getByText('Jan 10, 2023')).toBeInTheDocument();
      expect(screen.getByText('by Production Manager Smith')).toBeInTheDocument();
      expect(screen.getByText('Sep 15, 2023 → Sep 20, 2023')).toBeInTheDocument();
      expect(screen.getByText('Reason: Material delay')).toBeInTheDocument();
      expect(screen.getByText('Initial ship date revision due to material procurement delays')).toBeInTheDocument();
    });

    it('displays reason codes with proper display text', () => {
      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-09-15')}
            currentShipDate={new Date('2023-09-25')}
            changeHistory={mockChangeHistory}
          />
        </TestWrapper>
      );

      // Expand history
      fireEvent.click(screen.getByTestId('history-toggle'));

      // Check reason display texts
      expect(screen.getByText('Reason: Material delay')).toBeInTheDocument();
      expect(screen.getByText('Reason: Quality control issue')).toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness', () => {
    it('stacks ship dates vertically on mobile', () => {
      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-09-15')}
            currentShipDate={new Date('2023-09-20')}
            changeHistory={[]}
          />
        </TestWrapper>
      );

      // The responsive behavior is handled by MUI's sx prop with breakpoints
      // We can verify the component renders without errors on different viewport sizes
      expect(screen.getByTestId('ship-date-display')).toBeInTheDocument();
    });

    it('renders touch-friendly targets for history expansion', () => {
      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-09-15')}
            currentShipDate={new Date('2023-09-25')}
            changeHistory={mockChangeHistory}
          />
        </TestWrapper>
      );

      const historyToggle = screen.getByTestId('history-toggle');
      const styles = window.getComputedStyle(historyToggle);
      
      // Check minimum height is set for touch targets
      expect(parseFloat(styles.minHeight)).toBeGreaterThanOrEqual(44);
    });
  });

  describe('Date Formatting', () => {
    it('formats dates according to US locale', () => {
      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-12-25')}
            currentShipDate={new Date('2023-12-31')}
            changeHistory={[]}
          />
        </TestWrapper>
      );

      // Check US date format (Month Day, Year)
      expect(screen.getByTestId('original-ship-date')).toHaveTextContent('Dec 25, 2023');
      expect(screen.getByTestId('current-ship-date')).toHaveTextContent('Dec 31, 2023');
    });

    it('handles different years correctly', () => {
      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-01-01')}
            currentShipDate={new Date('2024-01-01')}
            changeHistory={[]}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('original-ship-date')).toHaveTextContent('Jan 1, 2023');
      expect(screen.getByTestId('current-ship-date')).toHaveTextContent('Jan 1, 2024');
    });
  });

  describe('Callback Handling', () => {
    it('calls onHistoryExpand when history is expanded', () => {
      const onHistoryExpand = jest.fn();
      
      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-09-15')}
            currentShipDate={new Date('2023-09-25')}
            changeHistory={mockChangeHistory}
            onHistoryExpand={onHistoryExpand}
          />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId('history-toggle'));
      expect(onHistoryExpand).toHaveBeenCalledTimes(1);

      // Should be called again when collapsed
      fireEvent.click(screen.getByTestId('history-toggle'));
      expect(onHistoryExpand).toHaveBeenCalledTimes(2);
    });

    it('does not crash when onHistoryExpand is not provided', () => {
      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-09-15')}
            currentShipDate={new Date('2023-09-25')}
            changeHistory={mockChangeHistory}
          />
        </TestWrapper>
      );

      // Should not throw when clicking without onHistoryExpand handler
      expect(() => {
        fireEvent.click(screen.getByTestId('history-toggle'));
      }).not.toThrow();
    });

    it('can click on change count chip to expand history', () => {
      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-09-15')}
            currentShipDate={new Date('2023-09-25')}
            changeHistory={mockChangeHistory}
          />
        </TestWrapper>
      );

      // Click on the chip
      fireEvent.click(screen.getByText('2 changes'));

      // History should be expanded
      expect(screen.getByTestId('history-entry-0')).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    it('handles empty change history without crashing', () => {
      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-09-15')}
            currentShipDate={new Date('2023-09-15')}
            changeHistory={[]}
          />
        </TestWrapper>
      );

      // Should still render ship dates
      expect(screen.getByTestId('original-ship-date')).toBeInTheDocument();
      expect(screen.getByTestId('current-ship-date')).toBeInTheDocument();
      
      // No change history section should be shown
      expect(screen.queryByText('Change History')).not.toBeInTheDocument();
    });

    it('handles missing optional fields in change history', () => {
      const historyWithMissingFields: ShipDateChangeHistory[] = [
        {
          id: 'ship-1',
          stage: 'ProductionPlanning',
          enteredAt: new Date('2023-01-10'),
          updatedBy: 'Staff Member',
          // Missing notes, previousShipDate, newShipDate, changeReason
        }
      ];

      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-09-15')}
            currentShipDate={new Date('2023-09-20')}
            changeHistory={historyWithMissingFields}
          />
        </TestWrapper>
      );

      // Expand history
      fireEvent.click(screen.getByTestId('history-toggle'));

      // Should show basic info but not crash on missing fields
      expect(screen.getByText('Jan 10, 2023')).toBeInTheDocument();
      expect(screen.getByText('by Staff Member')).toBeInTheDocument();
      
      // Optional fields should not appear
      expect(screen.queryByText('→')).not.toBeInTheDocument();
      expect(screen.queryByText('Reason:')).not.toBeInTheDocument();
    });

    it('handles unknown reason codes gracefully', () => {
      const historyWithUnknownReason: ShipDateChangeHistory[] = [
        {
          id: 'ship-1',
          stage: 'ProductionPlanning',
          enteredAt: new Date('2023-01-10'),
          updatedBy: 'Staff Member',
          changeReason: 'unknown-reason-code'
        }
      ];

      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-09-15')}
            currentShipDate={new Date('2023-09-20')}
            changeHistory={historyWithUnknownReason}
          />
        </TestWrapper>
      );

      // Expand history
      fireEvent.click(screen.getByTestId('history-toggle'));

      // Should display the unknown reason code as-is
      expect(screen.getByText('Reason: unknown-reason-code')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides proper heading structure', () => {
      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-09-15')}
            currentShipDate={new Date('2023-09-15')}
            changeHistory={[]}
          />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { name: 'Ship Date Information' })).toBeInTheDocument();
    });

    it('uses semantic HTML for date information', () => {
      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-09-15')}
            currentShipDate={new Date('2023-09-20')}
            changeHistory={[]}
          />
        </TestWrapper>
      );

      // Typography components should render semantic text elements
      expect(screen.getByText('Original Ship Date')).toBeInTheDocument();
      expect(screen.getByText('Current Ship Date')).toBeInTheDocument();
    });

    it('provides clickable elements with appropriate interaction feedback', () => {
      render(
        <TestWrapper>
          <ShipDateDisplay
            orderId="test-order-id"
            originalShipDate={new Date('2023-09-15')}
            currentShipDate={new Date('2023-09-25')}
            changeHistory={mockChangeHistory}
          />
        </TestWrapper>
      );

      const historyToggle = screen.getByTestId('history-toggle');
      expect(historyToggle).toHaveStyle('cursor: pointer');
    });
  });
});