import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  IconButton,
  Chip,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Typography,
  Alert,
  CircularProgress,
  useTheme,
  alpha,
  Tooltip
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  CameraAlt as CameraIcon,
  PhotoLibrary as PhotoLibraryIcon
} from '@mui/icons-material';
import type { Message, SendMessageRequest } from '@colorgarb/shared';
import messageService from '../../services/messageService';

/**
 * Props for the MessageComposer component
 */
interface MessageComposerProps {
  /** Order ID for the message thread */
  orderId: string;
  /** Callback when a message is successfully sent */
  onMessageSent: (message: Message) => void;
  /** Reply to message ID (optional) */
  replyToMessageId?: string;
  /** Placeholder text for the message input */
  placeholder?: string;
}

/**
 * File attachment interface for UI state
 */
interface AttachmentFile {
  file: File;
  id: string;
  name: string;
  size: number;
  type: string;
}

/**
 * Message composer component for sending messages with file attachments
 * Supports message types, recipient roles, and file uploads
 * 
 * @component
 * @example
 * ```tsx
 * <MessageComposer
 *   orderId="123e4567-e89b-12d3-a456-426614174000"
 *   onMessageSent={(message) => console.log('Message sent:', message)}
 *   placeholder="Type your message here..."
 * />
 * ```
 */
export const MessageComposer: React.FC<MessageComposerProps> = ({
  orderId,
  onMessageSent,
  replyToMessageId,
  placeholder = 'Type your message...'
}) => {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [content, setContent] = useState('');
  const [messageType, setMessageType] = useState('General');
  const [recipientRole, setRecipientRole] = useState('All');
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  
  // UI state
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Maximum file size (10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  // Allowed file types
  const ALLOWED_FILE_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv'
  ];

  // Check if device supports camera
  const [isMobile, setIsMobile] = useState(false);
  const [supportsCameraCapture, setSupportsCameraCapture] = useState(false);

  useEffect(() => {
    const checkMobileAndCamera = () => {
      const mobile = window.innerWidth < 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);
      
      // Check if device supports camera capture
      const hasCamera = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
      setSupportsCameraCapture(mobile && hasCamera);
    };

    checkMobileAndCamera();
    window.addEventListener('resize', checkMobileAndCamera);
    return () => window.removeEventListener('resize', checkMobileAndCamera);
  }, []);

  /**
   * Formats file size for display
   */
  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  /**
   * Validates file before adding to attachments
   */
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`;
    }
    
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `File type "${file.type}" is not allowed.`;
    }
    
    return null;
  };

  /**
   * Handles file selection from input or camera
   */
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newAttachments: AttachmentFile[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
        return;
      }

      // Check for duplicate files (for regular files, not camera captures)
      if (!file.name.startsWith('image_')) {
        const isDuplicate = attachments.some(att => 
          att.name === file.name && att.size === file.size
        );
        
        if (isDuplicate) {
          errors.push(`File "${file.name}" is already attached.`);
          return;
        }
      }

      // Generate friendly name for camera captures
      const fileName = file.name.startsWith('image_') 
        ? `Photo_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${file.type.split('/')[1]}`
        : file.name;

      newAttachments.push({
        file,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: fileName,
        size: file.size,
        type: file.type
      });
    });

    if (errors.length > 0) {
      setError(errors.join(' '));
    } else {
      setError(null);
    }

    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments]);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [attachments]);

  /**
   * Handles camera capture for mobile devices
   */
  const handleCameraCapture = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.click();
    }
  }, []);

  /**
   * Handles photo library selection for mobile devices
   */
  const handlePhotoLibrary = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.click();
    }
  }, []);

  /**
   * Handles regular file attachment
   */
  const handleFileAttach = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.accept = ALLOWED_FILE_TYPES.join(',');
      fileInputRef.current.click();
    }
  }, []);

  /**
   * Removes an attachment from the list
   */
  const removeAttachment = useCallback((attachmentId: string) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  }, []);

  /**
   * Handles drag over event for file drop
   */
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  /**
   * Handles file drop event
   */
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer.files;
    if (!files) return;

    // Create a synthetic event for handleFileSelect
    const syntheticEvent = {
      target: { files }
    } as React.ChangeEvent<HTMLInputElement>;

    handleFileSelect(syntheticEvent);
  }, [handleFileSelect]);

  /**
   * Resets the form to initial state
   */
  const resetForm = useCallback(() => {
    setContent('');
    setMessageType('General');
    setRecipientRole('All');
    setAttachments([]);
    setError(null);
    setShowAdvanced(false);
  }, []);

  /**
   * Handles form submission
   */
  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!content.trim() && attachments.length === 0) {
      setError('Please enter a message or attach files.');
      return;
    }

    try {
      setSending(true);
      setError(null);

      const messageData: SendMessageRequest = {
        content: content.trim(),
        messageType: messageType !== 'General' ? messageType : undefined,
        recipientRole: recipientRole !== 'All' ? recipientRole : undefined,
        replyToMessageId,
        attachments: attachments.map(att => att.file)
      };

      const response = await messageService.sendMessage(orderId, messageData);
      
      onMessageSent(response.message);
      resetForm();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  }, [content, messageType, recipientRole, replyToMessageId, attachments, orderId, onMessageSent, resetForm]);

  /**
   * Toggles advanced options visibility
   */
  const toggleAdvanced = useCallback(() => {
    setShowAdvanced(prev => !prev);
  }, []);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        p: 2,
        bgcolor: theme.palette.background.paper
      }}
    >
      {/* Error Alert */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Reply Indicator */}
      {replyToMessageId && (
        <Box sx={{ mb: 2, p: 1, bgcolor: alpha(theme.palette.info.main, 0.1), borderRadius: 1 }}>
          <Typography variant="caption" color="info.main">
            Replying to message
          </Typography>
        </Box>
      )}

      {/* Advanced Options */}
      {(showAdvanced || messageType !== 'General' || recipientRole !== 'All') && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={messageType}
              onChange={(e) => setMessageType(e.target.value)}
              label="Type"
            >
              <MenuItem value="General">General</MenuItem>
              <MenuItem value="Question">Question</MenuItem>
              <MenuItem value="Update">Update</MenuItem>
              <MenuItem value="Urgent">Urgent</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>To</InputLabel>
            <Select
              value={recipientRole}
              onChange={(e) => setRecipientRole(e.target.value)}
              label="To"
            >
              <MenuItem value="All">All Staff</MenuItem>
              <MenuItem value="Director">Director</MenuItem>
              <MenuItem value="Finance">Finance</MenuItem>
              <MenuItem value="ColorGarbStaff">ColorGarb Staff</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}

      {/* File Attachments */}
      {attachments.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Attachments ({attachments.length}):
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {attachments.map((attachment) => (
              <Chip
                key={attachment.id}
                label={`${attachment.name} (${formatFileSize(attachment.size)})`}
                onDelete={() => removeAttachment(attachment.id)}
                deleteIcon={<CloseIcon />}
                variant="outlined"
                size="small"
                sx={{ maxWidth: '100%' }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Main Input Area */}
      <Box
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        sx={{
          position: 'relative',
          '&:hover .attach-button': {
            opacity: 1
          }
        }}
      >
        <TextField
          multiline
          rows={isMobile ? 2 : 3}
          fullWidth
          placeholder={placeholder}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={sending}
          inputProps={{
            // Mobile-specific attributes
            autoCapitalize: 'sentences',
            autoCorrect: 'on',
            inputMode: 'text',
            ...(isMobile && {
              // Mobile keyboard optimizations
              enterKeyHint: 'send',
            })
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              pr: isMobile ? 16 : 8, // More space for mobile attach buttons
              fontSize: { xs: '16px', md: '14px' }, // Prevent zoom on iOS
            },
            '& .MuiInputBase-input': {
              // Better touch target for mobile
              minHeight: { xs: '20px', md: 'auto' },
            }
          }}
          onKeyDown={(e) => {
            // Send on Enter (but not Shift+Enter) on mobile
            if (isMobile && e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (content.trim() || attachments.length > 0) {
                handleSubmit(e as any);
              }
            }
          }}
        />
        
        {/* Mobile Attachment Options */}
        {isMobile ? (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              display: 'flex',
              gap: 0.5
            }}
          >
            {supportsCameraCapture && (
              <Tooltip title="Take photo">
                <IconButton
                  size="small"
                  onClick={handleCameraCapture}
                  disabled={sending}
                  sx={{ opacity: 0.7, transition: 'opacity 0.2s' }}
                >
                  <CameraIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Choose photo">
              <IconButton
                size="small"
                onClick={handlePhotoLibrary}
                disabled={sending}
                sx={{ opacity: 0.7, transition: 'opacity 0.2s' }}
              >
                <PhotoLibraryIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Attach file">
              <IconButton
                size="small"
                onClick={handleFileAttach}
                disabled={sending}
                sx={{ opacity: 0.7, transition: 'opacity 0.2s' }}
              >
                <AttachFileIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        ) : (
          /* Desktop Attach Button */
          <Tooltip title="Attach files">
            <IconButton
              className="attach-button"
              size="small"
              onClick={handleFileAttach}
              disabled={sending}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                opacity: 0.7,
                transition: 'opacity 0.2s'
              }}
            >
              <AttachFileIcon />
            </IconButton>
          </Tooltip>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_FILE_TYPES.join(',')}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            size="small"
            onClick={toggleAdvanced}
            sx={{ textTransform: 'none' }}
          >
            {showAdvanced ? 'Hide' : 'Show'} Options
          </Button>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            type="submit"
            variant="contained"
            startIcon={sending ? <CircularProgress size={16} /> : <SendIcon />}
            disabled={sending || (!content.trim() && attachments.length === 0)}
            size="small"
          >
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </Box>
      </Box>

      {/* File Drop Hint */}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
        Drag and drop files here or click <CloudUploadIcon sx={{ fontSize: 14, mx: 0.5 }} /> to attach
      </Typography>
    </Box>
  );
};

export default MessageComposer;