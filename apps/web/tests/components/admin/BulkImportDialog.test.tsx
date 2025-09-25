import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { BulkImportDialog } from '../../../src/components/admin/BulkImportDialog';
import organizationService from '../../../src/services/organizationService';
import colorGarbTheme from '../../../src/theme/colorGarbTheme';

// Mock organization service
jest.mock('../../../src/services/organizationService');
const mockOrganizationService = organizationService as jest.Mocked<typeof organizationService>;

// Mock URL.createObjectURL and revokeObjectURL
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL
  }
});

// Mock document.createElement for anchor element
const mockClick = jest.fn();
const mockRemove = jest.fn();
const mockAnchor = {
  href: '',
  download: '',
  click: mockClick,
  remove: mockRemove
};
jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
jest.spyOn(document.body, 'appendChild').mockImplementation(jest.fn());

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={colorGarbTheme}>
    {children}
  </ThemeProvider>
);

// Mock FileReader
const mockFileReader = {
  readAsText: jest.fn(),
  onload: null as any,
  onerror: null as any,
  result: ''
};

(global as any).FileReader = jest.fn(() => mockFileReader);

describe('BulkImportDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnImportCompleted = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateObjectURL.mockReturnValue('blob:mock-url');

    // Reset FileReader mock
    mockFileReader.readAsText.mockReset();
    mockFileReader.onload = null;
    mockFileReader.onerror = null;
    mockFileReader.result = '';
  });

  const renderDialog = (open = true) => {
    return render(
      <TestWrapper>
        <BulkImportDialog
          open={open}
          onClose={mockOnClose}
          onImportCompleted={mockOnImportCompleted}
          onError={mockOnError}
        />
      </TestWrapper>
    );
  };

  describe('Dialog Rendering', () => {
    it('renders dialog when open', () => {
      renderDialog(true);

      expect(screen.getByText('Bulk Import Organizations')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render dialog when closed', () => {
      renderDialog(false);

      expect(screen.queryByText('Bulk Import Organizations')).not.toBeInTheDocument();
    });

    it('renders instructions and template download button', () => {
      renderDialog();

      expect(screen.getByText(/Import multiple organizations from a CSV file/)).toBeInTheDocument();
      expect(screen.getByText(/Maximum 1000 organizations per import/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /download csv template/i })).toBeInTheDocument();
    });

    it('renders file selection button', () => {
      renderDialog();

      expect(screen.getByRole('button', { name: /select csv file/i })).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      renderDialog();

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /import organizations/i })).toBeInTheDocument();
    });
  });

  describe('CSV Template Download', () => {
    it('downloads template when download button is clicked', async () => {
      renderDialog();

      const downloadButton = screen.getByRole('button', { name: /download csv template/i });
      await userEvent.click(downloadButton);

      expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockAnchor.download).toBe('organization_import_template.csv');
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('creates template with correct CSV format', async () => {
      renderDialog();

      const downloadButton = screen.getByRole('button', { name: /download csv template/i });
      await userEvent.click(downloadButton);

      expect(mockCreateObjectURL).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'text/csv'
        })
      );

      // Check that the blob was created with CSV template content
      const createObjectURLCall = mockCreateObjectURL.mock.calls[0][0];
      expect(createObjectURLCall.type).toBe('text/csv');
    });
  });

  describe('File Selection', () => {
    it('opens file dialog when select button is clicked', async () => {
      renderDialog();

      // Mock the file input click
      const mockClick = jest.fn();
      const mockFileInput = { click: mockClick };
      jest.spyOn(React, 'useRef').mockReturnValue({ current: mockFileInput });

      const selectButton = screen.getByRole('button', { name: /select csv file/i });
      await userEvent.click(selectButton);

      expect(mockClick).toHaveBeenCalled();
    });

    it('updates button text when file is selected', () => {
      renderDialog();

      const fileInput = screen.getByRole('button', { name: /select csv file/i });

      // Simulate file selection by updating the component state
      // This would normally happen through the file input onChange event
      const mockFile = new File(['csv,content'], 'test.csv', { type: 'text/csv' });

      // Create a more realistic file input event
      const fileInputElement = document.createElement('input');
      fileInputElement.type = 'file';
      Object.defineProperty(fileInputElement, 'files', {
        value: [mockFile],
        writable: false
      });

      fireEvent.change(fileInputElement);
    });

    it('rejects non-CSV files', async () => {
      renderDialog();

      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' });

      const fileInputElement = document.createElement('input');
      fileInputElement.type = 'file';
      Object.defineProperty(fileInputElement, 'files', {
        value: [mockFile],
        writable: false
      });

      fireEvent.change(fileInputElement);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Please select a CSV file');
      });
    });

    it('rejects files larger than 5MB', async () => {
      renderDialog();

      // Create a mock file larger than 5MB
      const largeFile = new File(['content'], 'large.csv', { type: 'text/csv' });
      Object.defineProperty(largeFile, 'size', {
        value: 6 * 1024 * 1024, // 6MB
        writable: false
      });

      const fileInputElement = document.createElement('input');
      fileInputElement.type = 'file';
      Object.defineProperty(fileInputElement, 'files', {
        value: [largeFile],
        writable: false
      });

      fireEvent.change(fileInputElement);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('File size must be less than 5MB');
      });
    });
  });

  describe('CSV Parsing', () => {
    it('parses valid CSV and shows preview', async () => {
      const validCSV = `Name,Type,ContactEmail,ContactPhone,Address,ShippingAddress
Lincoln High School,school,contact@lincoln.edu,(555) 123-4567,"123 Main St, Lincoln, NE","456 Ship St, Lincoln, NE"
Theater NYC,theater,info@theater.com,(212) 555-0123,"789 Broadway, NY","123 Theater Ave, NY"`;

      renderDialog();

      // Mock FileReader
      mockFileReader.result = validCSV;

      const mockFile = new File([validCSV], 'test.csv', { type: 'text/csv' });

      const fileInputElement = document.createElement('input');
      fileInputElement.type = 'file';
      Object.defineProperty(fileInputElement, 'files', {
        value: [mockFile],
        writable: false
      });

      fireEvent.change(fileInputElement);

      // Simulate FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: validCSV } } as any);
      }

      await waitFor(() => {
        expect(screen.getByText(/Ready to import 2 organization/i)).toBeInTheDocument();
        expect(screen.getByText('Lincoln High School (school)')).toBeInTheDocument();
        expect(screen.getByText('Theater NYC (theater)')).toBeInTheDocument();
      });
    });

    it('shows parsing errors for invalid CSV', async () => {
      const invalidCSV = `Name,Type,ContactEmail,Address
Invalid Org,,invalid-email,123 Main St`;

      renderDialog();

      mockFileReader.result = invalidCSV;

      const mockFile = new File([invalidCSV], 'test.csv', { type: 'text/csv' });

      const fileInputElement = document.createElement('input');
      fileInputElement.type = 'file';
      Object.defineProperty(fileInputElement, 'files', {
        value: [mockFile],
        writable: false
      });

      fireEvent.change(fileInputElement);

      // Simulate FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: invalidCSV } } as any);
      }

      await waitFor(() => {
        expect(screen.getByText(/error\(s\) found in CSV file/i)).toBeInTheDocument();
      });
    });

    it('validates required columns', async () => {
      const missingColumnsCSV = `Name,Type
Test Org,school`;

      renderDialog();

      mockFileReader.result = missingColumnsCSV;

      const mockFile = new File([missingColumnsCSV], 'test.csv', { type: 'text/csv' });

      const fileInputElement = document.createElement('input');
      fileInputElement.type = 'file';
      Object.defineProperty(fileInputElement, 'files', {
        value: [missingColumnsCSV],
        writable: false
      });

      fireEvent.change(fileInputElement);

      // Simulate FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: missingColumnsCSV } } as any);
      }

      await waitFor(() => {
        expect(screen.getByText(/Missing required columns/i)).toBeInTheDocument();
      });
    });

    it('validates email format in CSV data', async () => {
      const invalidEmailCSV = `Name,Type,ContactEmail,Address
Test Org,school,invalid-email,123 Main St`;

      renderDialog();

      mockFileReader.result = invalidEmailCSV;

      const mockFile = new File([invalidEmailCSV], 'test.csv', { type: 'text/csv' });

      const fileInputElement = document.createElement('input');
      fileInputElement.type = 'file';
      Object.defineProperty(fileInputElement, 'files', {
        value: [invalidEmailCSV],
        writable: false
      });

      fireEvent.change(fileInputElement);

      // Simulate FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: invalidEmailCSV } } as any);
      }

      await waitFor(() => {
        expect(screen.getByText(/ContactEmail must be a valid email address/i)).toBeInTheDocument();
      });
    });

    it('validates organization type', async () => {
      const invalidTypeCSV = `Name,Type,ContactEmail,Address
Test Org,invalid_type,test@example.com,123 Main St`;

      renderDialog();

      mockFileReader.result = invalidTypeCSV;

      const mockFile = new File([invalidTypeCSV], 'test.csv', { type: 'text/csv' });

      const fileInputElement = document.createElement('input');
      fileInputElement.type = 'file';
      Object.defineProperty(fileInputElement, 'files', {
        value: [invalidTypeCSV],
        writable: false
      });

      fireEvent.change(fileInputElement);

      // Simulate FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: invalidTypeCSV } } as any);
      }

      await waitFor(() => {
        expect(screen.getByText(/Type must be one of: school, theater, dance_company, other/i)).toBeInTheDocument();
      });
    });

    it('detects duplicate organization names within file', async () => {
      const duplicateCSV = `Name,Type,ContactEmail,Address
Test Org,school,test1@example.com,123 Main St
Test Org,theater,test2@example.com,456 Oak Ave`;

      renderDialog();

      mockFileReader.result = duplicateCSV;

      const mockFile = new File([duplicateCSV], 'test.csv', { type: 'text/csv' });

      const fileInputElement = document.createElement('input');
      fileInputElement.type = 'file';
      Object.defineProperty(fileInputElement, 'files', {
        value: [duplicateCSV],
        writable: false
      });

      fireEvent.change(fileInputElement);

      // Simulate FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: duplicateCSV } } as any);
      }

      await waitFor(() => {
        expect(screen.getByText(/Duplicate organization name "Test Org" found/i)).toBeInTheDocument();
      });
    });

    it('shows expandable error details', async () => {
      const invalidCSV = `Name,Type,ContactEmail,Address
,school,invalid-email,123 Main St
Test Org,,test@example.com,`;

      renderDialog();

      mockFileReader.result = invalidCSV;

      const mockFile = new File([invalidCSV], 'test.csv', { type: 'text/csv' });

      const fileInputElement = document.createElement('input');
      fileInputElement.type = 'file';
      Object.defineProperty(fileInputElement, 'files', {
        value: [invalidCSV],
        writable: false
      });

      fireEvent.change(fileInputElement);

      // Simulate FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: invalidCSV } } as any);
      }

      await waitFor(() => {
        expect(screen.getByText(/error\(s\) found in CSV file/i)).toBeInTheDocument();
      });

      // Expand error details
      const expandButton = screen.getByRole('button', { name: /expand/i });
      await userEvent.click(expandButton);

      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/ContactEmail must be a valid email address/i)).toBeInTheDocument();
    });
  });

  describe('Import Process', () => {
    const validCSV = `Name,Type,ContactEmail,Address
Lincoln High School,school,contact@lincoln.edu,"123 Main St, Lincoln, NE"
Theater NYC,theater,info@theater.com,"789 Broadway, NY"`;

    beforeEach(async () => {
      renderDialog();

      mockFileReader.result = validCSV;

      const mockFile = new File([validCSV], 'test.csv', { type: 'text/csv' });

      const fileInputElement = document.createElement('input');
      fileInputElement.type = 'file';
      Object.defineProperty(fileInputElement, 'files', {
        value: [mockFile],
        writable: false
      });

      fireEvent.change(fileInputElement);

      // Simulate FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: validCSV } } as any);
      }

      await waitFor(() => {
        expect(screen.getByText(/Ready to import 2 organization/i)).toBeInTheDocument();
      });
    });

    it('starts import when import button is clicked', async () => {
      const mockImportResult = {
        successCount: 2,
        failureCount: 0,
        failures: [],
        processingTime: 1500
      };

      mockOrganizationService.bulkImportOrganizations.mockResolvedValue(mockImportResult);

      const importButton = screen.getByRole('button', { name: /import organizations/i });
      await userEvent.click(importButton);

      expect(screen.getByText('Importing organizations...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      await waitFor(() => {
        expect(mockOrganizationService.bulkImportOrganizations).toHaveBeenCalledWith([
          {
            name: 'Lincoln High School',
            type: 'school',
            contactEmail: 'contact@lincoln.edu',
            contactPhone: undefined,
            address: '123 Main St, Lincoln, NE',
            shippingAddress: undefined
          },
          {
            name: 'Theater NYC',
            type: 'theater',
            contactEmail: 'info@theater.com',
            contactPhone: undefined,
            address: '789 Broadway, NY',
            shippingAddress: undefined
          }
        ]);
      });
    });

    it('shows success results after import', async () => {
      const mockImportResult = {
        successCount: 2,
        failureCount: 0,
        failures: [],
        processingTime: 1500
      };

      mockOrganizationService.bulkImportOrganizations.mockResolvedValue(mockImportResult);

      const importButton = screen.getByRole('button', { name: /import organizations/i });
      await userEvent.click(importButton);

      await waitFor(() => {
        expect(screen.getByText('Import Completed')).toBeInTheDocument();
        expect(screen.getByText('2 organizations imported successfully')).toBeInTheDocument();
        expect(screen.getByText('Processing time: 1.50 seconds')).toBeInTheDocument();
      });

      expect(mockOnImportCompleted).toHaveBeenCalledWith(2);
    });

    it('shows partial success with failures', async () => {
      const mockImportResult = {
        successCount: 1,
        failureCount: 1,
        failures: [
          {
            rowNumber: 2,
            organizationName: 'Theater NYC',
            error: 'Organization name already exists',
            validationErrors: ['Duplicate name']
          }
        ],
        processingTime: 1200
      };

      mockOrganizationService.bulkImportOrganizations.mockResolvedValue(mockImportResult);

      const importButton = screen.getByRole('button', { name: /import organizations/i });
      await userEvent.click(importButton);

      await waitFor(() => {
        expect(screen.getByText('Import Completed')).toBeInTheDocument();
        expect(screen.getByText('1 organizations imported successfully, 1 failed')).toBeInTheDocument();
        expect(screen.getByText('1 organization(s) failed to import')).toBeInTheDocument();
      });

      expect(mockOnImportCompleted).toHaveBeenCalledWith(1);
    });

    it('shows expandable failure details', async () => {
      const mockImportResult = {
        successCount: 0,
        failureCount: 2,
        failures: [
          {
            rowNumber: 1,
            organizationName: 'Lincoln High School',
            error: 'Validation failed',
            validationErrors: ['Name already exists', 'Invalid email format']
          },
          {
            rowNumber: 2,
            organizationName: 'Theater NYC',
            error: 'Database error',
            validationErrors: []
          }
        ],
        processingTime: 800
      };

      mockOrganizationService.bulkImportOrganizations.mockResolvedValue(mockImportResult);

      const importButton = screen.getByRole('button', { name: /import organizations/i });
      await userEvent.click(importButton);

      await waitFor(() => {
        expect(screen.getByText('2 organization(s) failed to import')).toBeInTheDocument();
      });

      // Expand failure details
      const expandButton = screen.getByRole('button', { name: /expand/i });
      await userEvent.click(expandButton);

      expect(screen.getByText('Row 1: Lincoln High School')).toBeInTheDocument();
      expect(screen.getByText('Name already exists')).toBeInTheDocument();
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      expect(screen.getByText('Row 2: Theater NYC')).toBeInTheDocument();
    });

    it('handles import errors', async () => {
      const error = new Error('Network error during import');
      mockOrganizationService.bulkImportOrganizations.mockRejectedValue(error);

      const importButton = screen.getByRole('button', { name: /import organizations/i });
      await userEvent.click(importButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Network error during import');
      });
    });

    it('disables import button when no valid data', () => {
      // This test would require setting up invalid CSV data first
      renderDialog();

      const importButton = screen.getByRole('button', { name: /import organizations/i });
      expect(importButton).toBeDisabled();
    });

    it('disables form during import', async () => {
      mockOrganizationService.bulkImportOrganizations.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          successCount: 2,
          failureCount: 0,
          failures: [],
          processingTime: 1500
        }), 100))
      );

      const importButton = screen.getByRole('button', { name: /import organizations/i });
      await userEvent.click(importButton);

      expect(importButton).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });
  });

  describe('Dialog State Management', () => {
    it('resets form when dialog opens', () => {
      const { rerender } = renderDialog(false);

      rerender(
        <TestWrapper>
          <BulkImportDialog
            open={true}
            onClose={mockOnClose}
            onImportCompleted={mockOnImportCompleted}
            onError={mockOnError}
          />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /select csv file/i })).toBeInTheDocument();
      expect(screen.queryByText(/Ready to import/i)).not.toBeInTheDocument();
    });

    it('calls onClose when dialog is closed', async () => {
      renderDialog();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('prevents closing during import', async () => {
      renderDialog();

      // Set up data for import
      const validCSV = 'Name,Type,ContactEmail,Address\nTest,school,test@example.com,123 Main St';
      mockFileReader.result = validCSV;

      const mockFile = new File([validCSV], 'test.csv', { type: 'text/csv' });
      const fileInputElement = document.createElement('input');
      fileInputElement.type = 'file';
      Object.defineProperty(fileInputElement, 'files', {
        value: [mockFile],
        writable: false
      });

      fireEvent.change(fileInputElement);

      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: validCSV } } as any);
      }

      await waitFor(() => {
        expect(screen.getByText(/Ready to import 1 organization/i)).toBeInTheDocument();
      });

      // Start import with delay
      mockOrganizationService.bulkImportOrganizations.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          successCount: 1,
          failureCount: 0,
          failures: [],
          processingTime: 1000
        }), 100))
      );

      const importButton = screen.getByRole('button', { name: /import organizations/i });
      await userEvent.click(importButton);

      // During import, cancel should be disabled
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });

    it('changes button text to Close after successful import', async () => {
      const validCSV = 'Name,Type,ContactEmail,Address\nTest,school,test@example.com,123 Main St';

      renderDialog();

      mockFileReader.result = validCSV;

      const mockFile = new File([validCSV], 'test.csv', { type: 'text/csv' });
      const fileInputElement = document.createElement('input');
      fileInputElement.type = 'file';
      Object.defineProperty(fileInputElement, 'files', {
        value: [mockFile],
        writable: false
      });

      fireEvent.change(fileInputElement);

      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: validCSV } } as any);
      }

      await waitFor(() => {
        expect(screen.getByText(/Ready to import 1 organization/i)).toBeInTheDocument();
      });

      mockOrganizationService.bulkImportOrganizations.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        failures: [],
        processingTime: 1000
      });

      const importButton = screen.getByRole('button', { name: /import organizations/i });
      await userEvent.click(importButton);

      await waitFor(() => {
        expect(screen.getByText('Import Completed')).toBeInTheDocument();
      });

      // Button should now say "Close" instead of "Cancel"
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderDialog();

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/bulk import organizations/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      renderDialog();

      // Tab through interactive elements
      await userEvent.tab();
      expect(screen.getByRole('button', { name: /download csv template/i })).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByRole('button', { name: /select csv file/i })).toHaveFocus();
    });

    it('has proper heading hierarchy', () => {
      renderDialog();

      expect(screen.getByRole('heading', { name: /bulk import organizations/i })).toBeInTheDocument();
    });

    it('provides descriptive text for screen readers', () => {
      renderDialog();

      expect(screen.getByText(/Import multiple organizations from a CSV file/i)).toBeInTheDocument();
      expect(screen.getByText(/Maximum 1000 organizations per import/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles FileReader errors', async () => {
      renderDialog();

      const mockFile = new File(['csv,content'], 'test.csv', { type: 'text/csv' });

      const fileInputElement = document.createElement('input');
      fileInputElement.type = 'file';
      Object.defineProperty(fileInputElement, 'files', {
        value: [mockFile],
        writable: false
      });

      fireEvent.change(fileInputElement);

      // Simulate FileReader error
      if (mockFileReader.onerror) {
        mockFileReader.onerror({} as any);
      }

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Failed to read the selected file');
      });
    });

    it('handles empty CSV files', async () => {
      const emptyCSV = '';

      renderDialog();

      mockFileReader.result = emptyCSV;

      const mockFile = new File([emptyCSV], 'empty.csv', { type: 'text/csv' });

      const fileInputElement = document.createElement('input');
      fileInputElement.type = 'file';
      Object.defineProperty(fileInputElement, 'files', {
        value: [mockFile],
        writable: false
      });

      fireEvent.change(fileInputElement);

      // Simulate FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: emptyCSV } } as any);
      }

      await waitFor(() => {
        expect(screen.getByText(/CSV file must contain at least a header row and one data row/i)).toBeInTheDocument();
      });
    });

    it('handles malformed CSV data', async () => {
      const malformedCSV = 'Name,Type,Email\n"Unclosed quote,school,test@example.com';

      renderDialog();

      mockFileReader.result = malformedCSV;

      const mockFile = new File([malformedCSV], 'malformed.csv', { type: 'text/csv' });

      const fileInputElement = document.createElement('input');
      fileInputElement.type = 'file';
      Object.defineProperty(fileInputElement, 'files', {
        value: [malformedCSV],
        writable: false
      });

      fireEvent.change(fileInputElement);

      // Simulate FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: malformedCSV } } as any);
      }

      await waitFor(() => {
        expect(screen.getByText(/Failed to parse CSV data/i)).toBeInTheDocument();
      });
    });
  });
});