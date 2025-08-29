import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  Skeleton,
  Alert,
  useTheme,
  Collapse
} from '@mui/material';
import {
  Email as EmailIcon,
  Sms as SmsIcon,
  Message as MessageIcon,
  Notifications as NotificationIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as DeliveredIcon,
  Error as FailedIcon,
  Schedule as PendingIcon,
  Visibility as ReadIcon
} from '@mui/icons-material';
import type { 
  CommunicationLog, 
  CommunicationAuditSearchRequest,
  CommunicationAuditResult 
} from '../../types/shared';
import communicationAuditService from '../../services/communicationAuditService';

/**
 * Props for the CommunicationAuditLog component
 */
interface CommunicationAuditLogProps {
  /** Order ID to filter communications (optional) */
  orderId?: string;
  /** Initial search criteria */
  searchCriteria?: CommunicationAuditSearchRequest;
  /** Whether to show the order column */
  showOrderColumn?: boolean;
  /** Maximum height for the table container */
  maxHeight?: number;
  /** Callback when a communication is selected */
  onCommunicationSelect?: (communication: CommunicationLog) => void;
}

/**
 * Communication audit log viewer with search, filtering, and pagination.
 * Displays communication history with delivery status tracking.
 * 
 * @component
 * @since 3.4.0
 */
export const CommunicationAuditLog: React.FC<CommunicationAuditLogProps> = ({
  orderId,
  searchCriteria = {},
  showOrderColumn = true,
  maxHeight = 600,
  onCommunicationSelect
}) => {
  const theme = useTheme();
  const [communications, setCommunications] = useState<CommunicationAuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  /**
   * Load communication audit data
   */
  const loadCommunications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const request: CommunicationAuditSearchRequest = {
        ...searchCriteria,
        orderId: orderId || searchCriteria.orderId,
        page: page + 1, // Convert to 1-based
        pageSize: rowsPerPage
      };

      const result = await communicationAuditService.searchCommunicationLogs(request);
      setCommunications(result);
    } catch (err) {
      console.error('Failed to load communications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load communication data');
    } finally {
      setLoading(false);
    }
  }, [orderId, searchCriteria, page, rowsPerPage]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadCommunications();
  }, [loadCommunications]);

  /**
   * Handle page change
   */
  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  /**
   * Handle rows per page change
   */
  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  /**
   * Toggle row expansion
   */
  const toggleRowExpansion = (communicationId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(communicationId)) {
      newExpanded.delete(communicationId);
    } else {
      newExpanded.add(communicationId);
    }
    setExpandedRows(newExpanded);
  };

  /**
   * Get icon for communication type
   */
  const getCommunicationTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'email':
        return <EmailIcon fontSize="small" />;
      case 'sms':
        return <SmsIcon fontSize="small" />;
      case 'message':
        return <MessageIcon fontSize="small" />;
      case 'systemnotification':
        return <NotificationIcon fontSize="small" />;
      default:
        return <MessageIcon fontSize="small" />;
    }
  };

  /**
   * Get chip for delivery status
   */
  const getDeliveryStatusChip = (status: string) => {
    const statusConfig = {
      delivered: { 
        color: 'success' as const, 
        icon: <DeliveredIcon fontSize="small" />, 
        label: 'Delivered' 
      },
      sent: { 
        color: 'info' as const, 
        icon: <PendingIcon fontSize="small" />, 
        label: 'Sent' 
      },
      read: { 
        color: 'success' as const, 
        icon: <ReadIcon fontSize="small" />, 
        label: 'Read' 
      },
      opened: { 
        color: 'success' as const, 
        icon: <ReadIcon fontSize="small" />, 
        label: 'Opened' 
      },
      failed: { 
        color: 'error' as const, 
        icon: <FailedIcon fontSize="small" />, 
        label: 'Failed' 
      },
      bounced: { 
        color: 'error' as const, 
        icon: <FailedIcon fontSize="small" />, 
        label: 'Bounced' 
      },
      queued: { 
        color: 'warning' as const, 
        icon: <PendingIcon fontSize="small" />, 
        label: 'Queued' 
      }
    };

    const config = statusConfig[status.toLowerCase() as keyof typeof statusConfig] || {
      color: 'default' as const,
      icon: <PendingIcon fontSize="small" />,
      label: status
    };

    return (
      <Chip
        size="small"
        color={config.color}
        icon={config.icon}
        label={config.label}
        variant="outlined"
      />
    );
  };

  /**
   * Format date for display
   */
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  /**
   * Render loading skeleton
   */
  const renderSkeleton = () => (
    <TableContainer component={Paper} sx={{ maxHeight }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell width="40px"></TableCell>
            <TableCell>Type</TableCell>
            {showOrderColumn && <TableCell>Order</TableCell>}
            <TableCell>Recipient</TableCell>
            <TableCell>Subject</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Sent</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: 5 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell><Skeleton width={24} height={24} /></TableCell>
              <TableCell><Skeleton width={80} height={32} /></TableCell>
              {showOrderColumn && <TableCell><Skeleton width={100} height={20} /></TableCell>}
              <TableCell><Skeleton width={150} height={20} /></TableCell>
              <TableCell><Skeleton width={200} height={20} /></TableCell>
              <TableCell><Skeleton width={80} height={32} /></TableCell>
              <TableCell><Skeleton width={100} height={20} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Communication Audit Log
        </Typography>
        {renderSkeleton()}
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Communication Audit Log
        </Typography>
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      </Paper>
    );
  }

  if (!communications || communications.logs.length === 0) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Communication Audit Log
        </Typography>
        <Alert severity="info" sx={{ mt: 2 }}>
          No communications found for the selected criteria.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Communication Audit Log
        <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 1 }}>
          ({communications.totalCount} total)
        </Typography>
      </Typography>

      <TableContainer sx={{ maxHeight }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell width="40px"></TableCell>
              <TableCell>Type</TableCell>
              {showOrderColumn && <TableCell>Order</TableCell>}
              <TableCell>Recipient</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Sent</TableCell>
              <TableCell>Delivered</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {communications.logs.map((comm) => (
              <React.Fragment key={comm.id}>
                <TableRow 
                  hover
                  sx={{ 
                    cursor: onCommunicationSelect ? 'pointer' : 'default',
                    '&:hover': onCommunicationSelect ? {
                      backgroundColor: theme.palette.action.hover
                    } : {}
                  }}
                  onClick={() => onCommunicationSelect?.(comm)}
                >
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRowExpansion(comm.id);
                      }}
                    >
                      {expandedRows.has(comm.id) ? 
                        <ExpandLessIcon fontSize="small" /> : 
                        <ExpandMoreIcon fontSize="small" />
                      }
                    </IconButton>
                  </TableCell>
                  
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getCommunicationTypeIcon(comm.communicationType)}
                      <Typography variant="body2">
                        {comm.communicationType}
                      </Typography>
                    </Box>
                  </TableCell>

                  {showOrderColumn && (
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {comm.orderId.slice(0, 8)}...
                      </Typography>
                    </TableCell>
                  )}

                  <TableCell>
                    <Typography variant="body2">
                      {comm.recipientEmail || comm.recipientPhone || 'System'}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {comm.subject || comm.content.substring(0, 50) + '...'}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    {getDeliveryStatusChip(comm.deliveryStatus)}
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(comm.sentAt)}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {comm.deliveredAt ? formatDate(comm.deliveredAt) : '-'}
                    </Typography>
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell colSpan={showOrderColumn ? 8 : 7} sx={{ py: 0 }}>
                    <Collapse in={expandedRows.has(comm.id)}>
                      <Box sx={{ p: 2, backgroundColor: theme.palette.grey[50] }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Message Details
                        </Typography>
                        <Typography variant="body2" paragraph>
                          {comm.content}
                        </Typography>
                        
                        {comm.templateUsed && (
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Template: {comm.templateUsed}
                          </Typography>
                        )}
                        
                        {comm.failureReason && (
                          <Alert severity="error" sx={{ mt: 1 }}>
                            <Typography variant="body2">
                              <strong>Failure Reason:</strong> {comm.failureReason}
                            </Typography>
                          </Alert>
                        )}
                        
                        <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          {comm.readAt && (
                            <Typography variant="body2" color="text.secondary">
                              Read: {formatDate(comm.readAt)}
                            </Typography>
                          )}
                          {comm.externalMessageId && (
                            <Typography variant="body2" color="text.secondary">
                              Message ID: {comm.externalMessageId}
                            </Typography>
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
        count={communications.totalCount}
        page={page}
        onPageChange={handlePageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </Paper>
  );
};

export default CommunicationAuditLog;