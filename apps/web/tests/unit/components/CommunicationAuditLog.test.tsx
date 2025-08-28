import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CommunicationAuditLog } from '../../../src/components/communication/CommunicationAuditLog';

// Mock the API service
const mockApiService = {
  searchCommunicationLogs: vi.fn(),
};

// Mock the ThemeProvider and Material-UI components
vi.mock('@mui/material', () => ({
  Table: ({ children, ...props }: any) => <table {...props}>{children}</table>,
  TableBody: ({ children, ...props }: any) => <tbody {...props}>{children}</tbody>,
  TableCell: ({ children, ...props }: any) => <td {...props}>{children}</td>,
  TableContainer: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  TableHead: ({ children, ...props }: any) => <thead {...props}>{children}</thead>,
  TableRow: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  Paper: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  IconButton: ({ children, onClick, 'aria-label': ariaLabel, ...props }: any) => (
    <button onClick={onClick} aria-label={ariaLabel} {...props}>{children}</button>
  ),
  Collapse: ({ children, in: inProp, ...props }: any) => 
    inProp ? <div {...props}>{children}</div> : null,
  Chip: ({ label, color, ...props }: any) => (
    <span className={`chip-${color}`} {...props}>{label}</span>
  ),
  Box: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Typography: ({ children, variant, ...props }: any) => (
    <div className={`typography-${variant}`} {...props}>{children}</div>
  ),
  TablePagination: ({ count, page, rowsPerPage, onPageChange, onRowsPerPageChange, ...props }: any) => (
    <div data-testid="table-pagination" {...props}>
      <span>Rows: {rowsPerPage}</span>
      <span>Page: {page + 1} of {Math.ceil(count / rowsPerPage)}</span>
      <button onClick={(e) => onPageChange(e, Math.max(0, page - 1))}>Previous</button>
      <button onClick={(e) => onPageChange(e, Math.min(Math.ceil(count / rowsPerPage) - 1, page + 1))}>Next</button>
    </div>
  ),
  Alert: ({ children, severity, ...props }: any) => (
    <div className={`alert-${severity}`} {...props}>{children}</div>
  ),
  CircularProgress: (props: any) => <div data-testid="loading-spinner" {...props}>Loading...</div>,
}));

vi.mock('@mui/icons-material', () => ({
  ExpandMore: () => <span data-testid="ExpandMoreIcon">▼</span>,
  ExpandLess: () => <span data-testid="ExpandLessIcon">▲</span>,
  Email: () => <span data-testid="EmailIcon">📧</span>,
  Sms: () => <span data-testid="SmsIcon">📱</span>,
  CheckCircle: () => <span data-testid="CheckCircleIcon">✓</span>,
  Error: () => <span data-testid="ErrorIcon">✗</span>,
  Schedule: () => <span data-testid="ScheduleIcon">⏰</span>,
}));

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryFn, enabled }: any) => {
    const [data, setData] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
      if (enabled !== false) {
        queryFn()
          .then((result: any) => {
            setData(result);
            setIsLoading(false);
          })
          .catch((err: any) => {
            setError(err);
            setIsLoading(false);
          });
      }
    }, [queryFn, enabled]);

    return { data, isLoading, error, refetch: vi.fn() };
  },
}));

describe('CommunicationAuditLog', () => {
  const mockCommunications = [
    {
      id: 'comm-1',
      orderId: 'order-123',
      communicationType: 'Email',
      senderId: 'sender-1',
      recipientEmail: 'test@example.com',
      subject: 'Order Update',
      content: 'Your order has been updated.',
      deliveryStatus: 'Delivered',
      sentAt: '2024-01-15T10:30:00Z',
      deliveredAt: '2024-01-15T10:31:00Z',
      externalMessageId: 'ext-123',
      createdAt: '2024-01-15T10:30:00Z'
    },
    {
      id: 'comm-2',
      orderId: 'order-456',
      communicationType: 'SMS',
      senderId: 'sender-2',
      recipientPhone: '+1234567890',
      subject: null,
      content: 'SMS notification sent',
      deliveryStatus: 'Failed',
      sentAt: '2024-01-15T11:00:00Z',
      deliveredAt: null,
      externalMessageId: 'sms-456',
      failureReason: 'Invalid phone number',
      createdAt: '2024-01-15T11:00:00Z'
    }
  ];

  const mockSearchResult = {
    logs: mockCommunications,
    totalCount: 2,
    page: 1,
    pageSize: 25,
    hasNextPage: false,
    statusSummary: {
      'Delivered': 1,
      'Failed': 1
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiService.searchCommunicationLogs.mockResolvedValue(mockSearchResult);
  });

  it('renders communication audit log table with data', async () => {
    render(<CommunicationAuditLog organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Check table headers
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Recipient')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Sent At')).toBeInTheDocument();

    // Check data rows
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('+1234567890')).toBeInTheDocument();
    expect(screen.getByText('Order Update')).toBeInTheDocument();
  });

  it('displays correct status chips with appropriate styling', async () => {
    render(<CommunicationAuditLog organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Check status chips
    const deliveredChip = screen.getByText('Delivered');
    const failedChip = screen.getByText('Failed');

    expect(deliveredChip).toBeInTheDocument();
    expect(failedChip).toBeInTheDocument();

    // Check chip classes for styling
    expect(deliveredChip.closest('.chip-success')).toBeInTheDocument();
    expect(failedChip.closest('.chip-error')).toBeInTheDocument();
  });

  it('shows communication type icons correctly', async () => {
    render(<CommunicationAuditLog organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Check for email and SMS icons
    expect(screen.getByTestId('EmailIcon')).toBeInTheDocument();
    expect(screen.getByTestId('SmsIcon')).toBeInTheDocument();
  });

  it('expands and collapses row details on button click', async () => {
    const user = userEvent.setup();
    render(<CommunicationAuditLog organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Find expand button for first row
    const expandButtons = screen.getAllByLabelText(/expand/i);
    const firstExpandButton = expandButtons[0];

    // Initially, details should not be visible
    expect(screen.queryByText('Message Details')).not.toBeInTheDocument();

    // Click to expand
    await user.click(firstExpandButton);

    // Details should now be visible
    expect(screen.getByText('Message Details')).toBeInTheDocument();
    expect(screen.getByText('Your order has been updated.')).toBeInTheDocument();
    expect(screen.getByText('External Message ID:')).toBeInTheDocument();
    expect(screen.getByText('ext-123')).toBeInTheDocument();

    // Click to collapse
    await user.click(firstExpandButton);

    // Details should be hidden again
    expect(screen.queryByText('Message Details')).not.toBeInTheDocument();
  });

  it('shows failure reason in expanded details for failed communications', async () => {
    const user = userEvent.setup();
    render(<CommunicationAuditLog organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Find and click expand button for the failed SMS (second row)
    const expandButtons = screen.getAllByLabelText(/expand/i);
    const secondExpandButton = expandButtons[1];

    await user.click(secondExpandButton);

    // Check for failure reason
    expect(screen.getByText('Failure Reason:')).toBeInTheDocument();
    expect(screen.getByText('Invalid phone number')).toBeInTheDocument();
  });

  it('handles pagination correctly', async () => {
    const user = userEvent.setup();
    
    // Mock data with more items to test pagination
    const paginatedResult = {
      ...mockSearchResult,
      totalCount: 50,
      hasNextPage: true
    };
    mockApiService.searchCommunicationLogs.mockResolvedValue(paginatedResult);

    render(<CommunicationAuditLog organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Check pagination component is present
    const pagination = screen.getByTestId('table-pagination');
    expect(pagination).toBeInTheDocument();
    expect(within(pagination).getByText(/Page: 1 of/)).toBeInTheDocument();

    // Click next page
    const nextButton = within(pagination).getByText('Next');
    await user.click(nextButton);

    // Should trigger new search with updated page
    expect(mockApiService.searchCommunicationLogs).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 })
    );
  });

  it('applies search filters correctly', async () => {
    render(<CommunicationAuditLog 
      organizationId="org-123" 
      filters={{
        communicationType: ['Email'],
        deliveryStatus: ['Delivered'],
        searchTerm: 'order'
      }}
    />);

    await waitFor(() => {
      expect(mockApiService.searchCommunicationLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-123',
          communicationType: ['Email'],
          deliveryStatus: ['Delivered'],
          searchTerm: 'order'
        })
      );
    });
  });

  it('displays loading state correctly', () => {
    mockApiService.searchCommunicationLogs.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(<CommunicationAuditLog organizationId="org-123" />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('displays error state when API fails', async () => {
    mockApiService.searchCommunicationLogs.mockRejectedValue(
      new Error('Failed to load communications')
    );

    render(<CommunicationAuditLog organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load/)).toBeInTheDocument();
    });

    // Check error alert styling
    expect(screen.getByText(/Failed to load/).closest('.alert-error')).toBeInTheDocument();
  });

  it('displays empty state when no communications found', async () => {
    mockApiService.searchCommunicationLogs.mockResolvedValue({
      logs: [],
      totalCount: 0,
      page: 1,
      pageSize: 25,
      hasNextPage: false,
      statusSummary: {}
    });

    render(<CommunicationAuditLog organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.getByText(/No communications found/)).toBeInTheDocument();
    });
  });

  it('formats dates correctly', async () => {
    render(<CommunicationAuditLog organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Check for formatted dates (assuming the component formats dates)
    // This would depend on the actual date formatting implementation
    const dateElements = screen.getAllByText(/Jan 15, 2024/);
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it('handles refresh functionality', async () => {
    const user = userEvent.setup();
    render(<CommunicationAuditLog organizationId="org-123" showRefresh />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Find and click refresh button
    const refreshButton = screen.getByLabelText(/refresh/i);
    await user.click(refreshButton);

    // Should trigger another API call
    expect(mockApiService.searchCommunicationLogs).toHaveBeenCalledTimes(2);
  });

  it('supports real-time updates when autoRefresh is enabled', async () => {
    vi.useFakeTimers();
    
    render(<CommunicationAuditLog organizationId="org-123" autoRefresh={5000} />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Initial call
    expect(mockApiService.searchCommunicationLogs).toHaveBeenCalledTimes(1);

    // Fast-forward 5 seconds
    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(mockApiService.searchCommunicationLogs).toHaveBeenCalledTimes(2);
    });

    vi.useRealTimers();
  });

  it('handles row selection for bulk operations', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();

    render(<CommunicationAuditLog 
      organizationId="org-123" 
      selectable
      onSelectionChange={onSelectionChange}
    />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Find and click checkbox for first row
    const checkboxes = screen.getAllByRole('checkbox');
    const firstRowCheckbox = checkboxes[1]; // Skip header checkbox

    await user.click(firstRowCheckbox);

    expect(onSelectionChange).toHaveBeenCalledWith(['comm-1']);
  });
});