import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Badge,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Checkbox,
  CircularProgress,
  Alert,
  Grid,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Message as MessageIcon,
  Assignment as AssignmentIcon,
  MarkEmailRead as MarkEmailReadIcon,
  Visibility as VisibilityIcon,
  AccessTime as AccessTimeIcon,
  AttachFile as AttachFileIcon,
  PriorityHigh as PriorityHighIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import { MessageCenter } from '../messages/MessageCenter';
import { useAdminAccess } from '../../hooks/useAdminAccess';
import adminMessageService, { 
  type AdminMessage,
  type AdminMessageSearchRequest,
  type AdminMessageSearchResponse
} from '../../services/adminMessageService';

/**
 * Admin Message Inbox - Unified view of all client messages across all orders
 * Provides ColorGarb staff with centralized message management capabilities
 */

export const AdminMessageInbox: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { hasAccess, reason } = useAdminAccess();

  // State management
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [clientName, setClientName] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [messageType, setMessageType] = useState('all');
  const [senderRole, setSenderRole] = useState('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
  // Message center state
  const [messageCenterOpen, setMessageCenterOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string | null>(null);
  const [selectedOrderDescription, setSelectedOrderDescription] = useState<string | null>(null);

  // Access control check
  if (!hasAccess) {
    return (
      <Paper sx={{ p: 3, mt: 2 }}>
        <Alert severity="error">
          {reason || 'You do not have permission to access the admin message inbox.'}
        </Alert>
      </Paper>
    );
  }

  /**
   * Loads admin messages with current filters and pagination
   */
  const loadMessages = useCallback(async (resetPage = false) => {
    if (!hasAccess) return;

    try {
      setLoading(true);
      setError(null);

      const currentPage = resetPage ? 1 : page;
      const searchParams: Partial<AdminMessageSearchRequest> = {
        page: currentPage,
        pageSize: 50,
      };

      if (searchTerm) searchParams.searchTerm = searchTerm;
      if (clientName) searchParams.clientName = clientName;
      if (orderNumber) searchParams.orderNumber = orderNumber;
      if (messageType !== 'all') searchParams.messageType = messageType;
      if (senderRole !== 'all') searchParams.senderRole = senderRole;
      if (unreadOnly) searchParams.unreadOnly = true;

      const data = await adminMessageService.getAllMessages(searchParams);
      
      if (resetPage || currentPage === 1) {
        setMessages(data.messages);
        setPage(1);
      } else {
        setMessages(prev => [...prev, ...data.messages]);
      }
      
      setTotalCount(data.totalCount);
      setUnreadCount(data.unreadCount);
      setHasNextPage(data.hasNextPage);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages';
      setError(errorMessage);
      console.error('Error loading admin messages:', err);
    } finally {
      setLoading(false);
    }
  }, [hasAccess, page, searchTerm, clientName, orderNumber, messageType, senderRole, unreadOnly]);

  /**
   * Handles loading more messages (pagination)
   */
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !loading) {
      setPage(prev => prev + 1);
    }
  }, [hasNextPage, loading]);

  /**
   * Handles refreshing the message list
   */
  const handleRefresh = useCallback(() => {
    loadMessages(true);
  }, [loadMessages]);

  /**
   * Handles marking selected messages as read
   */
  const handleMarkAsRead = useCallback(async () => {
    if (selectedMessages.length === 0) return;

    try {
      await adminMessageService.markMessagesAsRead(selectedMessages);

      // Update local state
      setMessages(prev => 
        prev.map(msg => 
          selectedMessages.includes(msg.id) 
            ? { ...msg, isRead: true, readAt: new Date().toISOString() }
            : msg
        )
      );
      
      setSelectedMessages([]);
      setUnreadCount(prev => Math.max(0, prev - selectedMessages.length));
      
    } catch (err) {
      console.error('Error marking messages as read:', err);
      setError('Failed to mark messages as read');
    }
  }, [selectedMessages]);

  /**
   * Handles opening message conversation
   */
  const handleOpenMessage = useCallback((message: AdminMessage) => {
    setSelectedOrderId(message.orderId);
    setSelectedOrderNumber(message.orderNumber);
    setSelectedOrderDescription(message.orderDescription);
    setMessageCenterOpen(true);
  }, []);

  /**
   * Handles selecting/deselecting messages
   */
  const handleSelectMessage = useCallback((messageId: string) => {
    setSelectedMessages(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  }, []);

  /**
   * Handles selecting/deselecting all messages
   */
  const handleSelectAll = useCallback(() => {
    if (selectedMessages.length === messages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(messages.map(m => m.id));
    }
  }, [selectedMessages.length, messages]);

  /**
   * Applies search filters and reloads
   */
  const handleApplyFilters = useCallback(() => {
    loadMessages(true);
  }, [loadMessages]);

  /**
   * Clears all filters
   */
  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setClientName('');
    setOrderNumber('');
    setMessageType('all');
    setSenderRole('all');
    setUnreadOnly(false);
  }, []);

  // Load messages when component mounts or dependencies change
  useEffect(() => {
    loadMessages(true);
  }, [searchTerm, clientName, orderNumber, messageType, senderRole, unreadOnly]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadMessages(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [loadMessages]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <MessageIcon color="primary" sx={{ fontSize: 32 }} />
          </Badge>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
              Admin Message Inbox
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Unified view of all client messages • {totalCount} total messages
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
            size={isMobile ? 'small' : 'medium'}
          >
            Refresh
          </Button>
          
          {selectedMessages.length > 0 && (
            <Button
              variant="contained"
              startIcon={<MarkEmailReadIcon />}
              onClick={handleMarkAsRead}
              size={isMobile ? 'small' : 'medium'}
            >
              Mark Read ({selectedMessages.length})
            </Button>
          )}
        </Box>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: filtersExpanded ? 2 : 0 }}>
          <IconButton onClick={() => setFiltersExpanded(!filtersExpanded)}>
            {filtersExpanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
          <Typography variant="h6" sx={{ ml: 1 }}>
            Filters & Search
          </Typography>
          {!filtersExpanded && (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
              {[searchTerm, clientName, orderNumber, messageType !== 'all' ? messageType : null, 
                senderRole !== 'all' ? senderRole : null, unreadOnly ? 'Unread Only' : null]
                .filter(Boolean).length} filters active
            </Typography>
          )}
        </Box>

        {filtersExpanded && (
          <>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search messages"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Client name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Order number"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Message Type</InputLabel>
                  <Select
                    value={messageType}
                    label="Message Type"
                    onChange={(e) => setMessageType(e.target.value)}
                  >
                    <MenuItem value="all">All Types</MenuItem>
                    <MenuItem value="General">General</MenuItem>
                    <MenuItem value="Question">Question</MenuItem>
                    <MenuItem value="Update">Update</MenuItem>
                    <MenuItem value="Urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Sender Role</InputLabel>
                  <Select
                    value={senderRole}
                    label="Sender Role"
                    onChange={(e) => setSenderRole(e.target.value)}
                  >
                    <MenuItem value="all">All Roles</MenuItem>
                    <MenuItem value="Client">Client</MenuItem>
                    <MenuItem value="ColorGarbStaff">Staff</MenuItem>
                  </Select>
                </FormControl>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Checkbox
                    checked={unreadOnly}
                    onChange={(e) => setUnreadOnly(e.target.checked)}
                    size="small"
                  />
                  <Typography variant="body2">Unread only</Typography>
                </Box>
              </Box>

              <Button
                variant="outlined"
                size="small"
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
            </Box>
          </>
        )}
      </Paper>

      {/* Bulk Actions */}
      {messages.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Checkbox
            checked={selectedMessages.length === messages.length}
            indeterminate={selectedMessages.length > 0 && selectedMessages.length < messages.length}
            onChange={handleSelectAll}
            size="small"
          />
          <Typography variant="body2">
            {selectedMessages.length > 0 
              ? `${selectedMessages.length} selected`
              : 'Select all'
            }
          </Typography>
        </Box>
      )}

      {/* Message List */}
      <Paper>
        {loading && messages.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <MessageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No messages found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your filters or check back later for new messages.
            </Typography>
          </Box>
        ) : (
          <List>
            {messages.map((message, index) => (
              <React.Fragment key={message.id}>
                <ListItem
                  sx={{
                    bgcolor: message.isRead ? 'background.paper' : 'action.hover',
                    borderLeft: message.isUrgent ? `4px solid ${theme.palette.error.main}` : 'none',
                    pl: message.isUrgent ? 1.5 : 2,
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'action.selected',
                    },
                  }}
                  onClick={() => handleOpenMessage(message)}
                >
                  <Checkbox
                    checked={selectedMessages.includes(message.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectMessage(message.id);
                    }}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  
                  <Box sx={{ width: '100%', minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: message.isRead ? 'normal' : 'bold',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {message.senderName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          •
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {message.organizationName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          •
                        </Typography>
                        <Typography
                          variant="body2"
                          color="primary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {message.orderNumber}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                        {message.isUrgent && (
                          <PriorityHighIcon color="error" fontSize="small" />
                        )}
                        {message.attachmentCount > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AttachFileIcon fontSize="small" color="action" />
                            <Typography variant="caption" color="text.secondary">
                              {message.attachmentCount}
                            </Typography>
                          </Box>
                        )}
                        <Chip
                          label={message.messageType}
                          size="small"
                          variant={message.messageType === 'Urgent' ? 'filled' : 'outlined'}
                          color={message.messageType === 'Urgent' ? 'error' : 'default'}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Typography
                      variant="body2"
                      color="text.primary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: message.isRead ? 'normal' : 500,
                      }}
                    >
                      {message.contentPreview}
                    </Typography>
                    
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {message.orderDescription}
                    </Typography>
                  </Box>
                </ListItem>
                
                {index < messages.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}

        {/* Load More Button */}
        {hasNextPage && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Button
              variant="outlined"
              onClick={handleLoadMore}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : undefined}
            >
              {loading ? 'Loading...' : 'Load More Messages'}
            </Button>
          </Box>
        )}
      </Paper>

      {/* Message Center Dialog */}
      {messageCenterOpen && selectedOrderId && (
        <MessageCenter
          orderId={selectedOrderId}
          open={messageCenterOpen}
          onClose={() => setMessageCenterOpen(false)}
          orderNumber={selectedOrderNumber || undefined}
          orderDescription={selectedOrderDescription || undefined}
        />
      )}
    </Box>
  );
};

export default AdminMessageInbox;