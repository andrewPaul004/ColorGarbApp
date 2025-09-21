import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Divider,
  useTheme,
  alpha
} from '@mui/material';
import {
  Reply as ReplyIcon,
  AttachFile as AttachFileIcon,
  Download as DownloadIcon,
  MoreVert as MoreVertIcon,
  Circle as UnreadIcon
} from '@mui/icons-material';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import type { Message } from '../../types/shared';
import messageService from '../../services/messageService';

/**
 * Props for the MessageList component
 */
interface MessageListProps {
  /** Array of messages to display */
  messages: Message[];
  /** Whether more messages are loading */
  loading: boolean;
  /** Whether there are more messages to load */
  hasNextPage: boolean;
  /** Callback to load more messages */
  onLoadMore: () => void;
  /** Callback when messages are marked as read */
  onMessagesRead: (messageIds: string[]) => void;
  /** Order ID for the messages */
  orderId: string;
}

/**
 * Individual message item component
 */
interface MessageItemProps {
  message: Message;
  orderId: string;
  onMessageRead: (messageId: string) => void;
}

/**
 * Formats a message timestamp for display
 */
const formatMessageTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  
  if (isToday(date)) {
    return format(date, 'HH:mm');
  } else if (isYesterday(date)) {
    return `Yesterday ${format(date, 'HH:mm')}`;
  } else {
    return format(date, 'MMM d, HH:mm');
  }
};

/**
 * Gets the relative time for tooltips
 */
const getRelativeTime = (timestamp: string): string => {
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
};

/**
 * Gets color for sender role
 */
const getSenderRoleColor = (role: string): 'primary' | 'secondary' | 'success' | 'warning' => {
  switch (role.toLowerCase()) {
    case 'director':
      return 'primary';
    case 'finance':
      return 'secondary';
    case 'colorgarbstaff':
      return 'success';
    default:
      return 'warning';
  }
};

/**
 * Gets color for message type
 */
const getMessageTypeColor = (type: string): 'default' | 'primary' | 'secondary' | 'error' => {
  switch (type.toLowerCase()) {
    case 'urgent':
      return 'error';
    case 'question':
      return 'primary';
    case 'update':
      return 'secondary';
    default:
      return 'default';
  }
};

/**
 * Individual message component
 */
const MessageItem: React.FC<MessageItemProps> = ({ message, orderId, onMessageRead }) => {
  const theme = useTheme();
  const [downloadingAttachment, setDownloadingAttachment] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Swipe gesture state
  const [swipeState, setSwipeState] = useState({
    startX: 0,
    currentX: 0,
    isDragging: false,
    showActions: false
  });
  const swipeThreshold = 100; // pixels

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  /**
   * Handles downloading an attachment
   */
  const handleDownloadAttachment = async (attachmentId: string, fileName: string) => {
    try {
      setDownloadingAttachment(attachmentId);
      const blob = await messageService.downloadAttachment(orderId, message.id, attachmentId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
    } finally {
      setDownloadingAttachment(null);
    }
  };

  /**
   * Handles marking message as read when clicked
   */
  const handleMessageClick = () => {
    if (!message.isRead) {
      onMessageRead(message.id);
    }
  };

  /**
   * Handles touch start for swipe gestures (mobile)
   */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    
    const touch = e.touches[0];
    setSwipeState({
      startX: touch.clientX,
      currentX: touch.clientX,
      isDragging: true,
      showActions: false
    });
  }, [isMobile]);

  /**
   * Handles touch move for swipe gestures (mobile)
   */
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !swipeState.isDragging) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeState.startX;
    
    // Only allow left swipe (reveal actions)
    if (deltaX < 0) {
      setSwipeState(prev => ({
        ...prev,
        currentX: touch.clientX
      }));
    }
  }, [isMobile, swipeState.isDragging, swipeState.startX]);

  /**
   * Handles touch end for swipe gestures (mobile)
   */
  const handleTouchEnd = useCallback(() => {
    if (!isMobile || !swipeState.isDragging) return;
    
    const deltaX = swipeState.currentX - swipeState.startX;
    const shouldShowActions = deltaX < -swipeThreshold;
    
    setSwipeState(prev => ({
      ...prev,
      isDragging: false,
      showActions: shouldShowActions
    }));
  }, [isMobile, swipeState.isDragging, swipeState.currentX, swipeState.startX, swipeThreshold]);

  /**
   * Handles reply action (mobile swipe or desktop button)
   */
  const handleReply = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement reply functionality
    console.log('Reply to message:', message.id);
    
    // Hide swipe actions after action
    if (isMobile) {
      setSwipeState(prev => ({ ...prev, showActions: false }));
    }
  }, [message.id, isMobile]);

  /**
   * Formats file size for display
   */
  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const deltaX = swipeState.currentX - swipeState.startX;
  const swipeOffset = swipeState.isDragging && deltaX < 0 ? Math.max(deltaX, -swipeThreshold * 1.5) : 0;

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          bgcolor: alpha(theme.palette.action.hover, 0.04)
        },
      }}
    >
      {/* Swipe Actions (Mobile) */}
      {isMobile && swipeState.showActions && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: 80,
            bgcolor: theme.palette.primary.main,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1,
          }}
        >
          <IconButton
            size="small"
            onClick={handleReply}
            sx={{ 
              color: 'white',
              minWidth: 44,
              minHeight: 44
            }}
          >
            <ReplyIcon />
          </IconButton>
        </Box>
      )}

      {/* Main Message Content */}
      <Box
        onClick={handleMessageClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        sx={{
          p: { xs: 1.5, md: 2 },
          cursor: message.isRead ? 'default' : 'pointer',
          bgcolor: message.isRead ? 'transparent' : alpha(theme.palette.primary.main, 0.05),
          borderLeft: message.isRead ? 'none' : `4px solid ${theme.palette.primary.main}`,
          transform: isMobile ? `translateX(${swipeOffset}px)` : 'none',
          transition: swipeState.isDragging 
            ? 'none' 
            : theme.transitions.create(['background-color', 'border-left', 'transform'], {
                duration: theme.transitions.duration.short,
              }),
          // Prevent text selection during swipe
          userSelect: swipeState.isDragging ? 'none' : 'auto',
          WebkitUserSelect: swipeState.isDragging ? 'none' : 'auto',
        }}
      >
      {/* Message Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1 }}>
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: theme.palette.primary.main,
            fontSize: '0.875rem'
          }}
        >
          {message.senderName.charAt(0).toUpperCase()}
        </Avatar>
        
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {message.senderName}
            </Typography>
            <Chip
              label={message.senderRole}
              size="small"
              color={getSenderRoleColor(message.senderRole)}
              variant="outlined"
              sx={{ height: 18, fontSize: '0.675rem' }}
            />
            {message.messageType !== 'General' && (
              <Chip
                label={message.messageType}
                size="small"
                color={getMessageTypeColor(message.messageType)}
                variant="filled"
                sx={{ height: 18, fontSize: '0.675rem' }}
              />
            )}
            {!message.isRead && (
              <UnreadIcon
                color="primary"
                sx={{ fontSize: 8, ml: 0.5 }}
              />
            )}
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={getRelativeTime(message.createdAt)}>
              <Typography variant="caption" color="text.secondary">
                {formatMessageTime(message.createdAt)}
              </Typography>
            </Tooltip>
            {message.recipientRole !== 'All' && (
              <Typography variant="caption" color="text.secondary">
                → {message.recipientRole}
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {message.attachmentCount > 0 && (
            <AttachFileIcon color="action" sx={{ fontSize: 16 }} />
          )}
          <IconButton size="small" sx={{ opacity: 0.7 }}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Message Content */}
      <Box sx={{ ml: 6, mb: message.attachments.length > 0 ? 2 : 0 }}>
        <Typography 
          variant="body2" 
          sx={{ 
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            lineHeight: 1.5
          }}
        >
          {message.content}
        </Typography>
      </Box>

      {/* Attachments */}
      {message.attachments.length > 0 && (
        <Box sx={{ ml: 6 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {message.attachments.length} attachment{message.attachments.length !== 1 ? 's' : ''}:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {message.attachments.map((attachment) => (
              <Box
                key={attachment.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  bgcolor: alpha(theme.palette.background.paper, 0.5)
                }}
              >
                <AttachFileIcon color="action" sx={{ fontSize: 16 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontWeight: 500,
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {attachment.originalFileName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(attachment.fileSize)}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadAttachment(attachment.id, attachment.originalFileName);
                  }}
                  disabled={downloadingAttachment === attachment.id}
                  title="Download attachment"
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Action Buttons */}
      <Box sx={{ 
        ml: { xs: 5, md: 6 }, 
        mt: 1, 
        display: 'flex', 
        gap: 1,
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' }
      }}>
        {/* Desktop Reply Button (hidden on mobile with swipe) */}
        {!isMobile && (
          <Button
            size="small"
            startIcon={<ReplyIcon />}
            sx={{ textTransform: 'none', fontSize: '0.75rem' }}
            onClick={handleReply}
          >
            Reply
          </Button>
        )}
        
        {/* Mobile hint text */}
        {isMobile && (
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ 
              fontSize: '0.7rem',
              opacity: 0.7,
              fontStyle: 'italic'
            }}
          >
            Swipe left to reply
          </Typography>
        )}
        
        {message.readAt && (
          <Typography variant="caption" color="text.secondary">
            Read {getRelativeTime(message.readAt)}
          </Typography>
        )}
      </Box>
      </Box>
    </Box>
  );
};

/**
 * Message list component with virtual scrolling and infinite loading
 */
export const MessageList: React.FC<MessageListProps> = ({
  messages,
  loading,
  hasNextPage,
  onLoadMore,
  onMessagesRead,
  orderId
}) => {
  const theme = useTheme();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [visibleMessages, setVisibleMessages] = useState(new Set<string>());

  /**
   * Handles marking a single message as read
   */
  const handleMessageRead = async (messageId: string) => {
    try {
      await messageService.markMessageAsRead(orderId, messageId);
      onMessagesRead([messageId]);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  /**
   * Intersection observer to handle infinite scrolling and read receipts
   */
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const newVisibleMessages = new Set(visibleMessages);
        
        entries.forEach((entry) => {
          const messageId = entry.target.getAttribute('data-message-id');
          if (!messageId) return;

          if (entry.isIntersecting) {
            newVisibleMessages.add(messageId);
            
            // If this is near the bottom and we have more messages, load them
            if (entry.intersectionRatio > 0.5 && hasNextPage && !loading) {
              const rect = entry.target.getBoundingClientRect();
              const containerRect = scrollContainer.getBoundingClientRect();
              const distanceFromBottom = containerRect.bottom - rect.bottom;
              
              if (distanceFromBottom < 200) {
                onLoadMore();
              }
            }
          } else {
            newVisibleMessages.delete(messageId);
          }
        });

        setVisibleMessages(newVisibleMessages);
      },
      {
        root: scrollContainer,
        threshold: [0, 0.5, 1],
        rootMargin: '50px'
      }
    );

    // Observe all message elements
    const messageElements = scrollContainer.querySelectorAll('[data-message-id]');
    messageElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [messages, hasNextPage, loading, onLoadMore, visibleMessages]);

  if (messages.length === 0 && !loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          p: 4,
          textAlign: 'center'
        }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No messages yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Start the conversation by sending a message below
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={scrollContainerRef}
      sx={{
        height: '100%',
        overflowY: 'auto',
        scrollBehavior: 'smooth'
      }}
    >
      {messages.map((message, index) => (
        <React.Fragment key={message.id}>
          <Box data-message-id={message.id}>
            <MessageItem
              message={message}
              orderId={orderId}
              onMessageRead={handleMessageRead}
            />
          </Box>
          {index < messages.length - 1 && <Divider />}
        </React.Fragment>
      ))}
      
      {loading && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Loading more messages...
          </Typography>
        </Box>
      )}
      
      {hasNextPage && !loading && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Button variant="outlined" onClick={onLoadMore} size="small">
            Load More Messages
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default MessageList;