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
  Collapse,
} from '@mui/material';
import {
  Sms as SmsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AttachMoney as CostIcon,
  Schedule as ScheduleIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { useNotificationStore } from '../../stores/notificationStore';
import { notificationService } from '../../services/notificationService';

interface SmsHistoryProps {
  userId: string;
}

interface SmsNotification {
  id: string;
  phoneNumber: string;
  message: string;
  status: string;
  deliveryAttempts: number;
  createdAt: string;
  lastAttemptAt?: string;
  deliveredAt?: string;
  errorMessage?: string;
  cost?: number;
}

/**
 * SmsHistory component displays SMS notification history with delivery tracking.
 * Shows delivery status, costs, error messages, and detailed message content.
 * 
 * Features:
 * - Paginated SMS history display
 * - Delivery status indicators with colors
 * - Expandable rows for full message content
 * - Cost tracking and delivery timestamps
 * - Error message display for failed deliveries
 * - Phone number formatting
 * 
 * @since 3.2.0
 */
export const SmsHistory: React.FC<SmsHistoryProps> = ({ userId }) => {
  const { smsHistory, loading, error, fetchSmsHistory } = useNotificationStore();
  
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Load SMS history on component mount and when pagination changes
  useEffect(() => {
    fetchSmsHistory(userId, page + 1, pageSize);
  }, [userId, page, pageSize, fetchSmsHistory]);

  /**
   * Handles page change for pagination
   */
  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  /**
   * Handles page size change for pagination
   */
  const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPageSize = parseInt(event.target.value, 10);
    setPageSize(newPageSize);
    setPage(0);
  };

  /**
   * Toggles row expansion to show full message content
   */
  const toggleRowExpansion = (notificationId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(notificationId)) {
      newExpanded.delete(notificationId);
    } else {
      newExpanded.add(notificationId);
    }
    setExpandedRows(newExpanded);
  };

  /**
   * Gets the appropriate color for delivery status
   */
  const getStatusColor = (status: string) => {
    return notificationService.getSmsStatusColor(status);
  };

  /**
   * Gets human-readable status message
   */
  const getStatusMessage = (notification: SmsNotification) => {
    return notificationService.getSmsStatusMessage(notification);
  };

  /**
   * Formats phone number for display
   */
  const formatPhoneNumber = (phoneNumber: string) => {
    return notificationService.formatPhoneNumber(phoneNumber);
  };

  /**
   * Formats date for display
   */
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  /**
   * Truncates message for table display
   */
  const truncateMessage = (message: string, maxLength: number = 50) => {
    return message.length > maxLength ? `${message.substring(0, maxLength)}...` : message;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        <Typography variant="h6">Error Loading SMS History</Typography>
        <Typography>{error}</Typography>
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <SmsIcon color="primary" />
          <Box>
            <Typography variant="h6">
              SMS Notification History
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View delivery status and details of sent SMS notifications
            </Typography>
          </Box>
        </Box>

        {smsHistory.length === 0 ? (
          <Box textAlign="center" py={4}>
            <SmsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No SMS Notifications
            </Typography>
            <Typography variant="body2" color="text.secondary">
              SMS notifications will appear here once you start receiving them.
            </Typography>
          </Box>
        ) : (
          <Paper variant="outlined">
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width="20px"></TableCell>
                    <TableCell>Phone Number</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Sent At</TableCell>
                    <TableCell>Cost</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {smsHistory.map((notification) => (
                    <React.Fragment key={notification.id}>
                      {/* Main row */}
                      <TableRow hover sx={{ cursor: 'pointer' }}>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => toggleRowExpansion(notification.id)}
                          >
                            {expandedRows.has(notification.id) ? 
                              <ExpandLessIcon /> : <ExpandMoreIcon />
                            }
                          </IconButton>
                        </TableCell>
                        
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <PhoneIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              {formatPhoneNumber(notification.phoneNumber)}
                            </Typography>
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2">
                            {truncateMessage(notification.message)}
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Chip
                            label={notification.status}
                            color={getStatusColor(notification.status)}
                            size="small"
                            sx={{ minWidth: 80 }}
                          />
                        </TableCell>
                        
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <ScheduleIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              {formatDate(notification.createdAt)}
                            </Typography>
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          {notification.cost ? (
                            <Box display="flex" alignItems="center" gap={1}>
                              <CostIcon fontSize="small" color="action" />
                              <Typography variant="body2">
                                ${notification.cost.toFixed(4)}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              -
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expanded row with details */}
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                          <Collapse in={expandedRows.has(notification.id)} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Message Details
                              </Typography>
                              
                              <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" sx={{ 
                                  backgroundColor: 'grey.100', 
                                  p: 1.5, 
                                  borderRadius: 1,
                                  fontFamily: 'monospace',
                                  whiteSpace: 'pre-wrap'
                                }}>
                                  {notification.message}
                                </Typography>
                              </Box>

                              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    Status Message
                                  </Typography>
                                  <Typography variant="body2">
                                    {getStatusMessage(notification)}
                                  </Typography>
                                </Box>
                                
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    Delivery Attempts
                                  </Typography>
                                  <Typography variant="body2">
                                    {notification.deliveryAttempts}
                                  </Typography>
                                </Box>
                                
                                {notification.lastAttemptAt && (
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">
                                      Last Attempt
                                    </Typography>
                                    <Typography variant="body2">
                                      {formatDate(notification.lastAttemptAt)}
                                    </Typography>
                                  </Box>
                                )}
                                
                                {notification.deliveredAt && (
                                  <Box>
                                    <Typography variant="caption" color="text.secondary">
                                      Delivered At
                                    </Typography>
                                    <Typography variant="body2">
                                      {formatDate(notification.deliveredAt)}
                                    </Typography>
                                  </Box>
                                )}
                                
                                {notification.errorMessage && (
                                  <Box>
                                    <Typography variant="caption" color="error">
                                      Error Message
                                    </Typography>
                                    <Typography variant="body2" color="error">
                                      {notification.errorMessage}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={-1} // Unknown total, will show "X of many"
              page={page}
              onPageChange={handlePageChange}
              rowsPerPage={pageSize}
              onRowsPerPageChange={handlePageSizeChange}
              rowsPerPageOptions={[10, 25, 50]}
              labelDisplayedRows={({ from, to }) => `${from}–${to} of many`}
            />
          </Paper>
        )}
      </CardContent>
    </Card>
  );
};

export default SmsHistory;