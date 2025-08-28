import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  IconButton,
  Collapse,
  Badge,
  Tooltip,
  LinearProgress,
  Alert
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
  Visibility as ReadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import type { 
  CommunicationLog,
  CommunicationAuditResult 
} from '../../types/shared';
import communicationAuditService from '../../services/communicationAuditService';

/**
 * Props for the DeliveryStatusUpdates component
 */
interface DeliveryStatusUpdatesProps {
  /** Order ID to show delivery status for */
  orderId: string;
  /** Maximum number of recent communications to show */
  maxItems?: number;
  /** Whether to show the card container */
  showCard?: boolean;
  /** Whether to auto-refresh status */
  autoRefresh?: boolean;
  /** Auto-refresh interval in milliseconds */
  refreshInterval?: number;
}

/**
 * Real-time delivery status updates component for order communications.
 * Shows recent communication delivery statuses with live updates.
 * 
 * @component
 * @since 3.4.0
 */
export const DeliveryStatusUpdates: React.FC<DeliveryStatusUpdatesProps> = ({
  orderId,
  maxItems = 5,
  showCard = true,
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}) => {
  const [communications, setCommunications] = useState<CommunicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  /**
   * Load recent communications for the order
   */
  const loadCommunications = useCallback(async () => {
    try {
      setError(null);
      const result = await communicationAuditService.getOrderCommunicationHistory(
        orderId, 
        1, 
        maxItems
      );
      setCommunications(result.logs);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to load delivery status:', err);
      setError('Failed to load delivery status');
    } finally {
      setLoading(false);
    }
  }, [orderId, maxItems]);

  // Load communications on mount
  useEffect(() => {
    loadCommunications();
  }, [loadCommunications]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadCommunications();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadCommunications]);

  /**
   * Get avatar for communication type
   */
  const getCommunicationAvatar = (communication: CommunicationLog) => {
    const getIcon = () => {
      switch (communication.communicationType.toLowerCase()) {
        case 'email':
          return <EmailIcon />;
        case 'sms':
          return <SmsIcon />;
        case 'message':
          return <MessageIcon />;
        case 'systemnotification':
          return <NotificationIcon />;
        default:
          return <MessageIcon />;
      }
    };

    const getColor = () => {
      switch (communication.deliveryStatus.toLowerCase()) {
        case 'delivered':
        case 'read':
        case 'opened':
          return '#4caf50'; // success green
        case 'failed':
        case 'bounced':
          return '#f44336'; // error red
        case 'sent':
        case 'queued':
          return '#ff9800'; // warning orange
        default:
          return '#757575'; // grey
      }
    };

    return (
      <Avatar sx={{ bgcolor: getColor(), width: 32, height: 32 }}>
        {getIcon()}
      </Avatar>
    );
  };

  /**
   * Get status chip for delivery status
   */
  const getStatusChip = (status: string) => {
    const statusConfig = {
      delivered: { color: 'success' as const, icon: <DeliveredIcon /> },
      sent: { color: 'warning' as const, icon: <PendingIcon /> },
      read: { color: 'success' as const, icon: <ReadIcon /> },
      opened: { color: 'success' as const, icon: <ReadIcon /> },
      failed: { color: 'error' as const, icon: <FailedIcon /> },
      bounced: { color: 'error' as const, icon: <FailedIcon /> },
      queued: { color: 'info' as const, icon: <PendingIcon /> }
    };

    const config = statusConfig[status.toLowerCase() as keyof typeof statusConfig] || {
      color: 'default' as const,
      icon: <PendingIcon />
    };

    return (
      <Chip
        size="small"
        color={config.color}
        label={status}
        variant="outlined"
      />
    );
  };

  /**
   * Format time for display
   */
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffMinutes < 24 * 60) {
      const hours = Math.floor(diffMinutes / 60);
      return `${hours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  /**
   * Get delivery status summary
   */
  const getStatusSummary = () => {
    const pending = communications.filter(c => 
      ['sent', 'queued'].includes(c.deliveryStatus.toLowerCase())
    ).length;
    
    const failed = communications.filter(c => 
      ['failed', 'bounced'].includes(c.deliveryStatus.toLowerCase())
    ).length;

    return { pending, failed, total: communications.length };
  };

  /**
   * Render loading state
   */
  if (loading && communications.length === 0) {
    return showCard ? (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Delivery Status
          </Typography>
          <LinearProgress />
        </CardContent>
      </Card>
    ) : (
      <LinearProgress />
    );
  }

  /**
   * Render error state
   */
  if (error && communications.length === 0) {
    return showCard ? (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Delivery Status
          </Typography>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    ) : (
      <Alert severity="error">{error}</Alert>
    );
  }

  /**
   * Render empty state
   */
  if (communications.length === 0) {
    return showCard ? (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Delivery Status
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No communications sent yet for this order.
          </Typography>
        </CardContent>
      </Card>
    ) : (
      <Typography variant="body2" color="text.secondary">
        No communications sent yet.
      </Typography>
    );
  }

  const statusSummary = getStatusSummary();
  
  const content = (
    <Box>
      {/* Header with summary */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">
            Delivery Status
          </Typography>
          
          {statusSummary.pending > 0 && (
            <Badge badgeContent={statusSummary.pending} color="warning">
              <Chip label="Pending" size="small" />
            </Badge>
          )}
          
          {statusSummary.failed > 0 && (
            <Badge badgeContent={statusSummary.failed} color="error">
              <Chip label="Failed" size="small" />
            </Badge>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Updated {formatTime(lastRefresh)}
          </Typography>
          
          <Tooltip title="Refresh status">
            <IconButton size="small" onClick={loadCommunications} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          {communications.length > 3 && (
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Communications list */}
      <List disablePadding>
        {communications.slice(0, expanded ? undefined : 3).map((comm, index) => (
          <ListItem key={comm.id} divider={index < communications.length - 1} sx={{ px: 0 }}>
            <ListItemAvatar>
              {getCommunicationAvatar(comm)}
            </ListItemAvatar>
            
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {comm.communicationType}
                  </Typography>
                  {getStatusChip(comm.deliveryStatus)}
                </Box>
              }
              secondary={
                <Box>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    To: {comm.recipientEmail || comm.recipientPhone || 'System'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Sent {formatTime(comm.sentAt)}
                    {comm.deliveredAt && ` • Delivered ${formatTime(comm.deliveredAt)}`}
                  </Typography>
                  {comm.failureReason && (
                    <Alert severity="error" sx={{ mt: 0.5, py: 0.5 }}>
                      <Typography variant="caption">
                        {comm.failureReason}
                      </Typography>
                    </Alert>
                  )}
                </Box>
              }
            />
          </ListItem>
        ))}
        
        {communications.length > 3 && !expanded && (
          <ListItem sx={{ px: 0, pt: 1 }}>
            <ListItemText>
              <Typography 
                variant="body2" 
                color="primary" 
                sx={{ cursor: 'pointer', textAlign: 'center' }}
                onClick={() => setExpanded(true)}
              >
                Show {communications.length - 3} more communications
              </Typography>
            </ListItemText>
          </ListItem>
        )}
      </List>

      {loading && (
        <LinearProgress sx={{ mt: 1 }} />
      )}
    </Box>
  );

  return showCard ? (
    <Card>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  ) : content;
};

export default DeliveryStatusUpdates;