import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Chip,
  Card,
  CardContent,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  Paper,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Close as CloseIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Message as MessageIcon,
  Notifications as NotificationIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useCommunicationAudit } from '../hooks/useCommunicationAudit';
import type { CommunicationLog, MessageEdit, NotificationDeliveryLog } from '../types/communicationAudit';

/**
 * Props for the CommunicationLogViewer component
 */
interface CommunicationLogViewerProps {
  /** ID of the communication log to display */
  logId: string;
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog should be closed */
  onClose: () => void;
}

/**
 * Detailed viewer for communication logs with delivery tracking and edit history.
 * Displays complete audit trail information including metadata and delivery status.
 * 
 * @component
 * @param {CommunicationLogViewerProps} props - Component props
 * @returns {JSX.Element} Communication log viewer dialog
 * 
 * @example
 * ```tsx
 * <CommunicationLogViewer
 *   logId="12345"
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 * />
 * ```
 * 
 * @since 3.4.0
 */
export const CommunicationLogViewer: React.FC<CommunicationLogViewerProps> = ({
  logId,
  open,
  onClose
}) => {
  const [communicationLog, setCommunicationLog] = useState<CommunicationLog | null>(null);
  const [deliveryLogs, setDeliveryLogs] = useState<NotificationDeliveryLog[]>([]);
  const [editHistory, setEditHistory] = useState<MessageEdit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { getCommunicationLog, getDeliveryLogs, getEditHistory } = useCommunicationAudit();

  // Load log details when dialog opens
  useEffect(() => {
    if (open && logId) {
      loadLogDetails();
    }
  }, [open, logId]);

  /**
   * Loads complete details for the communication log
   */
  const loadLogDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load communication log details
      const log = await getCommunicationLog(logId);
      setCommunicationLog(log);

      // Load delivery logs if available
      if (log.externalMessageId) {
        const delivery = await getDeliveryLogs(log.id);
        setDeliveryLogs(delivery);
      }

      // Load edit history if this is a message
      if (log.messageId) {
        const history = await getEditHistory(log.messageId);
        setEditHistory(history);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load communication details');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Gets the appropriate icon for communication type
   */
  const getCommunicationIcon = (type: string) => {
    switch (type) {
      case 'Email': return <EmailIcon />;
      case 'SMS': return <SmsIcon />;
      case 'Message': return <MessageIcon />;
      case 'SystemNotification': return <NotificationIcon />;
      default: return <MessageIcon />;
    }
  };

  /**
   * Gets color for delivery status
   */
  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'info' => {
    switch (status.toLowerCase()) {
      case 'delivered': case 'read': return 'success';
      case 'failed': case 'bounced': return 'error';
      case 'sent': return 'info';
      default: return 'warning';
    }
  };

  /**
   * Formats metadata for display
   */
  const formatMetadata = (metadata: string | null) => {
    if (!metadata) return null;
    
    try {
      const parsed = JSON.parse(metadata);
      return Object.entries(parsed).map(([key, value]) => (
        <Box key={key} sx={{ mb: 1 }}>
          <Typography variant="caption" color="textSecondary">
            {key}:
          </Typography>
          <Typography variant="body2" component="span" sx={{ ml: 1 }}>
            {String(value)}
          </Typography>
        </Box>
      ));
    } catch {
      return (
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
          {metadata}
        </Typography>
      );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '80vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Communication Details</Typography>
          <Button onClick={onClose} startIcon={<CloseIcon />}>
            Close
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : communicationLog ? (
          <Grid container spacing={3}>
            {/* Main Information */}
            <Grid item xs={12} md={8}>
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    {getCommunicationIcon(communicationLog.communicationType)}
                    <Typography variant="h6" sx={{ ml: 1 }}>
                      {communicationLog.communicationType}
                    </Typography>
                    <Chip
                      label={communicationLog.deliveryStatus}
                      color={getStatusColor(communicationLog.deliveryStatus)}
                      size="small"
                      sx={{ ml: 2 }}
                    />
                  </Box>

                  {communicationLog.subject && (
                    <Box mb={2}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Subject
                      </Typography>
                      <Typography variant="body1">
                        {communicationLog.subject}
                      </Typography>
                    </Box>
                  )}

                  <Box mb={2}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Content
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 200, overflow: 'auto' }}>
                      <Typography
                        variant="body2"
                        component="pre"
                        sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}
                      >
                        {communicationLog.content}
                      </Typography>
                    </Paper>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Recipient
                      </Typography>
                      <Typography variant="body2">
                        {communicationLog.recipientEmail || 
                         communicationLog.recipientPhone || 
                         'System Generated'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Template Used
                      </Typography>
                      <Typography variant="body2">
                        {communicationLog.templateUsed || 'None'}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Delivery Timeline */}
              {deliveryLogs.length > 0 && (
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Delivery Timeline
                    </Typography>
                    <Timeline>
                      <TimelineItem>
                        <TimelineSeparator>
                          <TimelineDot color="primary">
                            <ScheduleIcon />
                          </TimelineDot>
                          {deliveryLogs.length > 0 && <TimelineConnector />}
                        </TimelineSeparator>
                        <TimelineContent>
                          <Typography variant="subtitle2">
                            Message Sent
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {new Date(communicationLog.sentAt).toLocaleString()}
                          </Typography>
                        </TimelineContent>
                      </TimelineItem>

                      {deliveryLogs.map((log, index) => (
                        <TimelineItem key={log.id}>
                          <TimelineSeparator>
                            <TimelineDot 
                              color={log.status.toLowerCase().includes('fail') ? 'error' : 'success'}
                            >
                              {log.status.toLowerCase().includes('fail') ? 
                                <ErrorIcon /> : <CheckCircleIcon />}
                            </TimelineDot>
                            {index < deliveryLogs.length - 1 && <TimelineConnector />}
                          </TimelineSeparator>
                          <TimelineContent>
                            <Typography variant="subtitle2">
                              {log.status} - {log.deliveryProvider}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {new Date(log.updatedAt).toLocaleString()}
                            </Typography>
                            {log.statusDetails && (
                              <Typography variant="caption" display="block">
                                {log.statusDetails}
                              </Typography>
                            )}
                          </TimelineContent>
                        </TimelineItem>
                      ))}
                    </Timeline>
                  </CardContent>
                </Card>
              )}

              {/* Edit History */}
              {editHistory.length > 0 && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Edit History
                    </Typography>
                    {editHistory.map((edit, index) => (
                      <Accordion key={edit.id}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography>
                            Edit #{index + 1} - {new Date(edit.editedAt).toLocaleString()}
                          </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box>
                            {edit.changeReason && (
                              <Box mb={2}>
                                <Typography variant="subtitle2" color="textSecondary">
                                  Reason for Change
                                </Typography>
                                <Typography variant="body2">
                                  {edit.changeReason}
                                </Typography>
                              </Box>
                            )}
                            <Typography variant="subtitle2" color="textSecondary">
                              Previous Content
                            </Typography>
                            <Paper sx={{ p: 1, bgcolor: 'grey.50', mt: 1 }}>
                              <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                                {edit.previousContent}
                              </Typography>
                            </Paper>
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </CardContent>
                </Card>
              )}
            </Grid>

            {/* Sidebar Information */}
            <Grid item xs={12} md={4}>
              {/* Technical Details */}
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Technical Details
                  </Typography>
                  <Box mb={2}>
                    <Typography variant="caption" color="textSecondary">
                      Communication ID
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {communicationLog.id}
                    </Typography>
                  </Box>
                  <Box mb={2}>
                    <Typography variant="caption" color="textSecondary">
                      Order ID
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {communicationLog.orderId}
                    </Typography>
                  </Box>
                  {communicationLog.externalMessageId && (
                    <Box mb={2}>
                      <Typography variant="caption" color="textSecondary">
                        External Message ID
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {communicationLog.externalMessageId}
                      </Typography>
                    </Box>
                  )}
                  <Box mb={2}>
                    <Typography variant="caption" color="textSecondary">
                      Created At
                    </Typography>
                    <Typography variant="body2">
                      {new Date(communicationLog.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              {/* Delivery Status */}
              <Card sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Delivery Status
                  </Typography>
                  <Box mb={2}>
                    <Typography variant="caption" color="textSecondary">
                      Current Status
                    </Typography>
                    <Typography variant="body1">
                      <Chip
                        label={communicationLog.deliveryStatus}
                        color={getStatusColor(communicationLog.deliveryStatus)}
                        size="small"
                      />
                    </Typography>
                  </Box>
                  {communicationLog.deliveredAt && (
                    <Box mb={2}>
                      <Typography variant="caption" color="textSecondary">
                        Delivered At
                      </Typography>
                      <Typography variant="body2">
                        {new Date(communicationLog.deliveredAt).toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                  {communicationLog.readAt && (
                    <Box mb={2}>
                      <Typography variant="caption" color="textSecondary">
                        Read At
                      </Typography>
                      <Typography variant="body2">
                        {new Date(communicationLog.readAt).toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                  {communicationLog.failureReason && (
                    <Box mb={2}>
                      <Typography variant="caption" color="textSecondary">
                        Failure Reason
                      </Typography>
                      <Alert severity="error" sx={{ mt: 1 }}>
                        {communicationLog.failureReason}
                      </Alert>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Metadata */}
              {communicationLog.metadata && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Metadata
                    </Typography>
                    {formatMetadata(communicationLog.metadata)}
                  </CardContent>
                </Card>
              )}
            </Grid>
          </Grid>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};