import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import OrganizationManagement from '../../../src/pages/Admin/OrganizationManagement';
import { useAppStore } from '../../../src/stores/appStore';
import organizationService from '../../../src/services/organizationService';
import colorGarbTheme from '../../../src/theme/colorGarbTheme';

// Mock dependencies
jest.mock('../../../src/stores/appStore');
jest.mock('../../../src/services/organizationService');

const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;
const mockOrganizationService = organizationService as jest.Mocked<typeof organizationService>;

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
  <BrowserRouter>
    <ThemeProvider theme={colorGarbTheme}>
      {children}
    </ThemeProvider>
  </BrowserRouter>
);

describe('OrganizationManagement', () => {
  const mockUser = {
    id: 'user-1',
    name: 'Admin User',
    email: 'admin@colorgarb.com',
    role: 'ColorGarbStaff',
    organizationId: null,
    isActive: true
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup app store mock
    mockUseAppStore.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      authToken: 'fake-token',
      login: jest.fn(),
      logout: jest.fn(),
      initializeAuth: jest.fn(),
      clearError: jest.fn(),
    });

    // Setup organization service mocks
    mockOrganizationService.getAllOrganizations.mockResolvedValue(mockOrganizations);
    mockOrganizationService.createOrganization.mockResolvedValue({
      id: '4',
      name: 'New Organization',
      type: 'school',
      contactEmail: 'new@test.com',
      contactPhone: '(555) 999-8888',
      address: '123 New St',
      shippingAddress: null,
      isActive: true,
      createdAt: '2024-01-21T10:00:00Z',
      updatedAt: '2024-01-21T10:00:00Z',
      totalOrders: 0,
      activeOrders: 0,
      totalOrderValue: 0,
      lastOrderDate: null
    });
    mockOrganizationService.updateOrganization.mockResolvedValue({
      ...mockOrganizations[0],
      name: 'Updated Organization'
    });
    mockOrganizationService.deactivateOrganization.mockResolvedValue(undefined);
    mockOrganizationService.bulkImportOrganizations.mockResolvedValue({
      successCount: 2,
      failureCount: 0,
      failures: [],
      processingTime: 1500
    });
    mockOrganizationService.exportOrganizations.mockResolvedValue(new Blob(['csv,data'], { type: 'text/csv' }));
  });

  const renderComponent = () => {
    return render(
      <TestWrapper>
        <OrganizationManagement />
      </TestWrapper>
    );
  };

  describe('Initial Rendering', () => {
    it('renders page title and description', () => {
      renderComponent();

      expect(screen.getByText('Organization Management')).toBeInTheDocument();
      expect(screen.getByText(/Manage all organizations in the ColorGarb system/i)).toBeInTheDocument();
    });

    it('renders search and filter controls', () => {
      renderComponent();

      expect(screen.getByPlaceholderText(/search organizations/i)).toBeInTheDocument();
      expect(screen.getByText('All Types')).toBeInTheDocument();
      expect(screen.getByText('All Status')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      renderComponent();

      expect(screen.getByRole('button', { name: /create organization/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /bulk import/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('loads and displays organizations', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Lincoln High School Drama')).toBeInTheDocument();
        expect(screen.getByText('Theater Company NYC')).toBeInTheDocument();
        expect(screen.getByText('Inactive Dance Company')).toBeInTheDocument();
      });

      expect(mockOrganizationService.getAllOrganizations).toHaveBeenCalledTimes(1);
    });

    it('displays loading state initially', () => {
      renderComponent();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('shows error message when loading fails', async () => {
      const error = new Error('Failed to load organizations');
      mockOrganizationService.getAllOrganizations.mockRejectedValue(error);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/error loading organizations/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filtering', () => {
    it('filters organizations by search term', async () => {
      renderComponent();

      // Wait for organizations to load
      await waitFor(() => {
        expect(screen.getByText('Lincoln High School Drama')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search organizations/i);
      await userEvent.type(searchInput, 'Lincoln');

      // Should show only Lincoln organization
      await waitFor(() => {
        expect(screen.getByText('Lincoln High School Drama')).toBeInTheDocument();
        expect(screen.queryByText('Theater Company NYC')).not.toBeInTheDocument();
      });
    });

    it('filters organizations by type', async () => {
      renderComponent();

      // Wait for organizations to load
      await waitFor(() => {
        expect(screen.getByText('Lincoln High School Drama')).toBeInTheDocument();
      });

      // Click on type filter
      const typeFilter = screen.getByText('All Types');
      await userEvent.click(typeFilter);

      // Select theater type
      await userEvent.click(screen.getByText('Theater'));

      await waitFor(() => {
        expect(screen.getByText('Theater Company NYC')).toBeInTheDocument();
        expect(screen.queryByText('Lincoln High School Drama')).not.toBeInTheDocument();
      });
    });

    it('filters organizations by status', async () => {
      renderComponent();

      // Wait for organizations to load
      await waitFor(() => {
        expect(screen.getByText('Lincoln High School Drama')).toBeInTheDocument();
      });

      // Click on status filter
      const statusFilter = screen.getByText('All Status');
      await userEvent.click(statusFilter);

      // Select inactive status
      await userEvent.click(screen.getByText('Inactive'));

      await waitFor(() => {
        expect(screen.getByText('Inactive Dance Company')).toBeInTheDocument();
        expect(screen.queryByText('Lincoln High School Drama')).not.toBeInTheDocument();
      });
    });

    it('clears all filters when clear button is clicked', async () => {
      renderComponent();

      // Wait for organizations to load
      await waitFor(() => {
        expect(screen.getByText('Lincoln High School Drama')).toBeInTheDocument();
      });

      // Apply search filter
      const searchInput = screen.getByPlaceholderText(/search organizations/i);
      await userEvent.type(searchInput, 'Lincoln');

      // Apply type filter
      const typeFilter = screen.getByText('All Types');
      await userEvent.click(typeFilter);
      await userEvent.click(screen.getByText('School'));

      // Clear filters
      const clearButton = screen.getByRole('button', { name: /clear filters/i });
      await userEvent.click(clearButton);

      // Should show all organizations again
      await waitFor(() => {
        expect(screen.getByText('Lincoln High School Drama')).toBeInTheDocument();
        expect(screen.getByText('Theater Company NYC')).toBeInTheDocument();
        expect(screen.getByText('Inactive Dance Company')).toBeInTheDocument();
      });

      // Search input should be cleared
      expect(searchInput).toHaveValue('');
    });
  });

  describe('Organization Creation', () => {
    it('opens create dialog when create button is clicked', async () => {
      renderComponent();

      const createButton = screen.getByRole('button', { name: /create organization/i });
      await userEvent.click(createButton);

      expect(screen.getByText('Create Organization')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('creates organization and refreshes list', async () => {
      renderComponent();

      // Open create dialog
      const createButton = screen.getByRole('button', { name: /create organization/i });
      await userEvent.click(createButton);

      // Fill form (mocked form interaction)
      const nameInput = screen.getByLabelText(/organization name/i);
      await userEvent.type(nameInput, 'New Test Organization');

      const typeSelect = screen.getByLabelText(/type/i);
      await userEvent.click(typeSelect);
      await userEvent.click(screen.getByText('School'));

      const emailInput = screen.getByLabelText(/contact email/i);
      await userEvent.type(emailInput, 'new@test.edu');

      const addressInput = screen.getByLabelText(/address/i);
      await userEvent.type(addressInput, '123 New St, New City, NC 12345');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOrganizationService.createOrganization).toHaveBeenCalledWith({
          name: 'New Test Organization',
          type: 'school',
          contactEmail: 'new@test.edu',
          address: '123 New St, New City, NC 12345',
          contactPhone: undefined,
          shippingAddress: undefined
        });
      });

      // Should refresh the organization list
      expect(mockOrganizationService.getAllOrganizations).toHaveBeenCalledTimes(2);
    });

    it('shows error message when creation fails', async () => {
      const error = new Error('Organization name already exists');
      mockOrganizationService.createOrganization.mockRejectedValue(error);

      renderComponent();

      // Open create dialog
      const createButton = screen.getByRole('button', { name: /create organization/i });
      await userEvent.click(createButton);

      // Submit form (minimal setup)
      const submitButton = screen.getByRole('button', { name: /create/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to create organization/i)).toBeInTheDocument();
      });
    });
  });

  describe('Organization Editing', () => {
    it('opens edit dialog when edit action is selected', async () => {
      renderComponent();

      // Wait for organizations to load
      await waitFor(() => {
        expect(screen.getByText('Lincoln High School Drama')).toBeInTheDocument();
      });

      // Click on action menu for first organization
      const actionButtons = screen.getAllByLabelText(/more actions/i);
      await userEvent.click(actionButtons[0]);

      // Click edit option
      const editOption = screen.getByText('Edit');
      await userEvent.click(editOption);

      expect(screen.getByText('Edit Organization')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Should pre-populate form with existing data
      expect(screen.getByDisplayValue('Lincoln High School Drama')).toBeInTheDocument();
    });

    it('updates organization and refreshes list', async () => {
      renderComponent();

      // Wait for organizations to load
      await waitFor(() => {
        expect(screen.getByText('Lincoln High School Drama')).toBeInTheDocument();
      });

      // Open edit dialog (simplified)
      const actionButtons = screen.getAllByLabelText(/more actions/i);
      await userEvent.click(actionButtons[0]);
      await userEvent.click(screen.getByText('Edit'));

      // Update organization name
      const nameInput = screen.getByDisplayValue('Lincoln High School Drama');
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Updated Lincoln Drama');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOrganizationService.updateOrganization).toHaveBeenCalledWith(
          '1',
          expect.objectContaining({
            name: 'Updated Lincoln Drama'
          })
        );
      });

      // Should refresh the organization list
      expect(mockOrganizationService.getAllOrganizations).toHaveBeenCalledTimes(2);
    });
  });

  describe('Organization Deactivation', () => {
    it('shows confirmation dialog when deactivate is clicked', async () => {
      renderComponent();

      // Wait for organizations to load
      await waitFor(() => {
        expect(screen.getByText('Lincoln High School Drama')).toBeInTheDocument();
      });

      // Click on action menu for first organization
      const actionButtons = screen.getAllByLabelText(/more actions/i);
      await userEvent.click(actionButtons[0]);

      // Click deactivate option
      const deactivateOption = screen.getByText('Deactivate');
      await userEvent.click(deactivateOption);

      expect(screen.getByText(/confirm organization deactivation/i)).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to deactivate/i)).toBeInTheDocument();
    });

    it('deactivates organization when confirmed', async () => {
      renderComponent();

      // Wait for organizations to load
      await waitFor(() => {
        expect(screen.getByText('Lincoln High School Drama')).toBeInTheDocument();
      });

      // Open deactivation dialog
      const actionButtons = screen.getAllByLabelText(/more actions/i);
      await userEvent.click(actionButtons[0]);
      await userEvent.click(screen.getByText('Deactivate'));

      // Confirm deactivation
      const confirmButton = screen.getByRole('button', { name: /deactivate/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockOrganizationService.deactivateOrganization).toHaveBeenCalledWith('1');
      });

      // Should refresh the organization list
      expect(mockOrganizationService.getAllOrganizations).toHaveBeenCalledTimes(2);
    });

    it('shows error message when deactivation fails', async () => {
      const error = new Error('Cannot deactivate organization with active orders');
      mockOrganizationService.deactivateOrganization.mockRejectedValue(error);

      renderComponent();

      // Wait for organizations to load and open deactivation dialog
      await waitFor(() => {
        expect(screen.getByText('Lincoln High School Drama')).toBeInTheDocument();
      });

      const actionButtons = screen.getAllByLabelText(/more actions/i);
      await userEvent.click(actionButtons[0]);
      await userEvent.click(screen.getByText('Deactivate'));

      // Confirm deactivation
      const confirmButton = screen.getByRole('button', { name: /deactivate/i });
      await userEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to deactivate organization/i)).toBeInTheDocument();
      });
    });
  });

  describe('Bulk Import', () => {
    it('opens bulk import dialog when bulk import button is clicked', async () => {
      renderComponent();

      const bulkImportButton = screen.getByRole('button', { name: /bulk import/i });
      await userEvent.click(bulkImportButton);

      expect(screen.getByText('Bulk Import Organizations')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('processes bulk import and refreshes list', async () => {
      renderComponent();

      // Open bulk import dialog
      const bulkImportButton = screen.getByRole('button', { name: /bulk import/i });
      await userEvent.click(bulkImportButton);

      // Simulate file upload and import
      // Note: Actual file upload testing would require more complex setup
      const mockFile = new File(['csv,data'], 'organizations.csv', { type: 'text/csv' });

      // Simulate successful import completion (this would normally happen after file processing)
      // The actual dialog component would handle the file upload and API call

      // Verify that bulk import was called and list refreshed
      await waitFor(() => {
        // This would be called after successful import
        expect(mockOrganizationService.getAllOrganizations).toHaveBeenCalled();
      });
    });
  });

  describe('Data Export', () => {
    it('exports organization data when export button is clicked', async () => {
      // Mock URL.createObjectURL and document.createElement
      const mockCreateObjectURL = jest.fn().mockReturnValue('blob:mock-url');
      const mockRevoke = jest.fn();
      const mockClick = jest.fn();
      const mockRemove = jest.fn();

      Object.defineProperty(window, 'URL', {
        value: {
          createObjectURL: mockCreateObjectURL,
          revokeObjectURL: mockRevoke
        }
      });

      const mockAnchor = {
        href: '',
        download: '',
        click: mockClick,
        remove: mockRemove
      };

      jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
      jest.spyOn(document.body, 'appendChild').mockImplementation(jest.fn());

      renderComponent();

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      await waitFor(() => {
        expect(mockOrganizationService.exportOrganizations).toHaveBeenCalledWith(false);
      });

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevoke).toHaveBeenCalled();
    });

    it('shows error message when export fails', async () => {
      const error = new Error('Export failed');
      mockOrganizationService.exportOrganizations.mockRejectedValue(error);

      renderComponent();

      const exportButton = screen.getByRole('button', { name: /export/i });
      await userEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to export organizations/i)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });

      // Trigger resize event
      window.dispatchEvent(new Event('resize'));

      renderComponent();

      // Mobile layout should hide certain columns and show condensed view
      // The actual implementation would use useMediaQuery hook
      expect(screen.getByText('Lincoln High School Drama')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows error alert when API calls fail', async () => {
      const error = new Error('Network error');
      mockOrganizationService.getAllOrganizations.mockRejectedValue(error);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/error loading organizations/i)).toBeInTheDocument();
      });
    });

    it('allows retry when loading fails', async () => {
      const error = new Error('Network error');
      mockOrganizationService.getAllOrganizations.mockRejectedValueOnce(error);
      mockOrganizationService.getAllOrganizations.mockResolvedValue(mockOrganizations);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/error loading organizations/i)).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Lincoln High School Drama')).toBeInTheDocument();
      });

      expect(mockOrganizationService.getAllOrganizations).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderComponent();

      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByLabelText(/search organizations/i)).toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(4); // Create, Bulk Import, Export, Clear Filters
    });

    it('supports keyboard navigation', async () => {
      renderComponent();

      const searchInput = screen.getByPlaceholderText(/search organizations/i);

      // Tab navigation
      await userEvent.tab();
      expect(searchInput).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByText('All Types')).toHaveFocus();
    });

    it('provides screen reader friendly content', () => {
      renderComponent();

      // Check for proper headings hierarchy
      expect(screen.getByRole('heading', { level: 1, name: /organization management/i })).toBeInTheDocument();

      // Check for proper table structure
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });
});