import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ComplianceReportingDashboard } from '../../../src/components/communication/ComplianceReportingDashboard';

// Mock Chart.js components
vi.mock('react-chartjs-2', () => ({
  Bar: ({ data, options, ...props }: any) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} {...props}>
      <div>Bar Chart</div>
      {data.datasets[0]?.data?.map((value: number, index: number) => (
        <div key={index} data-testid={`bar-${index}`}>{value}</div>
      ))}
    </div>
  ),
  Doughnut: ({ data, options, ...props }: any) => (
    <div data-testid="doughnut-chart" data-chart-data={JSON.stringify(data)} {...props}>
      <div>Doughnut Chart</div>
      {data.datasets[0]?.data?.map((value: number, index: number) => (
        <div key={index} data-testid={`segment-${index}`}>{value}</div>
      ))}
    </div>
  ),
  Line: ({ data, options, ...props }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)} {...props}>
      <div>Line Chart</div>
      {data.datasets[0]?.data?.map((value: number, index: number) => (
        <div key={index} data-testid={`point-${index}`}>{value}</div>
      ))}
    </div>
  ),
}));

// Mock Chart.js registration
vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
  },
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  BarElement: vi.fn(),
  ArcElement: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
}));

// Mock Material-UI components
vi.mock('@mui/material', () => ({
  Card: ({ children, ...props }: any) => <div className="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div className="card-content" {...props}>{children}</div>,
  CardHeader: ({ title, subheader, ...props }: any) => (
    <div className="card-header" {...props}>
      <div className="card-title">{title}</div>
      {subheader && <div className="card-subheader">{subheader}</div>}
    </div>
  ),
  Typography: ({ children, variant, color, ...props }: any) => (
    <div className={`typography-${variant} color-${color || 'default'}`} {...props}>{children}</div>
  ),
  Grid: ({ children, item, xs, md, lg, container, ...props }: any) => (
    <div className={`grid-${container ? 'container' : 'item'}-${xs || md || lg || 12}`} {...props}>
      {children}
    </div>
  ),
  Box: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Button: ({ children, onClick, variant, color, startIcon, ...props }: any) => (
    <button 
      onClick={onClick} 
      className={`btn-${variant || 'contained'}-${color || 'primary'}`} 
      {...props}
    >
      {startIcon}
      {children}
    </button>
  ),
  IconButton: ({ children, onClick, 'aria-label': ariaLabel, ...props }: any) => (
    <button onClick={onClick} aria-label={ariaLabel} {...props}>{children}</button>
  ),
  Chip: ({ label, color, size, ...props }: any) => (
    <span className={`chip-${color}-${size}`} {...props}>{label}</span>
  ),
  LinearProgress: ({ value, variant, ...props }: any) => (
    <div className={`progress-${variant}`} data-value={value} {...props}>
      <div className="progress-bar" style={{ width: `${value || 0}%` }} />
    </div>
  ),
  CircularProgress: (props: any) => <div data-testid="loading-spinner" {...props}>Loading...</div>,
  Alert: ({ children, severity, ...props }: any) => (
    <div className={`alert-${severity}`} {...props}>{children}</div>
  ),
  Tooltip: ({ children, title }: any) => (
    <div title={title}>{children}</div>
  ),
}));

vi.mock('@mui/icons-material', () => ({
  Download: () => <span data-testid="DownloadIcon">⬇</span>,
  Refresh: () => <span data-testid="RefreshIcon">🔄</span>,
  TrendingUp: () => <span data-testid="TrendingUpIcon">📈</span>,
  TrendingDown: () => <span data-testid="TrendingDownIcon">📉</span>,
  CheckCircle: () => <span data-testid="CheckCircleIcon">✓</span>,
  Error: () => <span data-testid="ErrorIcon">✗</span>,
  Email: () => <span data-testid="EmailIcon">📧</span>,
  Sms: () => <span data-testid="SmsIcon">📱</span>,
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

// Mock API service
const mockApiService = {
  getDeliveryStatusSummary: vi.fn(),
  generateComplianceReport: vi.fn(),
};

describe('ComplianceReportingDashboard', () => {
  const mockSummaryData = {
    organizationId: 'org-123',
    from: new Date('2024-01-01').toISOString(),
    to: new Date('2024-01-31').toISOString(),
    totalCommunications: 1500,
    statusCounts: {
      'Delivered': 1200,
      'Failed': 200,
      'Sent': 100
    },
    typeCounts: {
      'Email': 1000,
      'SMS': 500
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiService.getDeliveryStatusSummary.mockResolvedValue(mockSummaryData);
  });

  it('renders dashboard with summary metrics', async () => {
    render(<ComplianceReportingDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Check for metric cards
    expect(screen.getByText('Total Communications')).toBeInTheDocument();
    expect(screen.getByText('1,500')).toBeInTheDocument();
    
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
    expect(screen.getByText('80.0%')).toBeInTheDocument(); // 1200/1500 = 80%
    
    expect(screen.getByText('Failed Communications')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
    
    expect(screen.getByText('Email Communications')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument();
  });

  it('displays delivery status breakdown chart', async () => {
    render(<ComplianceReportingDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Check for bar chart
    const barChart = screen.getByTestId('bar-chart');
    expect(barChart).toBeInTheDocument();
    
    // Verify chart data
    const chartData = JSON.parse(barChart.getAttribute('data-chart-data') || '{}');
    expect(chartData.labels).toEqual(['Delivered', 'Failed', 'Sent']);
    expect(chartData.datasets[0].data).toEqual([1200, 200, 100]);
  });

  it('displays communication type distribution chart', async () => {
    render(<ComplianceReportingDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Check for doughnut chart
    const doughnutChart = screen.getByTestId('doughnut-chart');
    expect(doughnutChart).toBeInTheDocument();
    
    // Verify chart data
    const chartData = JSON.parse(doughnutChart.getAttribute('data-chart-data') || '{}');
    expect(chartData.labels).toEqual(['Email', 'SMS']);
    expect(chartData.datasets[0].data).toEqual([1000, 500]);
  });

  it('calculates and displays success rate correctly', async () => {
    render(<ComplianceReportingDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Success rate should be calculated as Delivered / Total
    expect(screen.getByText('80.0%')).toBeInTheDocument();
    
    // Check for trending indicator
    expect(screen.getByTestId('TrendingUpIcon')).toBeInTheDocument();
  });

  it('shows failure rate and analysis', async () => {
    render(<ComplianceReportingDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Failure rate should be calculated as Failed / Total
    const failureRate = (200 / 1500 * 100).toFixed(1);
    expect(screen.getByText(`${failureRate}%`)).toBeInTheDocument();
  });

  it('handles refresh functionality', async () => {
    const user = userEvent.setup();
    render(<ComplianceReportingDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Find and click refresh button
    const refreshButton = screen.getByLabelText(/refresh/i);
    await user.click(refreshButton);

    // Should trigger another API call
    expect(mockApiService.getDeliveryStatusSummary).toHaveBeenCalledTimes(2);
  });

  it('handles PDF report generation', async () => {
    const user = userEvent.setup();
    mockApiService.generateComplianceReport.mockResolvedValue(new Blob(['PDF content'], { type: 'application/pdf' }));
    
    render(<ComplianceReportingDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Find and click generate report button
    const generateButton = screen.getByText(/generate report/i);
    await user.click(generateButton);

    expect(mockApiService.generateComplianceReport).toHaveBeenCalledWith({
      organizationId: 'org-123',
      dateFrom: expect.any(Date),
      dateTo: expect.any(Date),
      includeCharts: true,
      includeFailureAnalysis: true
    });
  });

  it('displays loading state correctly', () => {
    mockApiService.getDeliveryStatusSummary.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(<ComplianceReportingDashboard organizationId="org-123" />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('displays error state when API fails', async () => {
    mockApiService.getDeliveryStatusSummary.mockRejectedValue(
      new Error('Failed to load dashboard data')
    );

    render(<ComplianceReportingDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load dashboard data/)).toBeInTheDocument();
    });

    // Check error alert styling
    expect(screen.getByText(/Failed to load dashboard data/).closest('.alert-error')).toBeInTheDocument();
  });

  it('handles date range changes', async () => {
    const user = userEvent.setup();
    render(<ComplianceReportingDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Find date range inputs (if available)
    const fromDateInput = screen.queryByLabelText(/from date/i);
    const toDateInput = screen.queryByLabelText(/to date/i);

    if (fromDateInput && toDateInput) {
      await user.type(fromDateInput, '2024-02-01');
      await user.type(toDateInput, '2024-02-29');

      // Should trigger new API call with updated date range
      expect(mockApiService.getDeliveryStatusSummary).toHaveBeenCalledWith(
        'org-123',
        expect.any(Date),
        expect.any(Date)
      );
    }
  });

  it('displays trend indicators based on performance', async () => {
    // Test with high success rate
    const highSuccessData = {
      ...mockSummaryData,
      statusCounts: {
        'Delivered': 1400,
        'Failed': 50,
        'Sent': 50
      }
    };

    mockApiService.getDeliveryStatusSummary.mockResolvedValue(highSuccessData);
    
    render(<ComplianceReportingDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Should show trending up icon for high success rate
    expect(screen.getByTestId('TrendingUpIcon')).toBeInTheDocument();
  });

  it('formats numbers with proper thousand separators', async () => {
    const largeNumberData = {
      ...mockSummaryData,
      totalCommunications: 125000,
      statusCounts: {
        'Delivered': 100000,
        'Failed': 15000,
        'Sent': 10000
      }
    };

    mockApiService.getDeliveryStatusSummary.mockResolvedValue(largeNumberData);
    
    render(<ComplianceReportingDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Should display properly formatted numbers
    expect(screen.getByText('125,000')).toBeInTheDocument();
    expect(screen.getByText('100,000')).toBeInTheDocument();
  });

  it('shows empty state when no data available', async () => {
    const emptyData = {
      ...mockSummaryData,
      totalCommunications: 0,
      statusCounts: {},
      typeCounts: {}
    };

    mockApiService.getDeliveryStatusSummary.mockResolvedValue(emptyData);
    
    render(<ComplianceReportingDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/No communications data available/)).toBeInTheDocument();
  });

  it('displays period comparison when historical data is available', async () => {
    const dataWithComparison = {
      ...mockSummaryData,
      previousPeriod: {
        totalCommunications: 1200,
        successRate: 0.75
      }
    };

    mockApiService.getDeliveryStatusSummary.mockResolvedValue(dataWithComparison);
    
    render(<ComplianceReportingDashboard organizationId="org-123" />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Should show comparison indicators
    expect(screen.getByText(/vs previous period/i)).toBeInTheDocument();
    expect(screen.getByText(/+25.0%/)).toBeInTheDocument(); // (1500-1200)/1200 = 25% increase
  });

  it('handles real-time updates when autoRefresh is enabled', async () => {
    vi.useFakeTimers();
    
    render(<ComplianceReportingDashboard organizationId="org-123" autoRefresh={30000} />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    // Initial call
    expect(mockApiService.getDeliveryStatusSummary).toHaveBeenCalledTimes(1);

    // Fast-forward 30 seconds
    vi.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(mockApiService.getDeliveryStatusSummary).toHaveBeenCalledTimes(2);
    });

    vi.useRealTimers();
  });
});