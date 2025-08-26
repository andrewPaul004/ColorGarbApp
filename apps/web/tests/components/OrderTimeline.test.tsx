import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { OrderTimeline } from '../../src/components/timeline/OrderTimeline';
import type { StageHistory } from '@colorgarb/shared/types/order';

// Create a test theme for consistent testing
const testTheme = createTheme();

// Test wrapper component with theme provider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={testTheme}>
    {children}
  </ThemeProvider>
);

// Mock stage history data for testing
const mockStageHistory: StageHistory[] = [
  {
    id: '1',
    stage: 'DesignProposal',
    enteredAt: new Date('2023-01-01'),
    updatedBy: 'staff-user',
    notes: 'Initial design created'
  },
  {
    id: '2', 
    stage: 'ProofApproval',
    enteredAt: new Date('2023-01-05'),
    updatedBy: 'client-user',
    notes: 'Proof approved by client'
  }
];

describe('OrderTimeline', () => {
  beforeEach(() => {
    // Clear any previous test artifacts
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('displays all 13 stages with correct names', () => {
      render(
        <TestWrapper>
          <OrderTimeline
            orderId="test-order-id"
            currentStage="Measurements"
            stageHistory={mockStageHistory}
            onStageClick={jest.fn()}
          />
        </TestWrapper>
      );

      // Check that all 13 stages are rendered with correct display names
      expect(screen.getByText('Design Proposal')).toBeInTheDocument();
      expect(screen.getByText('Proof Approval')).toBeInTheDocument(); 
      expect(screen.getByText('Measurements')).toBeInTheDocument();
      expect(screen.getByText('Production Planning')).toBeInTheDocument();
      expect(screen.getByText('Cutting')).toBeInTheDocument();
      expect(screen.getByText('Sewing')).toBeInTheDocument();
      expect(screen.getByText('Quality Control')).toBeInTheDocument();
      expect(screen.getByText('Finishing')).toBeInTheDocument();
      expect(screen.getByText('Final Inspection')).toBeInTheDocument();
      expect(screen.getByText('Packaging')).toBeInTheDocument();
      expect(screen.getByText('Shipping Preparation')).toBeInTheDocument();
      expect(screen.getByText('Ship Order')).toBeInTheDocument();
      expect(screen.getByText('Delivery')).toBeInTheDocument();
    });

    it('displays stage descriptions for all stages', () => {
      render(
        <TestWrapper>
          <OrderTimeline
            orderId="test-order-id"
            currentStage="Measurements"
            stageHistory={mockStageHistory}
            onStageClick={jest.fn()}
          />
        </TestWrapper>
      );

      // Check sample stage descriptions
      expect(screen.getByText('Initial design concepts and artwork creation')).toBeInTheDocument();
      expect(screen.getByText('Client review and approval of design proof')).toBeInTheDocument();
      expect(screen.getByText('Collection and verification of performer measurements')).toBeInTheDocument();
    });

    it('displays order timeline container with correct test id', () => {
      render(
        <TestWrapper>
          <OrderTimeline
            orderId="test-order-id"
            currentStage="Measurements"
            stageHistory={mockStageHistory}
            onStageClick={jest.fn()}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('order-timeline')).toBeInTheDocument();
    });
  });

  describe('Stage Status Indicators', () => {
    it('shows completed stages with correct styling and timestamps', () => {
      render(
        <TestWrapper>
          <OrderTimeline
            orderId="test-order-id"
            currentStage="Measurements"
            stageHistory={mockStageHistory}
            onStageClick={jest.fn()}
          />
        </TestWrapper>
      );

      // Check completed stages have correct class
      const designProposalStage = screen.getByTestId('stage-DesignProposal');
      const proofApprovalStage = screen.getByTestId('stage-ProofApproval');
      
      expect(designProposalStage).toHaveClass('completed');
      expect(proofApprovalStage).toHaveClass('completed');

      // Check timestamps are displayed for completed stages  
      expect(screen.getByText('Completed: 1/1/2023')).toBeInTheDocument();
      expect(screen.getByText('Completed: 1/5/2023')).toBeInTheDocument();
    });

    it('highlights current stage with correct styling', () => {
      render(
        <TestWrapper>
          <OrderTimeline
            orderId="test-order-id" 
            currentStage="Measurements"
            stageHistory={mockStageHistory}
            onStageClick={jest.fn()}
          />
        </TestWrapper>
      );

      const currentStage = screen.getByTestId('stage-Measurements');
      expect(currentStage).toHaveClass('current');
    });

    it('shows future stages with pending styling', () => {
      render(
        <TestWrapper>
          <OrderTimeline
            orderId="test-order-id"
            currentStage="Measurements"
            stageHistory={mockStageHistory}
            onStageClick={jest.fn()}
          />
        </TestWrapper>
      );

      const futureStage = screen.getByTestId('stage-ProductionPlanning');
      expect(futureStage).toHaveClass('pending');
    });
  });

  describe('Stage Interaction', () => {
    it('calls onStageClick when stage is clicked', () => {
      const onStageClick = jest.fn();
      
      render(
        <TestWrapper>
          <OrderTimeline
            orderId="test-order-id"
            currentStage="Measurements"
            stageHistory={mockStageHistory}
            onStageClick={onStageClick}
          />
        </TestWrapper>
      );

      fireEvent.click(screen.getByTestId('stage-DesignProposal'));
      expect(onStageClick).toHaveBeenCalledWith('DesignProposal');
    });

    it('calls onStageClick with correct stage parameter for different stages', () => {
      const onStageClick = jest.fn();
      
      render(
        <TestWrapper>
          <OrderTimeline
            orderId="test-order-id"
            currentStage="Measurements"
            stageHistory={mockStageHistory}
            onStageClick={onStageClick}
          />
        </TestWrapper>
      );

      // Test clicking different stages
      fireEvent.click(screen.getByTestId('stage-ProofApproval'));
      expect(onStageClick).toHaveBeenCalledWith('ProofApproval');

      fireEvent.click(screen.getByTestId('stage-Measurements'));
      expect(onStageClick).toHaveBeenCalledWith('Measurements');

      fireEvent.click(screen.getByTestId('stage-ProductionPlanning'));
      expect(onStageClick).toHaveBeenCalledWith('ProductionPlanning');
    });

    it('does not crash when onStageClick is not provided', () => {
      render(
        <TestWrapper>
          <OrderTimeline
            orderId="test-order-id"
            currentStage="Measurements" 
            stageHistory={mockStageHistory}
          />
        </TestWrapper>
      );

      // Should not throw when clicking without onStageClick handler
      expect(() => {
        fireEvent.click(screen.getByTestId('stage-DesignProposal'));
      }).not.toThrow();
    });
  });

  describe('Mobile Responsiveness', () => {
    it('renders stages with minimum 44px height for touch targets', () => {
      render(
        <TestWrapper>
          <OrderTimeline
            orderId="test-order-id"
            currentStage="Measurements"
            stageHistory={mockStageHistory}
            onStageClick={jest.fn()}
          />
        </TestWrapper>
      );

      const stageElement = screen.getByTestId('stage-DesignProposal');
      const styles = window.getComputedStyle(stageElement);
      
      // Check minimum height is set (44px converted to number for comparison)
      expect(parseFloat(styles.minHeight)).toBeGreaterThanOrEqual(44);
    });

    it('applies proper spacing between stages', () => {
      render(
        <TestWrapper>
          <OrderTimeline
            orderId="test-order-id"
            currentStage="Measurements"
            stageHistory={mockStageHistory}
            onStageClick={jest.fn()}
          />
        </TestWrapper>
      );

      const timelineContainer = screen.getByTestId('order-timeline');
      expect(timelineContainer).toHaveStyle('gap: 16px'); // theme.spacing(2) = 16px
    });
  });

  describe('Props Handling', () => {
    it('handles empty stage history without crashing', () => {
      render(
        <TestWrapper>
          <OrderTimeline
            orderId="test-order-id"
            currentStage="Measurements"
            stageHistory={[]}
            onStageClick={jest.fn()}
          />
        </TestWrapper>
      );

      // Should still render all stages
      expect(screen.getByText('Design Proposal')).toBeInTheDocument();
      expect(screen.getByText('Measurements')).toBeInTheDocument();
      
      // No timestamps should be shown for empty history
      expect(screen.queryByText(/Completed:/)).not.toBeInTheDocument();
    });

    it('handles different current stages correctly', () => {
      const { rerender } = render(
        <TestWrapper>
          <OrderTimeline
            orderId="test-order-id"
            currentStage="DesignProposal"
            stageHistory={[]}
            onStageClick={jest.fn()}
          />
        </TestWrapper>
      );

      // First stage should be current
      expect(screen.getByTestId('stage-DesignProposal')).toHaveClass('current');
      expect(screen.getByTestId('stage-ProofApproval')).toHaveClass('pending');

      // Change to later stage
      rerender(
        <TestWrapper>
          <OrderTimeline
            orderId="test-order-id"
            currentStage="Delivery" 
            stageHistory={[]}
            onStageClick={jest.fn()}
          />
        </TestWrapper>
      );

      // All previous stages should be completed, last should be current
      expect(screen.getByTestId('stage-DesignProposal')).toHaveClass('completed');
      expect(screen.getByTestId('stage-Delivery')).toHaveClass('current');
    });
  });

  describe('Accessibility', () => {
    it('provides proper heading structure', () => {
      render(
        <TestWrapper>
          <OrderTimeline
            orderId="test-order-id"
            currentStage="Measurements"
            stageHistory={mockStageHistory}
            onStageClick={jest.fn()}
          />
        </TestWrapper>
      );

      expect(screen.getByRole('heading', { name: 'Order Progress' })).toBeInTheDocument();
    });

    it('applies cursor pointer only when onStageClick is provided', () => {
      const { rerender } = render(
        <TestWrapper>
          <OrderTimeline
            orderId="test-order-id"
            currentStage="Measurements"
            stageHistory={mockStageHistory}
            onStageClick={jest.fn()}
          />
        </TestWrapper>
      );

      let stageElement = screen.getByTestId('stage-DesignProposal');
      expect(stageElement).toHaveStyle('cursor: pointer');

      // Rerender without onStageClick
      rerender(
        <TestWrapper>
          <OrderTimeline
            orderId="test-order-id"
            currentStage="Measurements"
            stageHistory={mockStageHistory}
          />
        </TestWrapper>
      );

      stageElement = screen.getByTestId('stage-DesignProposal');
      expect(stageElement).toHaveStyle('cursor: default');
    });
  });
});