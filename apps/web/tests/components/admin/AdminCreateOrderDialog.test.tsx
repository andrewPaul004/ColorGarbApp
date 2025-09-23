import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminCreateOrderDialog } from '../../../src/components/admin/AdminCreateOrderDialog';
import { useAdminStore } from '../../../src/stores/adminStore';

// Mock the admin store
jest.mock('../../../src/stores/adminStore');
const mockUseAdminStore = useAdminStore as jest.MockedFunction<typeof useAdminStore>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock organizations data
const mockOrganizations = [
  {
    id: 'org-1',
    name: 'Lincoln High School Marching Band',
    type: 'High School',
    contactEmail: 'band@lincolnhigh.edu',
    contactPhone: '555-0123',
    isActive: true,
  },
  {
    id: 'org-2',
    name: 'Springfield College Band',
    type: 'College',
    contactEmail: 'music@springfield.edu',
    contactPhone: '555-0456',
    isActive: true,
  },
];

describe('AdminCreateOrderDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnOrderCreated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup admin store mock
    mockUseAdminStore.mockReturnValue({
      organizations: mockOrganizations,
      // Add other store properties as needed
      orders: [],
      isLoading: false,
      error: null,
      successMessage: null,
      pagination: { page: 1, pageSize: 50, total: 0 },
      filters: {},
      refreshOrders: jest.fn(),
      clearMessages: jest.fn(),
      loadOrganizations: jest.fn(),
      updateOrderStage: jest.fn(),
      bulkUpdateOrders: jest.fn(),
    });

    // Setup localStorage mock
    mockLocalStorage.getItem.mockReturnValue('fake-auth-token');
  });

  const renderDialog = (open = true) => {
    return render(
      <AdminCreateOrderDialog
        open={open}
        onClose={mockOnClose}
        onOrderCreated={mockOnOrderCreated}
      />
    );
  };

  describe('Dialog Rendering', () => {
    it('renders dialog when open', () => {
      renderDialog(true);

      expect(screen.getByText('Create New Order (Admin)')).toBeInTheDocument();
      expect(screen.getByText('Enhanced order creation for any organization')).toBeInTheDocument();
    });

    it('does not render dialog when closed', () => {
      renderDialog(false);

      expect(screen.queryByText('Create New Order (Admin)')).not.toBeInTheDocument();
    });

    it('renders all required form fields', () => {
      renderDialog();

      // Required fields
      expect(screen.getByLabelText(/organization/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/order description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/measurement date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/delivery date/i)).toBeInTheDocument();

      // Optional fields
      expect(screen.getByLabelText(/order name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/number of performers/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/initial manufacturing stage/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/total amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/special instructions/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/administrative notes/i)).toBeInTheDocument();
    });

    it('renders organization autocomplete with options', async () => {
      renderDialog();

      const orgField = screen.getByLabelText(/organization/i);
      await userEvent.click(orgField);

      await waitFor(() => {
        expect(screen.getByText('Lincoln High School Marching Band')).toBeInTheDocument();
        expect(screen.getByText('Springfield College Band')).toBeInTheDocument();
      });
    });

    it('renders all manufacturing stages in dropdown', async () => {
      renderDialog();

      const stageSelect = screen.getByLabelText(/initial manufacturing stage/i);
      await userEvent.click(stageSelect);

      await waitFor(() => {
        expect(screen.getByText('Design Proposal')).toBeInTheDocument();
        expect(screen.getByText('Proof Approval')).toBeInTheDocument();
        expect(screen.getByText('Measurements')).toBeInTheDocument();
        expect(screen.getByText('Production Planning')).toBeInTheDocument();
        expect(screen.getByText('Delivery')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('shows validation errors for required fields', async () => {
      renderDialog();

      const createButton = screen.getByRole('button', { name: /create order/i });
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/organization selection is required/i)).toBeInTheDocument();
        expect(screen.getByText(/order description is required/i)).toBeInTheDocument();
        expect(screen.getByText(/measurement date is required/i)).toBeInTheDocument();
        expect(screen.getByText(/delivery date is required/i)).toBeInTheDocument();
      });
    });

    it('validates description length', async () => {
      renderDialog();

      const descriptionField = screen.getByLabelText(/order description/i);
      const longDescription = 'a'.repeat(501);

      await userEvent.type(descriptionField, longDescription);

      const createButton = screen.getByRole('button', { name: /create order/i });
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/description cannot exceed 500 characters/i)).toBeInTheDocument();
      });
    });

    it('validates performer count range', async () => {
      renderDialog();

      const performerField = screen.getByLabelText(/number of performers/i);
      await userEvent.type(performerField, '10001');

      const createButton = screen.getByRole('button', { name: /create order/i });
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/number of performers must be between 1 and 10,000/i)).toBeInTheDocument();
      });
    });

    it('validates date ordering (delivery after measurement)', async () => {
      renderDialog();

      // Set measurement date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Set delivery date to today (should be invalid)
      const today = new Date();

      const measurementField = screen.getByLabelText(/measurement date/i);
      const deliveryField = screen.getByLabelText(/delivery date/i);

      // Note: Date picker testing can be complex, this is a simplified version
      fireEvent.change(measurementField, { target: { value: tomorrow.toISOString().split('T')[0] } });
      fireEvent.change(deliveryField, { target: { value: today.toISOString().split('T')[0] } });

      const createButton = screen.getByRole('button', { name: /create order/i });
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/delivery date must be after measurement date/i)).toBeInTheDocument();
      });
    });

    it('validates total amount range', async () => {
      renderDialog();

      const amountField = screen.getByLabelText(/total amount/i);
      await userEvent.type(amountField, '1000001');

      const createButton = screen.getByRole('button', { name: /create order/i });
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/total amount must be between \$0 and \$1,000,000/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid data', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          orderNumber: 'CG-2024-001',
          id: 'order-123',
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      renderDialog();

      // Fill required fields
      const orgField = screen.getByLabelText(/organization/i);
      await userEvent.click(orgField);
      await userEvent.click(screen.getByText('Lincoln High School Marching Band'));

      const descriptionField = screen.getByLabelText(/order description/i);
      await userEvent.type(descriptionField, 'Fall 2024 Marching Band Uniforms');

      // Submit form
      const createButton = screen.getByRole('button', { name: /create order/i });
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5132/api/orders/admin',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Authorization': 'Bearer fake-auth-token',
            }),
            body: expect.stringContaining('Fall 2024 Marching Band Uniforms'),
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/order CG-2024-001 created successfully/i)).toBeInTheDocument();
      });

      expect(mockOnOrderCreated).toHaveBeenCalledWith({
        orderNumber: 'CG-2024-001',
        id: 'order-123',
      });
    });

    it('handles submission errors', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          message: 'Invalid organization selected',
        }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      renderDialog();

      // Fill minimal required fields
      const orgField = screen.getByLabelText(/organization/i);
      await userEvent.click(orgField);
      await userEvent.click(screen.getByText('Lincoln High School Marching Band'));

      const descriptionField = screen.getByLabelText(/order description/i);
      await userEvent.type(descriptionField, 'Test Order');

      const createButton = screen.getByRole('button', { name: /create order/i });
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid request: invalid organization selected/i)).toBeInTheDocument();
      });
    });

    it('handles authentication errors', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      renderDialog();

      const createButton = screen.getByRole('button', { name: /create order/i });
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/no authentication token found/i)).toBeInTheDocument();
      });
    });

    it('disables form during submission', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ orderNumber: 'CG-2024-001', id: 'order-123' }),
      };
      mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockResponse as any), 100)));

      renderDialog();

      // Fill required fields
      const orgField = screen.getByLabelText(/organization/i);
      await userEvent.click(orgField);
      await userEvent.click(screen.getByText('Lincoln High School Marching Band'));

      const descriptionField = screen.getByLabelText(/order description/i);
      await userEvent.type(descriptionField, 'Test Order');

      const createButton = screen.getByRole('button', { name: /create order/i });
      await userEvent.click(createButton);

      // Check that button is disabled and shows loading state
      expect(screen.getByText(/creating.../i)).toBeInTheDocument();
      expect(createButton).toBeDisabled();

      // Wait for submission to complete
      await waitFor(() => {
        expect(screen.getByText(/order CG-2024-001 created successfully/i)).toBeInTheDocument();
      });
    });
  });

  describe('Dialog Interactions', () => {
    it('calls onClose when cancel button is clicked', async () => {
      renderDialog();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('resets form when dialog opens', () => {
      const { rerender } = renderDialog(false);

      rerender(
        <AdminCreateOrderDialog
          open={true}
          onClose={mockOnClose}
          onOrderCreated={mockOnOrderCreated}
        />
      );

      expect(screen.getByLabelText(/order description/i)).toHaveValue('');
      expect(screen.getByLabelText(/order name/i)).toHaveValue('');
      expect(screen.getByLabelText(/special instructions/i)).toHaveValue('');
    });

    it('auto-closes dialog after successful submission', async () => {
      jest.useFakeTimers();

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ orderNumber: 'CG-2024-001', id: 'order-123' }),
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      renderDialog();

      // Fill and submit form
      const orgField = screen.getByLabelText(/organization/i);
      await userEvent.click(orgField);
      await userEvent.click(screen.getByText('Lincoln High School Marching Band'));

      const descriptionField = screen.getByLabelText(/order description/i);
      await userEvent.type(descriptionField, 'Test Order');

      const createButton = screen.getByRole('button', { name: /create order/i });
      await userEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/order CG-2024-001 created successfully/i)).toBeInTheDocument();
      });

      // Fast-forward time to trigger auto-close
      jest.advanceTimersByTime(2000);

      expect(mockOnClose).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderDialog();

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/organization/i)).toHaveAttribute('required');
      expect(screen.getByLabelText(/order description/i)).toHaveAttribute('required');
      expect(screen.getByLabelText(/measurement date/i)).toHaveAttribute('required');
      expect(screen.getByLabelText(/delivery date/i)).toHaveAttribute('required');
    });

    it('shows helper text for form fields', () => {
      renderDialog();

      expect(screen.getByText(/select the organization for this order/i)).toBeInTheDocument();
      expect(screen.getByText(/when will measurements be provided/i)).toBeInTheDocument();
      expect(screen.getByText(/when are costumes needed/i)).toBeInTheDocument();
      expect(screen.getByText(/leave blank for "pending design approval"/i)).toBeInTheDocument();
    });
  });
});