import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../../src/App';

/**
 * Test suite for App component
 * Tests basic rendering and initial state
 */
describe('App Component', () => {
  /**
   * Test that App component renders successfully
   */
  test('renders ColorGarb Client Portal title', () => {
    render(<App />);
    
    const titleElement = screen.getByText(/ColorGarb Client Portal/i);
    expect(titleElement).toBeInTheDocument();
  });

  /**
   * Test that welcome message is displayed
   */
  test('renders welcome message', () => {
    render(<App />);
    
    const welcomeElement = screen.getByText(/Welcome to ColorGarb/i);
    expect(welcomeElement).toBeInTheDocument();
  });

  /**
   * Test that authentication prompt is shown when no user is logged in
   */
  test('shows authentication required message when no user is logged in', () => {
    render(<App />);
    
    const authElement = screen.getByText(/Authentication Required/i);
    expect(authElement).toBeInTheDocument();
  });

  /**
   * Test that the main container has proper styling classes
   */
  test('applies proper styling classes', () => {
    render(<App />);
    
    const container = screen.getByText(/Welcome to ColorGarb/i).closest('.text-center');
    expect(container).toHaveClass('text-center');
  });
});