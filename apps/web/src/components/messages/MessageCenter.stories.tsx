import type { Meta, StoryObj } from '@storybook/react';
import { MessageCenter } from './MessageCenter';
import { fn } from '@storybook/test';

// Mock the message service for Storybook
const mockMessages = [
  {
    id: '1',
    senderId: 'user1',
    senderName: 'John Director',
    senderRole: 'Director',
    content: 'Hello, I have a question about the costume design for our spring musical. Can we schedule a call to discuss the color palette?',
    messageType: 'Question',
    recipientRole: 'ColorGarbStaff',
    isRead: false,
    readAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attachments: [],
    attachmentCount: 0,
    replyToMessageId: null,
    replyToMessage: null
  },
  {
    id: '2',
    senderId: 'staff1',
    senderName: 'ColorGarb Design Team',
    senderRole: 'ColorGarbStaff',
    content: 'Absolutely! I\'d be happy to discuss the color palette with you. I have some initial concepts ready to share. Would Tuesday at 2 PM work for you?',
    messageType: 'General',
    recipientRole: 'Director',
    isRead: true,
    readAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    attachments: [
      {
        id: 'att1',
        messageId: '2',
        originalFileName: 'color-palette-concepts.pdf',
        blobUrl: 'https://example.com/attachments/color-palette-concepts.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString()
      }
    ],
    attachmentCount: 1,
    replyToMessageId: '1',
    replyToMessage: null
  },
  {
    id: '3',
    senderId: 'user2',
    senderName: 'Sarah Finance',
    senderRole: 'Finance',
    content: 'Quick update on the budget - we\'ve approved the additional $500 for premium fabric upgrade. Please proceed with the materials selection.',
    messageType: 'Update',
    recipientRole: 'All',
    isRead: true,
    readAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    attachments: [],
    attachmentCount: 0,
    replyToMessageId: null,
    replyToMessage: null
  }
];

// Mock the messageService
window.mockMessageService = {
  getOrderMessages: () => Promise.resolve({
    messages: mockMessages,
    totalCount: mockMessages.length,
    unreadCount: mockMessages.filter(m => !m.isRead).length,
    hasNextPage: false
  }),
  sendMessage: (orderId: string, data: any) => Promise.resolve({
    message: {
      id: Date.now().toString(),
      senderId: 'current-user',
      senderName: 'Current User',
      senderRole: 'Director',
      content: data.content,
      messageType: data.messageType || 'General',
      recipientRole: data.recipientRole || 'All',
      isRead: false,
      readAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: [],
      attachmentCount: 0,
      replyToMessageId: data.replyToMessageId || null,
      replyToMessage: null
    }
  }),
  markMessageAsRead: () => Promise.resolve(),
  downloadAttachment: () => Promise.resolve(new Blob())
};

const meta: Meta<typeof MessageCenter> = {
  title: 'Components/Messages/MessageCenter',
  component: MessageCenter,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
The MessageCenter component provides a complete messaging interface for order-specific communication.

**Features:**
- Real-time message updates with auto-refresh
- Message composition with file attachments
- Advanced search and filtering
- Read receipt tracking
- Responsive design

**Usage:**
The MessageCenter appears as a fixed-position panel on the right side of the screen when opened.
It includes a message list, composer, and search functionality all in one component.
        `
      }
    }
  },
  argTypes: {
    orderId: {
      control: 'text',
      description: 'Unique identifier for the order'
    },
    open: {
      control: 'boolean',
      description: 'Whether the message center is visible'
    },
    orderNumber: {
      control: 'text',
      description: 'Human-readable order number for display'
    },
    orderDescription: {
      control: 'text',
      description: 'Order description for context'
    }
  },
  args: {
    onClose: fn(),
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    orderId: '123e4567-e89b-12d3-a456-426614174000',
    open: true,
    orderNumber: 'CG-2025-001',
    orderDescription: 'Spring Musical Costumes - West Side Story'
  }
};

export const WithUnreadMessages: Story = {
  args: {
    ...Default.args,
    orderDescription: 'High School Band Uniforms - Fall Competition Season'
  },
  parameters: {
    docs: {
      description: {
        story: 'Message center showing unread messages with notification badge'
      }
    }
  }
};

export const Closed: Story = {
  args: {
    ...Default.args,
    open: false
  },
  parameters: {
    docs: {
      description: {
        story: 'Message center in closed state (not visible)'
      }
    }
  }
};

export const LongOrderDescription: Story = {
  args: {
    ...Default.args,
    orderNumber: 'CG-2025-042',
    orderDescription: 'High School Marching Band Competition Uniforms - State Championship Season with Custom Embroidery and Specialized Accessories'
  },
  parameters: {
    docs: {
      description: {
        story: 'Message center with a long order description that should wrap properly'
      }
    }
  }
};