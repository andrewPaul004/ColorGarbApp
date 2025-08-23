import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { OrderCard } from '../../../src/components/common/OrderCard';
import { Order } from '../../../src/types/shared';

// Mock theme for Material-UI components
const theme = createTheme();

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

// Mock order data for testing
const mockOrder: Order = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  orderNumber: 'CG-2023-001',
  description: 'Spring Musical Costumes for Main Characters',
  currentStage: 'Measurements',
  originalShipDate: new Date('2023-12-15'),
  currentShipDate: new Date('2023-12-20'),
  totalAmount: 5000.00,
  paymentStatus: 'Partial',
  notes: 'Special requirements for lead actress costume',
  isActive: true,
  createdAt: new Date('2023-10-01'),
  updatedAt: new Date('2023-11-01'),
  organizationName: 'Test High School Drama Department'
};

const mockOverdueOrder: Order = {
  ...mockOrder,
  id: '987fcdeb-51d2-45a3-9876-543210987654',
  orderNumber: 'CG-2023-002',
  currentShipDate: new Date('2023-01-01'), // Past date
  paymentStatus: 'Paid',
  currentStage: 'Quality Control'
};

describe('OrderCard Component', () => {
  it('renders order information correctly', () => {
    render(
      <TestWrapper>
        <OrderCard order={mockOrder} />
      </TestWrapper>
    );

    // Check if order number is displayed
    expect(screen.getByText('CG-2023-001')).toBeInTheDocument();

    // Check if description is displayed
    expect(screen.getByText('Spring Musical Costumes for Main Characters')).toBeInTheDocument();

    // Check if current stage is displayed
    expect(screen.getByText('Measurements')).toBeInTheDocument();

    // Check if payment status chip is displayed
    expect(screen.getByText('Partial')).toBeInTheDocument();

    // Check if total amount is displayed
    expect(screen.getByText('$5,000.00')).toBeInTheDocument();
  });

  it('displays correct payment status color', () => {
    const { rerender } = render(
      <TestWrapper>
        <OrderCard order={mockOrder} />
      </TestWrapper>
    );

    // Test partial payment status (warning color)
    let paymentChip = screen.getByText('Partial').closest('.MuiChip-root');
    expect(paymentChip).toHaveClass('MuiChip-colorWarning');

    // Test paid status (success color)
    const paidOrder = { ...mockOrder, paymentStatus: 'Paid' };
    rerender(
      <TestWrapper>
        <OrderCard order={paidOrder} />
      </TestWrapper>
    );
    
    paymentChip = screen.getByText('Paid').closest('.MuiChip-root');
    expect(paymentChip).toHaveClass('MuiChip-colorSuccess');
  });

  it('calculates and displays stage progress correctly', () => {
    render(
      <TestWrapper>
        <OrderCard order={mockOrder} />
      </TestWrapper>
    );

    // Measurements is the 4th stage out of 13, so progress should be ~31%
    expect(screen.getByText('31%')).toBeInTheDocument();

    // Check if progress bar is present
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '31');
  });

  it('formats dates correctly', () => {
    render(
      <TestWrapper>
        <OrderCard order={mockOrder} />
      </TestWrapper>
    );

    // Check if ship date is formatted properly
    expect(screen.getByText('Dec 20, 2023')).toBeInTheDocument();
  });

  it('shows overdue status for past ship dates', () => {
    render(
      <TestWrapper>
        <OrderCard order={mockOverdueOrder} />
      </TestWrapper>
    );

    // The overdue date should be styled with error color (red)
    const dateElement = screen.getByText('Jan 1, 2023');
    expect(dateElement).toHaveStyle('color: rgb(211, 47, 47)'); // MUI error.main color
  });

  it('handles click events when onClick is provided', () => {
    const handleClick = jest.fn();
    
    render(
      <TestWrapper>
        <OrderCard order={mockOrder} onClick={handleClick} />
      </TestWrapper>
    );

    const card = screen.getByRole('button');
    expect(card).toBeInTheDocument();

    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledWith(mockOrder);
  });

  it('handles keyboard events when onClick is provided', () => {
    const handleClick = jest.fn();
    
    render(
      <TestWrapper>
        <OrderCard order={mockOrder} onClick={handleClick} />
      </TestWrapper>
    );

    const card = screen.getByRole('button');

    // Test Enter key
    fireEvent.keyPress(card, { key: 'Enter', code: 'Enter', charCode: 13 });
    expect(handleClick).toHaveBeenCalledWith(mockOrder);

    // Test Space key
    fireEvent.keyPress(card, { key: ' ', code: 'Space', charCode: 32 });
    expect(handleClick).toHaveBeenCalledWith(mockOrder);
  });

  it('does not add click handlers when onClick is not provided', () => {
    render(
      <TestWrapper>
        <OrderCard order={mockOrder} />
      </TestWrapper>
    );

    // Should not have button role when no onClick is provided
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    
    // Card should still be present but without interactive properties
    const cardElement = screen.getByText('CG-2023-001').closest('.MuiCard-root');
    expect(cardElement).toBeInTheDocument();
    expect(cardElement).not.toHaveAttribute('tabindex');
  });

  it('truncates long descriptions properly', () => {
    const longDescriptionOrder: Order = {
      ...mockOrder,
      description: 'This is a very long description that should be truncated to fit within the card layout. It contains multiple sentences and should show ellipsis when truncated to maintain clean visual appearance.'
    };

    render(
      <TestWrapper>
        <OrderCard order={longDescriptionOrder} />
      </TestWrapper>
    );

    const descriptionElement = screen.getByText(/This is a very long description/);
    
    // Check if the element has the CSS classes for truncation
    expect(descriptionElement).toHaveStyle({
      'display': '-webkit-box',
      '-webkit-line-clamp': '2',
      '-webkit-box-orient': 'vertical',
      'overflow': 'hidden'
    });
  });

  it('shows different progress for different stages', () => {
    const shippedOrder: Order = {
      ...mockOrder,
      currentStage: 'Shipped' // Last stage should show 100%
    };

    render(
      <TestWrapper>
        <OrderCard order={shippedOrder} />
      </TestWrapper>
    );

    expect(screen.getByText('100%')).toBeInTheDocument();
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  it('handles unknown stages gracefully', () => {
    const unknownStageOrder: Order = {
      ...mockOrder,
      currentStage: 'Unknown Stage'
    };

    render(
      <TestWrapper>
        <OrderCard order={unknownStageOrder} />
      </TestWrapper>
    );

    // Should display the stage name even if unknown
    expect(screen.getByText('Unknown Stage')).toBeInTheDocument();
    
    // Should show 0% progress for unknown stages
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('displays inactive orders correctly', () => {
    const inactiveOrder: Order = {
      ...mockOrder,
      isActive: false,
      currentStage: 'Shipped'
    };

    render(
      <TestWrapper>
        <OrderCard order={inactiveOrder} />
      </TestWrapper>
    );

    // Should still display all information for inactive orders
    expect(screen.getByText(inactiveOrder.orderNumber)).toBeInTheDocument();
    expect(screen.getByText('Shipped')).toBeInTheDocument();
    
    // Date should not be styled as overdue for inactive orders
    const dateElement = screen.getByText('Dec 20, 2023');
    expect(dateElement).not.toHaveStyle('color: rgb(211, 47, 47)');
  });
});