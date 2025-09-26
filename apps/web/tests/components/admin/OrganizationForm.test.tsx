import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { OrganizationForm } from '../../../src/components/admin/OrganizationForm';
import colorGarbTheme from '../../../src/theme/colorGarbTheme';

// Mock organization data for editing
const mockOrganizationForEdit = {
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
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={colorGarbTheme}>
    {children}
  </ThemeProvider>
);

describe('OrganizationForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderForm = (organization?: any, isSubmitting = false) => {
    return render(
      <TestWrapper>
        <OrganizationForm
          organization={organization}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isSubmitting={isSubmitting}
        />
      </TestWrapper>
    );
  };

  describe('Form Rendering', () => {
    it('renders create form when no organization is provided', () => {
      renderForm();

      expect(screen.getByText('Create Organization')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create organization/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('renders edit form when organization is provided', () => {
      renderForm(mockOrganizationForEdit);

      expect(screen.getByText('Edit Organization')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('renders all required form fields', () => {
      renderForm();

      // Required fields
      expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/contact email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/address/i)).toBeInTheDocument();

      // Optional fields
      expect(screen.getByLabelText(/contact phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/shipping address/i)).toBeInTheDocument();
    });

    it('populates form fields when editing', () => {
      renderForm(mockOrganizationForEdit);

      expect(screen.getByDisplayValue('Lincoln High School Drama')).toBeInTheDocument();
      expect(screen.getByDisplayValue('drama@lincolnhigh.edu')).toBeInTheDocument();
      expect(screen.getByDisplayValue('(555) 123-4567')).toBeInTheDocument();
      expect(screen.getByDisplayValue('123 School St, Lincoln, NE 68508')).toBeInTheDocument();
      expect(screen.getByDisplayValue('456 Shipping Ave, Lincoln, NE 68508')).toBeInTheDocument();
    });

    it('shows organization type dropdown with all options', async () => {
      renderForm();

      const typeSelect = screen.getByLabelText(/type/i);
      await userEvent.click(typeSelect);

      await waitFor(() => {
        expect(screen.getByText('School')).toBeInTheDocument();
        expect(screen.getByText('Theater')).toBeInTheDocument();
        expect(screen.getByText('Dance Company')).toBeInTheDocument();
        expect(screen.getByText('Other')).toBeInTheDocument();
      });
    });

    it('shows "Same as billing address" checkbox for shipping address', () => {
      renderForm();

      expect(screen.getByLabelText(/same as billing address/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows validation errors for required fields when submitted empty', async () => {
      renderForm();

      const submitButton = screen.getByRole('button', { name: /create organization/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/organization name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/organization type is required/i)).toBeInTheDocument();
        expect(screen.getByText(/contact email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/address is required/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('validates organization name length', async () => {
      renderForm();

      const nameField = screen.getByLabelText(/organization name/i);
      const longName = 'a'.repeat(201); // Exceeds max length

      await userEvent.type(nameField, longName);

      const submitButton = screen.getByRole('button', { name: /create organization/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/organization name cannot exceed 200 characters/i)).toBeInTheDocument();
      });
    });

    it('validates email format', async () => {
      renderForm();

      const emailField = screen.getByLabelText(/contact email/i);
      await userEvent.type(emailField, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: /create organization/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please provide a valid email address/i)).toBeInTheDocument();
      });
    });

    it('validates email length', async () => {
      renderForm();

      const emailField = screen.getByLabelText(/contact email/i);
      const longEmail = 'a'.repeat(250) + '@test.com'; // Exceeds max length

      await userEvent.type(emailField, longEmail);

      const submitButton = screen.getByRole('button', { name: /create organization/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email cannot exceed 255 characters/i)).toBeInTheDocument();
      });
    });

    it('validates phone number length', async () => {
      renderForm();

      const phoneField = screen.getByLabelText(/contact phone/i);
      const longPhone = '1'.repeat(21); // Exceeds max length

      await userEvent.type(phoneField, longPhone);

      const submitButton = screen.getByRole('button', { name: /create organization/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/phone number cannot exceed 20 characters/i)).toBeInTheDocument();
      });
    });

    it('validates address length', async () => {
      renderForm();

      const addressField = screen.getByLabelText(/address/i);
      const longAddress = 'a'.repeat(501); // Exceeds max length

      await userEvent.type(addressField, longAddress);

      const submitButton = screen.getByRole('button', { name: /create organization/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/address cannot exceed 500 characters/i)).toBeInTheDocument();
      });
    });

    it('validates shipping address length', async () => {
      renderForm();

      const shippingField = screen.getByLabelText(/shipping address/i);
      const longAddress = 'a'.repeat(501); // Exceeds max length

      await userEvent.type(shippingField, longAddress);

      const submitButton = screen.getByRole('button', { name: /create organization/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/shipping address cannot exceed 500 characters/i)).toBeInTheDocument();
      });
    });

    it('allows submission with only required fields filled', async () => {
      renderForm();

      // Fill required fields
      await userEvent.type(screen.getByLabelText(/organization name/i), 'Test Organization');

      const typeSelect = screen.getByLabelText(/type/i);
      await userEvent.click(typeSelect);
      await userEvent.click(screen.getByText('School'));

      await userEvent.type(screen.getByLabelText(/contact email/i), 'test@example.com');
      await userEvent.type(screen.getByLabelText(/address/i), '123 Test St, Test City, TC 12345');

      const submitButton = screen.getByRole('button', { name: /create organization/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'Test Organization',
          type: 'school',
          contactEmail: 'test@example.com',
          contactPhone: '',
          address: '123 Test St, Test City, TC 12345',
          shippingAddress: ''
        });
      });
    });
  });

  describe('Same as Billing Address Feature', () => {
    it('copies billing address to shipping when checkbox is checked', async () => {
      renderForm();

      const addressField = screen.getByLabelText(/address/i);
      const shippingField = screen.getByLabelText(/shipping address/i);
      const sameAsCheckbox = screen.getByLabelText(/same as billing address/i);

      // Fill billing address
      await userEvent.type(addressField, '123 Main St, Test City, TC 12345');

      // Initially shipping should be empty
      expect(shippingField).toHaveValue('');

      // Check the checkbox
      await userEvent.click(sameAsCheckbox);

      // Shipping address should now match billing
      await waitFor(() => {
        expect(shippingField).toHaveValue('123 Main St, Test City, TC 12345');
      });

      // Shipping field should be disabled
      expect(shippingField).toBeDisabled();
    });

    it('enables shipping address field when checkbox is unchecked', async () => {
      renderForm();

      const shippingField = screen.getByLabelText(/shipping address/i);
      const sameAsCheckbox = screen.getByLabelText(/same as billing address/i);

      // Check and then uncheck the checkbox
      await userEvent.click(sameAsCheckbox);
      await userEvent.click(sameAsCheckbox);

      // Shipping field should be enabled and empty
      expect(shippingField).toBeEnabled();
      expect(shippingField).toHaveValue('');
    });

    it('updates shipping address when billing changes and checkbox is checked', async () => {
      renderForm();

      const addressField = screen.getByLabelText(/address/i);
      const shippingField = screen.getByLabelText(/shipping address/i);
      const sameAsCheckbox = screen.getByLabelText(/same as billing address/i);

      // Fill initial address and check checkbox
      await userEvent.type(addressField, '123 Main St');
      await userEvent.click(sameAsCheckbox);

      expect(shippingField).toHaveValue('123 Main St');

      // Update billing address
      await userEvent.clear(addressField);
      await userEvent.type(addressField, '456 Oak Ave, New City, NC 54321');

      // Shipping should update automatically
      await waitFor(() => {
        expect(shippingField).toHaveValue('456 Oak Ave, New City, NC 54321');
      });
    });
  });

  describe('Form Submission', () => {
    it('submits create form with correct data structure', async () => {
      renderForm();

      // Fill all fields
      await userEvent.type(screen.getByLabelText(/organization name/i), 'Complete Test Org');

      const typeSelect = screen.getByLabelText(/type/i);
      await userEvent.click(typeSelect);
      await userEvent.click(screen.getByText('Theater'));

      await userEvent.type(screen.getByLabelText(/contact email/i), 'complete@test.com');
      await userEvent.type(screen.getByLabelText(/contact phone/i), '(555) 123-4567');
      await userEvent.type(screen.getByLabelText(/address/i), '123 Complete St, Complete City, CC 12345');
      await userEvent.type(screen.getByLabelText(/shipping address/i), '456 Shipping Ave, Ship City, SC 67890');

      const submitButton = screen.getByRole('button', { name: /create organization/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'Complete Test Org',
          type: 'theater',
          contactEmail: 'complete@test.com',
          contactPhone: '(555) 123-4567',
          address: '123 Complete St, Complete City, CC 12345',
          shippingAddress: '456 Shipping Ave, Ship City, SC 67890'
        });
      });
    });

    it('submits edit form with only changed fields', async () => {
      renderForm(mockOrganizationForEdit);

      // Change only the name and phone
      const nameField = screen.getByDisplayValue('Lincoln High School Drama');
      await userEvent.clear(nameField);
      await userEvent.type(nameField, 'Updated Lincoln Drama');

      const phoneField = screen.getByDisplayValue('(555) 123-4567');
      await userEvent.clear(phoneField);
      await userEvent.type(phoneField, '(555) 999-8888');

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'Updated Lincoln Drama',
          type: 'school',
          contactEmail: 'drama@lincolnhigh.edu',
          contactPhone: '(555) 999-8888',
          address: '123 School St, Lincoln, NE 68508',
          shippingAddress: '456 Shipping Ave, Lincoln, NE 68508'
        });
      });
    });

    it('handles form submission with empty optional fields', async () => {
      renderForm();

      // Fill only required fields
      await userEvent.type(screen.getByLabelText(/organization name/i), 'Minimal Org');

      const typeSelect = screen.getByLabelText(/type/i);
      await userEvent.click(typeSelect);
      await userEvent.click(screen.getByText('Other'));

      await userEvent.type(screen.getByLabelText(/contact email/i), 'minimal@test.com');
      await userEvent.type(screen.getByLabelText(/address/i), '123 Minimal St');

      const submitButton = screen.getByRole('button', { name: /create organization/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'Minimal Org',
          type: 'other',
          contactEmail: 'minimal@test.com',
          contactPhone: '',
          address: '123 Minimal St',
          shippingAddress: ''
        });
      });
    });
  });

  describe('Form State Management', () => {
    it('shows loading state when isSubmitting is true', () => {
      renderForm(undefined, true);

      const submitButton = screen.getByRole('button', { name: /creating.../i });
      expect(submitButton).toBeDisabled();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('shows different loading text for edit mode', () => {
      renderForm(mockOrganizationForEdit, true);

      expect(screen.getByRole('button', { name: /saving.../i })).toBeInTheDocument();
    });

    it('disables all form fields when submitting', () => {
      renderForm(undefined, true);

      expect(screen.getByLabelText(/organization name/i)).toBeDisabled();
      expect(screen.getByLabelText(/contact email/i)).toBeDisabled();
      expect(screen.getByLabelText(/address/i)).toBeDisabled();
      expect(screen.getByLabelText(/contact phone/i)).toBeDisabled();
      expect(screen.getByLabelText(/shipping address/i)).toBeDisabled();
    });

    it('calls onCancel when cancel button is clicked', async () => {
      renderForm();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('does not call onCancel when submitting', () => {
      renderForm(undefined, true);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Input Formatting', () => {
    it('trims whitespace from text inputs on submission', async () => {
      renderForm();

      // Add whitespace to fields
      await userEvent.type(screen.getByLabelText(/organization name/i), '  Test Org  ');
      await userEvent.type(screen.getByLabelText(/contact email/i), '  test@example.com  ');
      await userEvent.type(screen.getByLabelText(/address/i), '  123 Test St  ');

      const typeSelect = screen.getByLabelText(/type/i);
      await userEvent.click(typeSelect);
      await userEvent.click(screen.getByText('School'));

      const submitButton = screen.getByRole('button', { name: /create organization/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'Test Org',
          type: 'school',
          contactEmail: 'test@example.com',
          contactPhone: '',
          address: '123 Test St',
          shippingAddress: ''
        });
      });
    });

    it('handles multiline addresses correctly', async () => {
      renderForm();

      const multilineAddress = 'Building A\n123 Main Street\nSuite 456\nTest City, TC 12345';

      await userEvent.type(screen.getByLabelText(/organization name/i), 'Test Org');
      await userEvent.type(screen.getByLabelText(/contact email/i), 'test@example.com');
      await userEvent.type(screen.getByLabelText(/address/i), multilineAddress);

      const typeSelect = screen.getByLabelText(/type/i);
      await userEvent.click(typeSelect);
      await userEvent.click(screen.getByText('School'));

      const submitButton = screen.getByRole('button', { name: /create organization/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            address: multilineAddress
          })
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and ARIA attributes', () => {
      renderForm();

      // Check for proper labeling
      expect(screen.getByLabelText(/organization name/i)).toHaveAttribute('required');
      expect(screen.getByLabelText(/contact email/i)).toHaveAttribute('required');
      expect(screen.getByLabelText(/address/i)).toHaveAttribute('required');

      // Check for form role
      expect(screen.getByRole('form')).toBeInTheDocument();
    });

    it('shows helper text for form fields', () => {
      renderForm();

      expect(screen.getByText(/choose the organization type for categorization/i)).toBeInTheDocument();
      expect(screen.getByText(/primary contact email for the organization/i)).toBeInTheDocument();
      expect(screen.getByText(/complete billing address/i)).toBeInTheDocument();
    });

    it('associates error messages with form fields', async () => {
      renderForm();

      const submitButton = screen.getByRole('button', { name: /create organization/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        const nameField = screen.getByLabelText(/organization name/i);
        expect(nameField).toHaveAttribute('aria-invalid', 'true');
        expect(nameField).toHaveAttribute('aria-describedby');
      });
    });

    it('supports keyboard navigation', async () => {
      renderForm();

      const nameField = screen.getByLabelText(/organization name/i);

      // Tab navigation should work properly
      await userEvent.tab();
      expect(nameField).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByLabelText(/type/i)).toHaveFocus();
    });
  });

  describe('Integration with Material-UI Components', () => {
    it('renders Material-UI components correctly', () => {
      renderForm();

      // Check for MUI components
      expect(screen.getByRole('textbox', { name: /organization name/i })).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /type/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /same as billing address/i })).toBeInTheDocument();
    });

    it('handles Material-UI Select component properly', async () => {
      renderForm();

      const typeSelect = screen.getByLabelText(/type/i);

      // Should start with no value
      expect(typeSelect).toHaveValue('');

      // Should open dropdown when clicked
      await userEvent.click(typeSelect);

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      // Should select option when clicked
      await userEvent.click(screen.getByText('Dance Company'));

      await waitFor(() => {
        expect(typeSelect).toHaveValue('dance_company');
      });
    });

    it('displays proper error styling for invalid fields', async () => {
      renderForm();

      const submitButton = screen.getByRole('button', { name: /create organization/i });
      await userEvent.click(submitButton);

      await waitFor(() => {
        const nameField = screen.getByLabelText(/organization name/i);
        // Check that error styling is applied (MUI adds error class)
        expect(nameField.closest('.MuiFormControl-root')).toHaveClass('Mui-error');
      });
    });
  });
});