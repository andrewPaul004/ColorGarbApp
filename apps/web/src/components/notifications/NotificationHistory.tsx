import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Paper,
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useNotificationStore } from '../../stores/notificationStore';
import { notificationService } from '../../services/notificationService';

interface NotificationHistoryProps {
  userId: string;
}

/**
 * NotificationHistory component displays email notification delivery history and status.
 * Shows delivery tracking information, retry attempts, and error details for transparency.
 * 
 * Features:
 * - Paginated table of email notifications
 * - Delivery status indicators with colors
 * - Detailed error messages for failed deliveries
 * - Refresh functionality for real-time updates
 * - Responsive design for mobile devices
 * 
 * @since 3.1.0
 */
export const NotificationHistory: React.FC<NotificationHistoryProps> = ({ userId }) => {
  const { history, loading, error, fetchNotificationHistory } = useNotificationStore();
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [refreshing, setRefreshing] = useState(false);

  // Load notification history on component mount
  useEffect(() => {
    fetchNotificationHistory(userId, page + 1, rowsPerPage);
  }, [userId, page, rowsPerPage, fetchNotificationHistory]);

  /**
   * Handles manual refresh of notification history
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchNotificationHistory(userId, page + 1, rowsPerPage);
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Handles page change in pagination
   */
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  /**
   * Handles rows per page change in pagination
   */
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  /**
   * Gets the appropriate icon for notification status
   */
  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return <CheckCircleIcon sx={{ fontSize: 20 }} />;
      case 'failed':
      case 'bounced':
        return <ErrorIcon sx={{ fontSize: 20 }} />;
      case 'pending':
        return <ScheduleIcon sx={{ fontSize: 20 }} />;
      case 'sent':
        return <InfoIcon sx={{ fontSize: 20 }} />;
      default:
        return <EmailIcon sx={{ fontSize: 20 }} />;
    }
  };

  /**
   * Formats template name for display
   */
  const formatTemplateName = (templateName: string): string => {
    return templateName
      .replace(/^milestone-/, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  /**
   * Formats date for display
   */
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  if (loading && history.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error && history.length === 0) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        <Typography variant="h6">Error Loading Notification History</Typography>
        <Typography>{error}</Typography>
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: '100%', mx: 'auto' }}>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Box>
              <Typography variant="h6" component="h2">
                Email Notification History
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Track the delivery status of your email notifications
              </Typography>
            </Box>
            <Tooltip title="Refresh">
              <IconButton 
                onClick={handleRefresh} 
                disabled={refreshing}
                color="primary"
              >
                <RefreshIcon sx={{ 
                  animation: refreshing ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  }
                }} />
              </IconButton>
            </Tooltip>
          </Box>

          {error && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {history.length === 0 ? (
            <Box textAlign="center" py={4}>
              <EmailIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Email Notifications Yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                When you receive email notifications about your orders, they will appear here.
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Subject</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Delivery Attempts</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Last Attempt</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.map((notification) => (
                      <TableRow key={notification.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {notification.subject}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatTemplateName(notification.templateName)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={notificationService.getStatusMessage(notification)}>
                            <Chip
                              icon={getStatusIcon(notification.status)}
                              label={notification.status}
                              color={notificationService.getStatusColor(notification.status)}
                              size="small"
                              variant="outlined"
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {notification.deliveryAttempts}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(notification.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(notification.lastAttemptAt)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                rowsPerPageOptions={[10, 25, 50]}
                component="div"
                count={history.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default NotificationHistory;