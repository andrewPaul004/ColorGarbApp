import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Skeleton,
  useTheme,
  Tooltip
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assessment as ReportIcon,
  FileDownload as DownloadIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import type { DeliveryStatusSummary } from '../../types/shared';
import communicationAuditService from '../../services/communicationAuditService';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement
);

/**
 * Props for the ComplianceReportingDashboard component
 */
interface ComplianceReportingDashboardProps {
  /** Organization ID for compliance data */
  organizationId: string;
  /** Default date range in days */
  defaultDateRange?: number;
}

/**
 * Compliance reporting dashboard with charts, metrics, and export capabilities.
 * Provides visual insights into communication delivery performance.
 * 
 * @component
 * @since 3.4.0
 */
export const ComplianceReportingDashboard: React.FC<ComplianceReportingDashboardProps> = ({
  organizationId,
  defaultDateRange = 30
}) => {
  const theme = useTheme();
  const [summary, setSummary] = useState<DeliveryStatusSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Date range state
  const [dateFrom, setDateFrom] = useState<Date>(
    new Date(Date.now() - defaultDateRange * 24 * 60 * 60 * 1000)
  );
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const [dateRangePreset, setDateRangePreset] = useState<string>('30d');

  /**
   * Load compliance data
   */
  const loadComplianceData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await communicationAuditService.getDeliveryStatusSummary(
        organizationId,
        dateFrom,
        dateTo
      );
      setSummary(data);
    } catch (err) {
      console.error('Failed to load compliance data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  }, [organizationId, dateFrom, dateTo]);

  // Load data on mount and when dates change
  useEffect(() => {
    loadComplianceData();
  }, [loadComplianceData]);

  /**
   * Handle date range preset selection
   */
  const handleDateRangePreset = (preset: string) => {
    setDateRangePreset(preset);
    const now = new Date();
    
    switch (preset) {
      case '7d':
        setDateFrom(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
        break;
      case '30d':
        setDateFrom(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
        break;
      case '90d':
        setDateFrom(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000));
        break;
      case '1y':
        setDateFrom(new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000));
        break;
    }
    setDateTo(now);
  };

  /**
   * Generate compliance report
   */
  const handleGenerateReport = async () => {
    try {
      const blob = await communicationAuditService.generateComplianceReport({
        organizationId,
        dateFrom,
        dateTo,
        includeFailureAnalysis: true,
        includeCharts: true
      });
      
      const filename = `compliance-report-${dateFrom.toISOString().split('T')[0]}-to-${dateTo.toISOString().split('T')[0]}.pdf`;
      communicationAuditService.downloadBlob(blob, filename);
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  /**
   * Calculate success rate
   */
  const getSuccessRate = () => {
    if (!summary || summary.totalCommunications === 0) return 0;
    
    const failed = (summary.statusCounts.Failed || 0) + (summary.statusCounts.Bounced || 0);
    return ((summary.totalCommunications - failed) / summary.totalCommunications) * 100;
  };

  /**
   * Get status color
   */
  const getStatusColor = (rate: number) => {
    if (rate >= 95) return theme.palette.success.main;
    if (rate >= 85) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  /**
   * Render metric card
   */
  const renderMetricCard = (
    title: string,
    value: string | number,
    subtitle?: string,
    icon?: React.ReactNode,
    trend?: 'up' | 'down' | 'neutral',
    color?: string
  ) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="text.secondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ color }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {icon && (
            <Box sx={{ opacity: 0.7 }}>
              {icon}
            </Box>
          )}
        </Box>
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            {trend === 'up' && <TrendingUpIcon color="success" fontSize="small" />}
            {trend === 'down' && <TrendingDownIcon color="error" fontSize="small" />}
            <Typography variant="caption" sx={{ ml: 0.5 }}>
              vs previous period
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  /**
   * Render loading skeleton
   */
  if (loading && !summary) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Compliance Dashboard
        </Typography>
        
        <Grid container spacing={3}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" height={40} />
                  <Skeleton variant="text" width="80%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
          
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Skeleton variant="rectangular" height={300} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Compliance Dashboard
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!summary) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Compliance Dashboard
        </Typography>
        <Alert severity="info">No data available for the selected date range.</Alert>
      </Box>
    );
  }

  const successRate = getSuccessRate();

  // Prepare chart data
  const statusChartData = {
    labels: Object.keys(summary.statusCounts),
    datasets: [
      {
        data: Object.values(summary.statusCounts),
        backgroundColor: [
          theme.palette.success.main,
          theme.palette.info.main,
          theme.palette.warning.main,
          theme.palette.error.main,
          theme.palette.secondary.main,
          theme.palette.primary.main
        ],
        borderWidth: 0
      }
    ]
  };

  const typeChartData = {
    labels: Object.keys(summary.typeCounts),
    datasets: [
      {
        label: 'Communications by Type',
        data: Object.values(summary.typeCounts),
        backgroundColor: theme.palette.primary.main,
        borderColor: theme.palette.primary.dark,
        borderWidth: 1
      }
    ]
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">
            Compliance Dashboard
          </Typography>
          
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleGenerateReport}
            disabled={loading}
          >
            Generate Report
          </Button>
        </Box>

        {/* Date Range Controls */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Period</InputLabel>
              <Select
                value={dateRangePreset}
                onChange={(e) => handleDateRangePreset(e.target.value)}
                label="Period"
              >
                <MenuItem value="7d">Last 7 days</MenuItem>
                <MenuItem value="30d">Last 30 days</MenuItem>
                <MenuItem value="90d">Last 90 days</MenuItem>
                <MenuItem value="1y">Last year</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
              </Select>
            </FormControl>

            {dateRangePreset === 'custom' && (
              <>
                <DatePicker
                  label="From"
                  value={dateFrom}
                  onChange={(date) => setDateFrom(date || new Date())}
                  enableAccessibleFieldDOMStructure={false}
                  slotProps={{ textField: { size: 'small' } }}
                />
                <DatePicker
                  label="To"
                  value={dateTo}
                  onChange={(date) => setDateTo(date || new Date())}
                  enableAccessibleFieldDOMStructure={false}
                  slotProps={{ textField: { size: 'small' } }}
                />
              <>
            )}

            <Typography variant="body2" color="text.secondary">
              {dateFrom.toLocaleDateString()} - {dateTo.toLocaleDateString()}
            </Typography>
          </Box>
        </Paper>

        {/* Key Metrics */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            {renderMetricCard(
              'Total Communications',
              summary.totalCommunications.toLocaleString(),
              'All types combined',
              <ReportIcon fontSize="large" />
            )}
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            {renderMetricCard(
              'Success Rate',
              `${successRate.toFixed(1)}%`,
              'Delivered successfully',
              <SuccessIcon fontSize="large" />,
              successRate >= 95 ? 'up' : successRate >= 85 ? 'neutral' : 'down',
              getStatusColor(successRate)
            )}
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            {renderMetricCard(
              'Email Communications',
              (summary.typeCounts.Email || 0).toLocaleString(),
              `${((summary.typeCounts.Email || 0) / summary.totalCommunications * 100).toFixed(1)}% of total`,
              <EmailIcon fontSize="large" />
            )}
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            {renderMetricCard(
              'SMS Communications',
              (summary.typeCounts.SMS || 0).toLocaleString(),
              `${((summary.typeCounts.SMS || 0) / summary.totalCommunications * 100).toFixed(1)}% of total`,
              <SmsIcon fontSize="large" />
            )}
          </Grid>
        </Grid>

        {/* Status Breakdown */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Communications by Type
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Bar
                    data={typeChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true
                        }
                      }
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Delivery Status
                </Typography>
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Doughnut
                    data={statusChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            usePointStyle: true,
                            padding: 20
                          }
                        }
                      }
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Detailed Breakdown */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Status Details
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {Object.entries(summary.statusCounts).map(([status, count]) => {
                    const percentage = (count / summary.totalCommunications * 100).toFixed(1);
                    const getStatusIcon = (status: string) => {
                      switch (status.toLowerCase()) {
                        case 'delivered':
                        case 'read':
                        case 'opened':
                          return <SuccessIcon color="success" fontSize="small" />;
                        case 'failed':
                        case 'bounced':
                          return <ErrorIcon color="error" fontSize="small" />;
                        default:
                          return <PendingIcon color="warning" fontSize="small" />;
                      }
                    };

                    return (
                      <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {getStatusIcon(status)}
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {status}
                        </Typography>
                        <Chip 
                          label={`${count.toLocaleString()} (${percentage}%)`}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance Insights
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Alert 
                    severity={successRate >= 95 ? 'success' : successRate >= 85 ? 'warning' : 'error'}
                    icon={successRate >= 95 ? <SuccessIcon /> : undefined}
                  >
                    <Typography variant="body2">
                      {successRate >= 95 
                        ? 'Excellent delivery performance! Success rate exceeds 95%.'
                        : successRate >= 85
                        ? 'Good delivery performance. Consider investigating failed deliveries.'
                        : 'Delivery performance needs attention. High failure rate detected.'
                      }
                    </Typography>
                  </Alert>
                  
                  {(summary.statusCounts.Failed || 0) + (summary.statusCounts.Bounced || 0) > 0 && (
                    <Alert severity="info">
                      <Typography variant="body2">
                        {((summary.statusCounts.Failed || 0) + (summary.statusCounts.Bounced || 0))} failed deliveries detected. 
                        Review recipient lists and message content for improvements.
                      </Typography>
                    </Alert>
                  )}
                  
                  <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Recommendation:</strong> Monitor delivery rates regularly and 
                      investigate any declining trends. Consider implementing retry logic 
                      for failed deliveries.
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
};

export default ComplianceReportingDashboard;