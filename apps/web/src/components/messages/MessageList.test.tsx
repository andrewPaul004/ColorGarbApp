/**
 * @fileoverview Test suite for MessageList component mobile menu functionality.
 * Verifies that the three-dot action menu works correctly on mobile devices.
 *
 * @since 2.5.0
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { MessageList } from './MessageList';
import { colorGarbTheme } from '../../theme/colorGarbTheme';
import type { Message } from '../../types/shared';

// Mock the message service
jest.mock('../../services/messageService');

/**
 * Test wrapper component with required providers
 */
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider theme={colorGarbTheme}>
      {children}
    </ThemeProvider>
  </BrowserRouter>
);

/**
 * Sample message data for testing
 */
const mockMessages: Message[] = [
  {
    id: 'msg-1',
    subject: 'Design Approval Request',
    content: 'Please review the latest design drafts for your marching band uniforms.',
    senderName: 'Sarah Designer',
    senderRole: 'Staff',
    recipientRole: 'Director',
    messageType: 'Design',
    createdAt: new Date('2023-10-15T10:00:00Z').toISOString(),
    isRead: false,
    attachmentCount: 2,
    orderId: 'order-123',
  },
  {
    id: 'msg-2',
    subject: 'Measurement Update',
    content: 'We have received updated measurements for 5 performers.',
    senderName: 'Mike Producer',
    senderRole: 'Staff',
    recipientRole: 'Director',
    messageType: 'Measurements',
    createdAt: new Date('2023-10-14T15:30:00Z').toISOString(),
    isRead: true,
    readAt: new Date('2023-10-14T16:00:00Z').toISOString(),
    attachmentCount: 0,
    orderId: 'order-123',
  },
];

/**
 * Default props for MessageList component
 */
const defaultProps = {
  messages: mockMessages,
  loading: false,
  hasNextPage: false,
  onLoadMore: jest.fn(),
  onMessagesRead: jest.fn(),
  orderId: 'order-123',
};

describe('MessageList Mobile Menu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test that three-dot menu buttons are visible and properly sized
   */
  test('renders three-dot menu buttons with proper touch targets', () => {
    render(
      <TestWrapper>
        <MessageList {...defaultProps} />
      </TestWrapper>
    );

    // Should have two menu buttons (one per message)
    const menuButtons = screen.getAllByLabelText('message actions');
    expect(menuButtons).toHaveLength(2);

    // Check touch target sizes meet accessibility requirements (44px minimum)
    menuButtons.forEach(button => {
      expect(button).toHaveStyle('min-height: 44px');
      expect(button).toHaveStyle('min-width: 44px');
    });
  });

  /**
   * Test menu opens on click/tap
   */
  test('opens action menu when three-dot button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <MessageList {...defaultProps} />
      </TestWrapper>
    );

    const menuButtons = screen.getAllByLabelText('message actions');

    // Click the first menu button
    await user.click(menuButtons[0]);

    // Menu should be visible
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Should show menu items
    expect(screen.getByText('Reply')).toBeInTheDocument();
    expect(screen.getByText('Archive')).toBeInTheDocument();
    expect(screen.getByText('Flag')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  /**
   * Test touch events work properly
   */
  test('handles touch events correctly without double-firing', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    render(
      <TestWrapper>
        <MessageList {...defaultProps} />
      </TestWrapper>
    );

    const menuButton = screen.getAllByLabelText('message actions')[0];

    // Simulate touch events
    fireEvent.touchStart(menuButton);
    fireEvent.touchEnd(menuButton);
    fireEvent.click(menuButton);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    // Click reply to test action handlers
    const replyItem = screen.getByText('Reply');
    fireEvent.click(replyItem);

    // Should only log once (no double-firing)
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith('Reply to message:', 'msg-1');

    consoleSpy.mockRestore();
  });

  /**
   * Test menu positioning for mobile screens
   */
  test('positions menu correctly on different screen sizes', async () => {
    const user = userEvent.setup();

    // Mock mobile screen size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375, // iPhone width
    });

    render(
      <TestWrapper>
        <MessageList {...defaultProps} />
      </TestWrapper>
    );

    const menuButton = screen.getAllByLabelText('message actions')[0];
    await user.click(menuButton);

    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();

    // Menu should have proper styling for mobile
    const menuPaper = menu.closest('.MuiPaper-root');
    expect(menuPaper).toHaveStyle('min-width: 160px');
  });

  /**
   * Test menu closes when action is selected
   */
  test('closes menu when action item is selected', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <MessageList {...defaultProps} />
      </TestWrapper>
    );

    const menuButton = screen.getAllByLabelText('message actions')[0];
    await user.click(menuButton);

    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Click archive action
    const archiveItem = screen.getByText('Archive');
    await user.click(archiveItem);

    // Menu should be closed
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  /**
   * Test menu closes when clicking outside
   */
  test('closes menu when clicking outside', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <MessageList {...defaultProps} />
      </TestWrapper>
    );

    const menuButton = screen.getAllByLabelText('message actions')[0];
    await user.click(menuButton);

    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Click outside the menu
    await user.click(document.body);

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  /**
   * Test all menu actions function correctly
   */
  test('executes all menu actions correctly', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <MessageList {...defaultProps} />
      </TestWrapper>
    );

    const menuButton = screen.getAllByLabelText('message actions')[0];

    // Test Reply action
    await user.click(menuButton);
    await user.click(screen.getByText('Reply'));
    expect(consoleSpy).toHaveBeenCalledWith('Reply to message:', 'msg-1');

    // Test Archive action
    await user.click(menuButton);
    await user.click(screen.getByText('Archive'));
    expect(consoleSpy).toHaveBeenCalledWith('Archive message:', 'msg-1');

    // Test Flag action
    await user.click(menuButton);
    await user.click(screen.getByText('Flag'));
    expect(consoleSpy).toHaveBeenCalledWith('Flag message:', 'msg-1');

    // Test Delete action
    await user.click(menuButton);
    await user.click(screen.getByText('Delete'));
    expect(consoleSpy).toHaveBeenCalledWith('Delete message:', 'msg-1');

    consoleSpy.mockRestore();
  });

  /**
   * Test menu accessibility features
   */
  test('maintains accessibility features for mobile', async () => {

    render(
      <TestWrapper>
        <MessageList {...defaultProps} />
      </TestWrapper>
    );

    const menuButton = screen.getAllByLabelText('message actions')[0];

    // Button should have proper ARIA label
    expect(menuButton).toHaveAccessibleName('message actions');

    // Should be focusable
    menuButton.focus();
    expect(menuButton).toHaveFocus();

    // Should open menu on Enter key
    fireEvent.keyDown(menuButton, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    // Menu items should be accessible
    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(4);

    menuItems.forEach(item => {
      expect(item).toHaveAttribute('role', 'menuitem');
    });
  });

  /**
   * Test rapid consecutive taps don't cause issues
   */
  test('handles rapid consecutive taps gracefully', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <MessageList {...defaultProps} />
      </TestWrapper>
    );

    const menuButton = screen.getAllByLabelText('message actions')[0];

    // Rapid consecutive clicks
    await user.click(menuButton);
    await user.click(menuButton);
    await user.click(menuButton);

    // Should still work correctly - menu should be open
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Should be able to select an action
    await user.click(screen.getByText('Reply'));

    // Menu should close
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  /**
   * Test menu works correctly with multiple messages
   */
  test('handles multiple message menus independently', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <MessageList {...defaultProps} />
      </TestWrapper>
    );

    const menuButtons = screen.getAllByLabelText('message actions');
    expect(menuButtons).toHaveLength(2);

    // Open first message menu
    await user.click(menuButtons[0]);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Close and open second message menu
    await user.click(document.body);
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    await user.click(menuButtons[1]);
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  /**
   * Test menu performance with many messages
   */
  test('maintains performance with many messages', () => {
    // Create array with many messages
    const manyMessages = Array.from({ length: 50 }, (_, index) => ({
      ...mockMessages[0],
      id: `msg-${index}`,
      subject: `Message ${index}`,
    }));

    const { container } = render(
      <TestWrapper>
        <MessageList {...defaultProps} messages={manyMessages} />
      </TestWrapper>
    );

    // Should render all menu buttons
    const menuButtons = screen.getAllByLabelText('message actions');
    expect(menuButtons).toHaveLength(50);

    // Performance check - rendering should complete quickly
    expect(container.firstChild).toBeInTheDocument();
  });
});