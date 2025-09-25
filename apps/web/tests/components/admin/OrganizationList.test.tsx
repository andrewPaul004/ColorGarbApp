import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { OrganizationList } from '../../../src/components/admin/OrganizationList';
import colorGarbTheme from '../../../src/theme/colorGarbTheme';

// Mock organization data
const mockOrganizations = [
  {
    id: '1',
    name: 'Lincoln High School Drama',
    type: 'school',
    contactEmail: 'drama@lincolnhigh.edu',
    contactPhone: '(555) 123-4567',
    address: '123 School St, Lincoln, NE 68508',
    shippingAddress: '456 Shipping Ave, Lincoln, NE 68508',
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
    totalOrders: 5,
    activeOrders: 2,
    totalOrderValue: 12500.00,
    lastOrderDate: '2024-01-18T09:15:00Z'
  },
  {
    id: '2',
    name: 'Theater Company NYC',
    type: 'theater',
    contactEmail: 'info@theaternyc.com',
    contactPhone: '(212) 555-0123',
    address: '789 Broadway, New York, NY 10013',
    shippingAddress: null,
    isActive: true,
    createdAt: '2024-01-10T08:30:00Z',
    updatedAt: '2024-01-19T16:45:00Z',
    totalOrders: 3,
    activeOrders: 1,
    totalOrderValue: 8750.00,
    lastOrderDate: '2024-01-16T11:20:00Z'
  },
  {
    id: '3',
    name: 'Inactive Dance Company',
    type: 'dance_company',
    contactEmail: 'contact@inactive.com',
    contactPhone: null,
    address: '999 Inactive St, Nowhere, XX 00000',
    shippingAddress: null,
    isActive: false,
    createdAt: '2023-12-01T12:00:00Z',
    updatedAt: '2023-12-15T10:00:00Z',
    totalOrders: 0,
    activeOrders: 0,
    totalOrderValue: 0,
    lastOrderDate: null
  }
];

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={colorGarbTheme}>
    {children}
  </ThemeProvider>
);

// Mock useMediaQuery for responsive testing
const mockUseMediaQuery = jest.fn();
jest.mock('@mui/material', () => ({
  ...jest.requireActual('@mui/material'),
  useMediaQuery: () => mockUseMediaQuery()
}));

describe('OrganizationList', () => {
  const mockOnEdit = jest.fn();
  const mockOnDeactivate = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMediaQuery.mockReturnValue(false); // Desktop by default
  });

  const renderList = (organizations = mockOrganizations) => {
    return render(
      <TestWrapper>
        <OrganizationList
          organizations={organizations}
          onEdit={mockOnEdit}
          onDeactivate={mockOnDeactivate}
          onError={mockOnError}
        />
      </TestWrapper>
    );
  };

  describe('Table Rendering', () => {
    it('renders table with all organizations', () => {
      renderList();

      // Check for table presence
      expect(screen.getByRole('table')).toBeInTheDocument();

      // Check for all organizations
      expect(screen.getByText('Lincoln High School Drama')).toBeInTheDocument();
      expect(screen.getByText('Theater Company NYC')).toBeInTheDocument();
      expect(screen.getByText('Inactive Dance Company')).toBeInTheDocument();
    });

    it('renders table headers', () => {
      renderList();

      expect(screen.getByText('Organization')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Contact')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('displays organization information correctly', () => {
      renderList();

      // Check organization details
      expect(screen.getByText('Lincoln High School Drama')).toBeInTheDocument();
      expect(screen.getByText('SCHOOL')).toBeInTheDocument();
      expect(screen.getByText('drama@lincolnhigh.edu')).toBeInTheDocument();
      expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('displays organization addresses correctly', () => {
      renderList();

      // Should show truncated address for long addresses
      expect(screen.getByText(/123 School St, Lincoln, NE 68508/)).toBeInTheDocument();
    });

    it('handles organizations without phone numbers', () => {
      renderList();

      // Inactive Dance Company has no phone
      const inactiveOrgRow = screen.getByText('Inactive Dance Company').closest('tr');
      expect(inactiveOrgRow).toBeInTheDocument();

      // Should not crash and should display other contact info
      expect(screen.getByText('contact@inactive.com')).toBeInTheDocument();
    });

    it('displays organization types with proper formatting', () => {
      renderList();

      expect(screen.getByText('SCHOOL')).toBeInTheDocument();
      expect(screen.getByText('THEATER')).toBeInTheDocument();
      expect(screen.getByText('DANCE COMPANY')).toBeInTheDocument();
    });

    it('displays status chips with correct colors', () => {
      renderList();

      const activeChips = screen.getAllByText('Active');
      const inactiveChips = screen.getAllByText('Inactive');

      expect(activeChips).toHaveLength(2);
      expect(inactiveChips).toHaveLength(1);

      // Check that status chips have appropriate styling
      activeChips.forEach(chip => {
        expect(chip.closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess');
      });
    });

    it('formats creation dates correctly', () => {
      renderList();

      // Should show relative time format
      expect(screen.getByText(/ago/)).toBeInTheDocument();
    });

    it('truncates long addresses with ellipsis', () => {
      const orgWithLongAddress = {
        ...mockOrganizations[0],
        address: 'This is a very long address that should be truncated because it exceeds the 50 character limit for display purposes'
      };

      renderList([orgWithLongAddress]);

      expect(screen.getByText(/This is a very long address that should be trunca.../)).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    const manyOrganizations = Array.from({ length: 100 }, (_, i) => ({
      ...mockOrganizations[0],
      id: `org-${i}`,
      name: `Organization ${i + 1}`,
      contactEmail: `org${i + 1}@test.com`
    }));

    it('renders pagination controls', () => {
      renderList(manyOrganizations);

      expect(screen.getByText('Organizations per page')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go to next page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go to previous page/i })).toBeInTheDocument();
    });

    it('shows correct page information', () => {
      renderList(manyOrganizations);

      expect(screen.getByText(/1–25 of 100/)).toBeInTheDocument();
    });

    it('changes page when next button is clicked', async () => {
      renderList(manyOrganizations);

      const nextButton = screen.getByRole('button', { name: /go to next page/i });
      await userEvent.click(nextButton);

      // Should show different organizations on page 2
      expect(screen.getByText('Organization 26')).toBeInTheDocument();
      expect(screen.getByText(/26–50 of 100/)).toBeInTheDocument();
    });

    it('changes rows per page', async () => {
      renderList(manyOrganizations);

      // Open rows per page dropdown
      const rowsPerPageSelect = screen.getByDisplayValue('25');
      await userEvent.click(rowsPerPageSelect);

      // Select 50 rows per page
      await userEvent.click(screen.getByText('50'));

      await waitFor(() => {
        expect(screen.getByText(/1–50 of 100/)).toBeInTheDocument();
      });
    });

    it('resets to first page when rows per page changes', async () => {
      renderList(manyOrganizations);

      // Go to page 2
      const nextButton = screen.getByRole('button', { name: /go to next page/i });
      await userEvent.click(nextButton);

      expect(screen.getByText(/26–50 of 100/)).toBeInTheDocument();

      // Change rows per page
      const rowsPerPageSelect = screen.getByDisplayValue('25');
      await userEvent.click(rowsPerPageSelect);
      await userEvent.click(screen.getByText('10'));

      // Should reset to first page
      await waitFor(() => {
        expect(screen.getByText(/1–10 of 100/)).toBeInTheDocument();
      });
    });
  });

  describe('Action Menu', () => {
    it('shows action menu when more actions button is clicked', async () => {
      renderList();

      const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
      await userEvent.click(actionButtons[0]);

      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Deactivate')).toBeInTheDocument();
    });

    it('calls onEdit when View Details is clicked', async () => {
      renderList();

      const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
      await userEvent.click(actionButtons[0]);

      const viewDetailsButton = screen.getByText('View Details');
      await userEvent.click(viewDetailsButton);

      expect(mockOnEdit).toHaveBeenCalledWith('1');
    });

    it('calls onEdit when Edit is clicked', async () => {
      renderList();

      const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
      await userEvent.click(actionButtons[0]);

      const editButton = screen.getByText('Edit');
      await userEvent.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith('1');
    });

    it('opens deactivation confirmation dialog when Deactivate is clicked', async () => {
      renderList();

      const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
      await userEvent.click(actionButtons[0]);

      const deactivateButton = screen.getByText('Deactivate');
      await userEvent.click(deactivateButton);

      expect(screen.getByText('Confirm Organization Deactivation')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to deactivate/)).toBeInTheDocument();
    });

    it('disables deactivate option for inactive organizations', async () => {
      renderList();

      // Click on action menu for inactive organization (3rd one)
      const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
      await userEvent.click(actionButtons[2]);

      const deactivateButton = screen.getByText('Deactivate');
      expect(deactivateButton.closest('li')).toHaveClass('Mui-disabled');
    });

    it('closes action menu when clicking outside', async () => {
      renderList();

      const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
      await userEvent.click(actionButtons[0]);

      expect(screen.getByText('View Details')).toBeInTheDocument();

      // Click outside the menu
      await userEvent.click(document.body);

      await waitFor(() => {
        expect(screen.queryByText('View Details')).not.toBeInTheDocument();
      });
    });
  });

  describe('Deactivation Confirmation Dialog', () => {
    it('shows deactivation confirmation dialog with organization name', async () => {
      renderList();

      // Open action menu and click deactivate
      const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
      await userEvent.click(actionButtons[0]);
      await userEvent.click(screen.getByText('Deactivate'));

      expect(screen.getByText(/Are you sure you want to deactivate "Lincoln High School Drama"/)).toBeInTheDocument();
      expect(screen.getByText(/Organizations with active orders cannot be deactivated/)).toBeInTheDocument();
    });

    it('calls onDeactivate when deactivation is confirmed', async () => {
      renderList();

      // Open deactivation dialog
      const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
      await userEvent.click(actionButtons[0]);
      await userEvent.click(screen.getByText('Deactivate'));

      // Confirm deactivation
      const confirmButton = screen.getByRole('button', { name: /deactivate/i });
      await userEvent.click(confirmButton);

      expect(mockOnDeactivate).toHaveBeenCalledWith('Lincoln High School Drama');
    });

    it('closes dialog when cancel is clicked', async () => {
      renderList();

      // Open deactivation dialog
      const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
      await userEvent.click(actionButtons[0]);
      await userEvent.click(screen.getByText('Deactivate'));

      // Cancel deactivation
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Confirm Organization Deactivation')).not.toBeInTheDocument();
      });
    });

    it('shows loading state during deactivation', async () => {
      renderList();

      // Open deactivation dialog
      const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
      await userEvent.click(actionButtons[0]);
      await userEvent.click(screen.getByText('Deactivate'));

      // Mock async deactivation
      const mockAsyncDeactivate = jest.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 100));
      });
      mockOnDeactivate.mockImplementation(mockAsyncDeactivate);

      const confirmButton = screen.getByRole('button', { name: /deactivate/i });
      await userEvent.click(confirmButton);

      expect(screen.getByText('Deactivating...')).toBeInTheDocument();
      expect(confirmButton).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('closes dialog after successful deactivation', async () => {
      renderList();

      // Open deactivation dialog
      const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
      await userEvent.click(actionButtons[0]);
      await userEvent.click(screen.getByText('Deactivate'));

      // Confirm deactivation
      const confirmButton = screen.getByRole('button', { name: /deactivate/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByText('Confirm Organization Deactivation')).not.toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no organizations are provided', () => {
      renderList([]);

      expect(screen.getByText('No Organizations Found')).toBeInTheDocument();
      expect(screen.getByText(/No organizations match your current filters/)).toBeInTheDocument();
      expect(screen.getByTestId('BusinessIcon')).toBeInTheDocument();
    });

    it('shows appropriate empty state message', () => {
      renderList([]);

      expect(screen.getByText(/Try adjusting your search criteria or create a new organization/)).toBeInTheDocument();
    });

    it('does not render table when no organizations', () => {
      renderList([]);

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      // Mock mobile view
      mockUseMediaQuery.mockReturnValue(true);
    });

    it('hides contact column on mobile', () => {
      renderList();

      expect(screen.queryByText('Contact')).not.toBeInTheDocument();
    });

    it('hides created column on mobile', () => {
      renderList();

      expect(screen.queryByText('Created')).not.toBeInTheDocument();
    });

    it('shows contact info inline with organization name on mobile', () => {
      renderList();

      // Should show email inline with name
      const organizationCell = screen.getByText('Lincoln High School Drama').closest('td');
      expect(organizationCell).toContainHTML('drama@lincolnhigh.edu');
    });

    it('adapts layout for small screens', () => {
      renderList();

      // Organization names should still be visible
      expect(screen.getByText('Lincoln High School Drama')).toBeInTheDocument();
      expect(screen.getByText('Theater Company NYC')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles invalid date formats gracefully', () => {
      const orgWithInvalidDate = {
        ...mockOrganizations[0],
        createdAt: 'invalid-date',
        lastOrderDate: 'also-invalid'
      };

      renderList([orgWithInvalidDate]);

      expect(screen.getByText('Invalid date')).toBeInTheDocument();
    });

    it('handles missing organization data gracefully', () => {
      const incompleteOrg = {
        id: '999',
        name: 'Incomplete Org',
        type: 'school',
        contactEmail: 'test@incomplete.com',
        isActive: true,
        // Missing other fields
      };

      renderList([incompleteOrg]);

      expect(screen.getByText('Incomplete Org')).toBeInTheDocument();
      // Should not crash with missing optional fields
    });

    it('calls onError when deactivation fails', async () => {
      renderList();

      // Mock error during deactivation
      const error = new Error('Deactivation failed');
      mockOnDeactivate.mockRejectedValue(error);

      // Open deactivation dialog
      const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
      await userEvent.click(actionButtons[0]);
      await userEvent.click(screen.getByText('Deactivate'));

      // Confirm deactivation
      const confirmButton = screen.getByRole('button', { name: /deactivate/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Deactivation failed');
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper table structure', () => {
      renderList();

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(6);
      expect(screen.getAllByRole('row')).toHaveLength(4); // 3 data rows + 1 header row
    });

    it('has accessible action buttons', () => {
      renderList();

      const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
      actionButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label', 'more actions');
      });
    });

    it('has proper ARIA labels for dialogs', async () => {
      renderList();

      // Open deactivation dialog
      const actionButtons = screen.getAllByRole('button', { name: /more actions/i });
      await userEvent.click(actionButtons[0]);
      await userEvent.click(screen.getByText('Deactivate'));

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby');
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby');
    });

    it('supports keyboard navigation', async () => {
      renderList();

      // Tab through action buttons
      const actionButtons = screen.getAllByRole('button', { name: /more actions/i });

      await userEvent.tab();
      expect(actionButtons[0]).toHaveFocus();

      await userEvent.tab();
      expect(actionButtons[1]).toHaveFocus();
    });

    it('provides appropriate row hover feedback', () => {
      renderList();

      const rows = screen.getAllByRole('row');
      const dataRows = rows.slice(1); // Skip header row

      dataRows.forEach(row => {
        expect(row).toHaveClass('MuiTableRow-hover');
      });
    });
  });

  describe('Type Color Coding', () => {
    it('applies correct colors to organization type chips', () => {
      renderList();

      const schoolChip = screen.getByText('SCHOOL').closest('.MuiChip-root');
      const theaterChip = screen.getByText('THEATER').closest('.MuiChip-root');
      const danceChip = screen.getByText('DANCE COMPANY').closest('.MuiChip-root');

      expect(schoolChip).toHaveClass('MuiChip-colorPrimary');
      expect(theaterChip).toHaveClass('MuiChip-colorSecondary');
      expect(danceChip).toHaveClass('MuiChip-colorSuccess');
    });

    it('applies default color for unknown organization types', () => {
      const unknownTypeOrg = {
        ...mockOrganizations[0],
        type: 'unknown_type'
      };

      renderList([unknownTypeOrg]);

      const unknownChip = screen.getByText('UNKNOWN_TYPE').closest('.MuiChip-root');
      expect(unknownChip).toHaveClass('MuiChip-colorDefault');
    });
  });
});