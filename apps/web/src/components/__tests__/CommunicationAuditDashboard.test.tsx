import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { CommunicationAuditDashboard } from '../CommunicationAuditDashboard';
import { useCommunicationAudit } from '../../hooks/useCommunicationAudit';
import type { CommunicationAuditResult, DeliveryStatusSummary } from '../../types/communicationAudit';

// Mock the hook
jest.mock('../../hooks/useCommunicationAudit');

const mockUseCommunicationAudit = useCommunicationAudit as jest.MockedFunction<typeof useCommunicationAudit>;

/**
 * Test wrapper component with required providers
 */
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <LocalizationProvider dateAdapter={AdapterDateFns}>
    {children}
  </LocalizationProvider>
);

/**
 * Unit tests for CommunicationAuditDashboard component
 */
describe('CommunicationAuditDashboard', () => {
  // Mock data
  const mockSearchResults: CommunicationAuditResult = {
    logs: [
      {
        id: '1',
        orderId: 'order-1',
        communicationType: 'Email',
        subject: 'Order Update',
        content: 'Your order has been updated',
        deliveryStatus: 'Delivered',
        sentAt: '2024-01-15T10:00:00Z',
        createdAt: '2024-01-15T10:00:00Z',
        senderId: 'sender-1'
      },
      {
        id: '2',
        orderId: 'order-2',
        communicationType: 'SMS',
        subject: null,
        content: 'SMS notification',
        deliveryStatus: 'Failed',
        sentAt: '2024-01-15T11:00:00Z',
        createdAt: '2024-01-15T11:00:00Z',
        senderId: 'sender-2'
      }
    ],
    totalCount: 2,
    page: 1,
    pageSize: 20,
    hasNextPage: false,
    hasPreviousPage: false,
    totalPages: 1,
    statusSummary: { 'Delivered': 1, 'Failed': 1 },
    typeSummary: { 'Email': 1, 'SMS': 1 }
  };

  const mockDeliverySummary: DeliveryStatusSummary = {
    organizationId: 'org-1',
    from: '2024-01-01T00:00:00Z',
    to: '2024-01-31T23:59:59Z',
    totalCommunications: 100,
    statusCounts: { 'Delivered': 85, 'Failed': 15 },
    typeCounts: { 'Email': 70, 'SMS': 30 },
    dailyVolume: [],
    deliverySuccessRate: 85.0,
    topFailureReasons: [],
    peakHour: 14,
    hourlyVolume: {}
  };

  const defaultMockHook = {
    searchResults: mockSearchResults,
    deliverySummary: mockDeliverySummary,
    loading: false,
    error: null,
    searchCommunications: jest.fn(),
    getDeliverySummary: jest.fn(),
    exportCommunications: jest.fn(),
    getOrderHistory: jest.fn(),
    getCommunicationLog: jest.fn(),
    getEditHistory: jest.fn(),
    getDeliveryLogs: jest.fn(),
    getExportEstimation: jest.fn(),
    getSearchSuggestions: jest.fn(),
    getSearchFacets: jest.fn(),
    clearError: jest.fn(),
    refreshResults: jest.fn()
  };

  beforeEach(() => {
    mockUseCommunicationAudit.mockReturnValue(defaultMockHook);
    jest.clearAllMocks();
  });

  /**
   * Test initial rendering with summary cards
   */
  it('renders dashboard with summary cards', () => {
    render(
      <TestWrapper>
        <CommunicationAuditDashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Communication Audit Trail')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument(); // Total communications
    expect(screen.getByText('85.0%')).toBeInTheDocument(); // Success rate
    expect(screen.getByText('15')).toBeInTheDocument(); // Failed deliveries
    expect(screen.getByText('14:00')).toBeInTheDocument(); // Peak hour
  });

  /**
   * Test search functionality
   */
  it('handles search input and submission', async () => {
    const user = userEvent.setup();
    const mockSearch = jest.fn();
    mockUseCommunicationAudit.mockReturnValue({
      ...defaultMockHook,
      searchCommunications: mockSearch
    });

    render(
      <TestWrapper>
        <CommunicationAuditDashboard />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('Search communications...');
    const searchButton = screen.getByRole('button', { name: /search/i });

    await user.type(searchInput, 'order update');
    await user.click(searchButton);

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        searchTerm: 'order update',
        page: 1,
        pageSize: 20
      })
    );
  });

  /**
   * Test search on Enter key press
   */
  it('triggers search when Enter key is pressed', async () => {
    const user = userEvent.setup();
    const mockSearch = jest.fn();
    mockUseCommunicationAudit.mockReturnValue({
      ...defaultMockHook,
      searchCommunications: mockSearch
    });

    render(
      <TestWrapper>
        <CommunicationAuditDashboard />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('Search communications...');
    await user.type(searchInput, 'test search{enter}');

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        searchTerm: 'test search'
      })
    );
  });

  /**
   * Test results table rendering
   */
  it('displays communication logs in table', () => {
    render(
      <TestWrapper>
        <CommunicationAuditDashboard />
      </TestWrapper>
    );

    expect(screen.getByText('Order Update')).toBeInTheDocument();
    expect(screen.getByText('SMS notification')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('SMS')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  /**
   * Test loading state
   */
  it('shows loading indicator when loading', () => {
    mockUseCommunicationAudit.mockReturnValue({
      ...defaultMockHook,
      loading: true,
      searchResults: null
    });

    render(
      <TestWrapper>
        <CommunicationAuditDashboard />
      </TestWrapper>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  /**
   * Test error state
   */
  it('displays error alert when error occurs', () => {
    const errorMessage = 'Failed to load communications';
    mockUseCommunicationAudit.mockReturnValue({
      ...defaultMockHook,
      error: errorMessage
    });

    render(
      <TestWrapper>
        <CommunicationAuditDashboard />
      </TestWrapper>
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-standardError');
  });

  /**
   * Test filters toggle
   */
  it('shows and hides advanced filters', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <CommunicationAuditDashboard />
      </TestWrapper>
    );

    const filtersButton = screen.getByRole('button', { name: /filters/i });
    
    // Filters should not be visible initially
    expect(screen.queryByLabelText('Communication Type')).not.toBeInTheDocument();

    // Click to show filters
    await user.click(filtersButton);
    expect(screen.getByLabelText('Communication Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Delivery Status')).toBeInTheDocument();

    // Click to hide filters
    await user.click(filtersButton);
    expect(screen.queryByLabelText('Communication Type')).not.toBeInTheDocument();
  });

  /**
   * Test communication type filter
   */
  it('applies communication type filter', async () => {
    const user = userEvent.setup();
    const mockSearch = jest.fn();
    mockUseCommunicationAudit.mockReturnValue({
      ...defaultMockHook,
      searchCommunications: mockSearch
    });

    render(
      <TestWrapper>
        <CommunicationAuditDashboard />
      </TestWrapper>
    );

    // Open filters
    await user.click(screen.getByRole('button', { name: /filters/i }));

    // Select communication type
    const typeSelect = screen.getByLabelText('Communication Type');
    await user.click(typeSelect);
    await user.click(screen.getByText('Email'));
    
    // Click outside to close the select
    await user.click(document.body);

    // Trigger search to apply filters
    await user.click(screen.getByRole('button', { name: /^search$/i }));

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        communicationType: ['Email']
      })
    );
  });

  /**
   * Test pagination
   */
  it('handles pagination changes', async () => {
    const user = userEvent.setup();
    const mockSearch = jest.fn();
    const paginatedResults = {
      ...mockSearchResults,
      totalCount: 50,
      hasNextPage: true
    };

    mockUseCommunicationAudit.mockReturnValue({
      ...defaultMockHook,
      searchResults: paginatedResults,
      searchCommunications: mockSearch
    });

    render(
      <TestWrapper>
        <CommunicationAuditDashboard />
      </TestWrapper>
    );

    // Click next page
    const nextPageButton = screen.getByLabelText('Go to next page');
    await user.click(nextPageButton);

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2
      })
    );
  });

  /**
   * Test page size change
   */
  it('handles page size changes', async () => {
    const user = userEvent.setup();
    const mockSearch = jest.fn();
    mockUseCommunicationAudit.mockReturnValue({
      ...defaultMockHook,
      searchCommunications: mockSearch
    });

    render(
      <TestWrapper>
        <CommunicationAuditDashboard />
      </TestWrapper>
    );

    // Change page size
    const pageSizeSelect = screen.getByDisplayValue('20');
    await user.click(pageSizeSelect);
    await user.click(screen.getByText('50'));

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        pageSize: 50,
        page: 1 // Should reset to first page
      })
    );
  });

  /**
   * Test export dialog opening
   */
  it('opens export dialog when export button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <CommunicationAuditDashboard />
      </TestWrapper>
    );

    const exportButton = screen.getByRole('button', { name: /export/i });
    await user.click(exportButton);

    expect(screen.getByText('Export Communication Data')).toBeInTheDocument();
  });

  /**
   * Test view details functionality
   */
  it('opens communication log viewer when view details is clicked', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <CommunicationAuditDashboard />
      </TestWrapper>
    );

    const viewButtons = screen.getAllByLabelText('View Details');
    await user.click(viewButtons[0]);

    expect(screen.getByText('Communication Details')).toBeInTheDocument();
  });

  /**
   * Test empty state when no results
   */
  it('handles empty search results', () => {
    const emptyResults = {
      ...mockSearchResults,
      logs: [],
      totalCount: 0
    };

    mockUseCommunicationAudit.mockReturnValue({
      ...defaultMockHook,
      searchResults: emptyResults
    });

    render(
      <TestWrapper>
        <CommunicationAuditDashboard />
      </TestWrapper>
    );

    // Table should still render but with no data rows
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument(); // Header should be present
  });

  /**
   * Test proper date formatting in results
   */
  it('formats dates correctly in the table', () => {
    render(
      <TestWrapper>
        <CommunicationAuditDashboard />
      </TestWrapper>
    );

    // Check if dates are formatted (exact format may vary by locale)
    const dateElements = screen.getAllByText(/2024/);
    expect(dateElements.length).toBeGreaterThan(0);
  });
});