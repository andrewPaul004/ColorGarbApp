import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Chip,
  useTheme,
  Divider,
  Skeleton
} from '@mui/material';
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import type { Message, MessageSearchRequest } from '@colorgarb/shared';
import messageService from '../../services/messageService';
import { MessageList } from './MessageList';
import { MessageComposer } from './MessageComposer';
import { MessageSearch } from './MessageSearch';

/**
 * Props for the MessageCenter component
 */
interface MessageCenterProps {
  /** Order ID for the message thread */
  orderId: string;
  /** Whether the message center is open */
  open: boolean;
  /** Callback when the message center is closed */
  onClose: () => void;
  /** Order description for context */
  orderDescription?: string;
  /** Order number for display */
  orderNumber?: string;
}

/**
 * Main message center component for order-specific communication
 * Provides a complete messaging interface with search, compose, and thread display
 * 
 * @component
 * @example
 * ```tsx
 * <MessageCenter
 *   orderId="123e4567-e89b-12d3-a456-426614174000"
 *   open={true}
 *   onClose={() => setMessageCenterOpen(false)}
 *   orderNumber="CG-2025-001"
 *   orderDescription="Spring Musical Costumes"
 * />
 * ```
 */
export const MessageCenter: React.FC<MessageCenterProps> = ({
  orderId,
  open,
  onClose,
  orderDescription,
  orderNumber
}) => {
  const theme = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchParams, setSearchParams] = useState<Partial<MessageSearchRequest>>({});

  /**
   * Loads messages for the current order with search and pagination
   */
  const loadMessages = useCallback(async (reset = false) => {
    if (!orderId || !open) return;

    try {
      setLoading(true);
      setError(null);

      const page = reset ? 1 : currentPage;
      const params = {
        ...searchParams,
        page,
        pageSize: 50
      };

      const response = await messageService.getOrderMessages(orderId, params);
      
      if (reset) {
        setMessages(response.messages);
        setCurrentPage(1);
      } else {
        setMessages(prev => page === 1 ? response.messages : [...prev, ...response.messages]);
      }
      
      setTotalCount(response.totalCount);
      setUnreadCount(response.unreadCount);
      setHasNextPage(response.hasNextPage);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages';
      setError(errorMessage);
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId, open, currentPage, searchParams]);

  /**
   * Handles loading more messages (pagination)
   */
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !loading) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage, loading]);

  /**
   * Handles refreshing the message list
   */
  const handleRefresh = useCallback(() => {
    loadMessages(true);
  }, [loadMessages]);

  /**
   * Handles successful message send
   */
  const handleMessageSent = useCallback((newMessage: Message) => {
    setMessages(prev => [newMessage, ...prev]);
    setTotalCount(prev => prev + 1);
  }, []);

  /**
   * Handles marking messages as read
   */
  const handleMessagesRead = useCallback((messageIds: string[]) => {
    setMessages(prev => 
      prev.map(msg => 
        messageIds.includes(msg.id) 
          ? { ...msg, isRead: true, readAt: new Date().toISOString() }
          : msg
      )
    );
    setUnreadCount(prev => Math.max(0, prev - messageIds.length));
  }, []);

  /**
   * Handles search parameter changes
   */
  const handleSearchChange = useCallback((newSearchParams: Partial<MessageSearchRequest>) => {
    setSearchParams(newSearchParams);
    setCurrentPage(1);
  }, []);

  /**
   * Handles toggling search panel
   */
  const handleToggleSearch = useCallback(() => {
    setSearchOpen(prev => !prev);
  }, []);

  // Load messages when component mounts or dependencies change
  useEffect(() => {
    loadMessages(true);
  }, [loadMessages]);

  // Auto-refresh every 30 seconds when open
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      loadMessages(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [open, loadMessages]);

  if (!open) return null;

  return (
    <Paper
      sx={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: { xs: '100%', sm: '100%', md: '500px', lg: '600px' },
        height: '100vh',
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: { xs: 0, md: 0 },
        boxShadow: theme.shadows[8],
        // Mobile slide-in animation
        transform: { xs: 'translateX(0)', md: 'translateX(0)' },
        transition: theme.transitions.create(['transform'], {
          duration: theme.transitions.duration.standard,
        }),
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: { xs: 1.5, md: 2 },
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          minHeight: { xs: 56, md: 'auto' } // Standard mobile header height
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: { xs: 0.5, md: 1 } }}>
          <Typography 
            variant="h6" 
            component="h2" 
            sx={{ 
              fontWeight: 'bold',
              fontSize: { xs: '1.1rem', md: '1.25rem' }
            }}
          >
            Messages
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton
              size={window.innerWidth < 768 ? "medium" : "small"}
              onClick={handleToggleSearch}
              sx={{ 
                color: 'inherit',
                minWidth: { xs: 44, md: 'auto' },
                minHeight: { xs: 44, md: 'auto' }
              }}
              title="Search messages"
              aria-label="Search messages"
            >
              <SearchIcon fontSize={window.innerWidth < 768 ? "medium" : "small"} />
            </IconButton>
            <IconButton
              size={window.innerWidth < 768 ? "medium" : "small"}
              onClick={handleRefresh}
              disabled={loading}
              sx={{ 
                color: 'inherit',
                minWidth: { xs: 44, md: 'auto' },
                minHeight: { xs: 44, md: 'auto' }
              }}
              title="Refresh messages"
              aria-label="Refresh messages"
            >
              <RefreshIcon fontSize={window.innerWidth < 768 ? "medium" : "small"} />
            </IconButton>
            <IconButton
              size={window.innerWidth < 768 ? "medium" : "small"}
              onClick={onClose}
              sx={{ 
                color: 'inherit',
                minWidth: { xs: 44, md: 'auto' },
                minHeight: { xs: 44, md: 'auto' }
              }}
              title="Close messages"
              aria-label="Close messages"
            >
              <CloseIcon fontSize={window.innerWidth < 768 ? "medium" : "small"} />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {orderNumber && `Order ${orderNumber}`}
            {orderDescription && ` - ${orderDescription}`}
          </Typography>
          {unreadCount > 0 && (
            <Chip
              label={`${unreadCount} unread`}
              size="small"
              sx={{
                bgcolor: theme.palette.warning.main,
                color: theme.palette.warning.contrastText,
                fontWeight: 'bold'
              }}
            />
          )}
        </Box>
      </Box>

      {/* Search Panel */}
      {searchOpen && (
        <>
          <MessageSearch
            onSearchChange={handleSearchChange}
            currentParams={searchParams}
            totalResults={totalCount}
            orderId={orderId}
          />
          <Divider />
        </>
      )}

      {/* Message List */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {loading && messages.length === 0 ? (
          <Box sx={{ p: 2 }}>
            {[...Array(3)].map((_, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Skeleton variant="circular" width={32} height={32} />
                  <Skeleton variant="text" width={120} />
                  <Skeleton variant="text" width={80} />
                </Box>
                <Skeleton variant="rectangular" height={60} sx={{ borderRadius: 1 }} />
              </Box>
            ))}
          </Box>
        ) : error ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="error" gutterBottom>
              {error}
            </Typography>
            <IconButton onClick={handleRefresh} color="primary">
              <RefreshIcon />
            </IconButton>
          </Box>
        ) : (
          <MessageList
            messages={messages}
            loading={loading}
            hasNextPage={hasNextPage}
            onLoadMore={handleLoadMore}
            onMessagesRead={handleMessagesRead}
            orderId={orderId}
          />
        )}
      </Box>

      {/* Message Composer */}
      <Box sx={{ borderTop: `1px solid ${theme.palette.divider}` }}>
        <MessageComposer
          orderId={orderId}
          onMessageSent={handleMessageSent}
        />
      </Box>
    </Paper>
  );
};

export default MessageCenter;