import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CommunicationAuditSearch } from '../../../src/components/communication/CommunicationAuditSearch';

// Mock Material-UI components
vi.mock('@mui/material', () => ({
  TextField: ({ value, onChange, placeholder, ...props }: any) => (
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange?.(e)}
      placeholder={placeholder}
      {...props}
    />
  ),
  FormControl: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  InputLabel: ({ children, ...props }: any) => <label {...props}>{children}</label>,
  Select: ({ value, onChange, children, multiple, displayEmpty, ...props }: any) => (
    <select
      value={multiple ? (Array.isArray(value) ? value : []) : (value || '')}
      onChange={(e) => {
        const selectedValue = multiple 
          ? Array.from(e.target.selectedOptions, (option: any) => option.value)
          : e.target.value;
        onChange?.({ target: { value: selectedValue } });
      }}
      multiple={multiple}
      {...props}
    >
      {displayEmpty && <option value="">Select...</option>}
      {children}
    </select>
  ),
  MenuItem: ({ value, children, ...props }: any) => (
    <option value={value} {...props}>{children}</option>
  ),
  Chip: ({ label, onDelete, color, ...props }: any) => (
    <span className={`chip-${color}`} {...props}>
      {label}
      {onDelete && <button onClick={onDelete} aria-label={`remove ${label}`}>×</button>}
    </span>
  ),
  Button: ({ children, onClick, variant, color, ...props }: any) => (
    <button 
      onClick={onClick} 
      className={`btn-${variant || 'contained'}-${color || 'primary'}`} 
      {...props}
    >
      {children}
    </button>
  ),
  IconButton: ({ children, onClick, 'aria-label': ariaLabel, ...props }: any) => (
    <button onClick={onClick} aria-label={ariaLabel} {...props}>{children}</button>
  ),
  Collapse: ({ children, in: inProp, ...props }: any) => 
    inProp ? <div {...props}>{children}</div> : null,
  Grid: ({ children, item, xs, ...props }: any) => (
    <div className={`grid-item-${xs || 12}`} {...props}>{children}</div>
  ),
  Box: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Typography: ({ children, variant, ...props }: any) => (
    <div className={`typography-${variant}`} {...props}>{children}</div>
  ),
  Divider: (props: any) => <hr {...props} />,
  Card: ({ children, ...props }: any) => <div className="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div className="card-content" {...props}>{children}</div>,
}));

vi.mock('@mui/icons-material', () => ({
  Search: () => <span data-testid="SearchIcon">🔍</span>,
  FilterList: () => <span data-testid="FilterListIcon">🔽</span>,
  ExpandMore: () => <span data-testid="ExpandMoreIcon">▼</span>,
  ExpandLess: () => <span data-testid="ExpandLessIcon">▲</span>,
  Clear: () => <span data-testid="ClearIcon">✕</span>,
}));

vi.mock('@mui/x-date-pickers', () => ({
  DatePicker: ({ value, onChange, label, ...props }: any) => (
    <input
      type="date"
      value={value ? value.toISOString().split('T')[0] : ''}
      onChange={(e) => onChange?.(new Date(e.target.value))}
      placeholder={label}
      aria-label={label}
      {...props}
    />
  ),
  LocalizationProvider: ({ children }: any) => children,
}));

vi.mock('@mui/x-date-pickers/AdapterDateFns', () => ({
  AdapterDateFns: function AdapterDateFns() {
    return {};
  },
}));

describe('CommunicationAuditSearch', () => {
  const mockOnSearch = vi.fn();
  const mockOnFiltersChange = vi.fn();
  const mockOnClearFilters = vi.fn();

  const defaultProps = {
    onSearch: mockOnSearch,
    onFiltersChange: mockOnFiltersChange,
    onClearFilters: mockOnClearFilters,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input and basic controls', () => {
    render(<CommunicationAuditSearch {...defaultProps} />);

    // Check for search input
    const searchInput = screen.getByPlaceholder(/search communications/i);
    expect(searchInput).toBeInTheDocument();

    // Check for filters button
    const filtersButton = screen.getByText(/filters/i);
    expect(filtersButton).toBeInTheDocument();

    // Check for search button
    const searchButton = screen.getByText(/search/i);
    expect(searchButton).toBeInTheDocument();
  });

  it('handles search term input correctly', async () => {
    const user = userEvent.setup();
    render(<CommunicationAuditSearch {...defaultProps} />);

    const searchInput = screen.getByPlaceholder(/search communications/i);
    
    await user.type(searchInput, 'test order');

    expect(searchInput).toHaveValue('test order');
  });

  it('triggers search when search button is clicked', async () => {
    const user = userEvent.setup();
    render(<CommunicationAuditSearch {...defaultProps} />);

    const searchInput = screen.getByPlaceholder(/search communications/i);
    const searchButton = screen.getByText(/search/i);

    await user.type(searchInput, 'order update');
    await user.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith('order update');
  });

  it('triggers search on Enter key press', async () => {
    const user = userEvent.setup();
    render(<CommunicationAuditSearch {...defaultProps} />);

    const searchInput = screen.getByPlaceholder(/search communications/i);

    await user.type(searchInput, 'email notification');
    await user.keyboard('{Enter}');

    expect(mockOnSearch).toHaveBeenCalledWith('email notification');
  });

  it('expands and collapses advanced filters', async () => {
    const user = userEvent.setup();
    render(<CommunicationAuditSearch {...defaultProps} />);

    const filtersButton = screen.getByText(/filters/i);

    // Initially, advanced filters should not be visible
    expect(screen.queryByText(/communication types/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/delivery status/i)).not.toBeInTheDocument();

    // Click to expand filters
    await user.click(filtersButton);

    // Advanced filters should now be visible
    expect(screen.getByText(/communication types/i)).toBeInTheDocument();
    expect(screen.getByText(/delivery status/i)).toBeInTheDocument();
    expect(screen.getByText(/date range/i)).toBeInTheDocument();

    // Click to collapse filters
    await user.click(filtersButton);

    // Advanced filters should be hidden again
    expect(screen.queryByText(/communication types/i)).not.toBeInTheDocument();
  });

  it('handles communication type filter selection', async () => {
    const user = userEvent.setup();
    render(<CommunicationAuditSearch {...defaultProps} />);

    // Expand filters
    const filtersButton = screen.getByText(/filters/i);
    await user.click(filtersButton);

    // Find and interact with communication type select
    const typeSelect = screen.getByDisplayValue(/select/i);
    await user.selectOptions(typeSelect, ['Email', 'SMS']);

    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        communicationType: ['Email', 'SMS']
      })
    );
  });

  it('handles delivery status filter selection', async () => {
    const user = userEvent.setup();
    render(<CommunicationAuditSearch {...defaultProps} />);

    // Expand filters
    const filtersButton = screen.getByText(/filters/i);
    await user.click(filtersButton);

    // Find delivery status select (second select element)
    const selects = screen.getAllByDisplayValue(/select/i);
    const statusSelect = selects[1];
    
    await user.selectOptions(statusSelect, ['Delivered', 'Failed']);

    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryStatus: ['Delivered', 'Failed']
      })
    );
  });

  it('handles date range selection', async () => {
    const user = userEvent.setup();
    render(<CommunicationAuditSearch {...defaultProps} />);

    // Expand filters
    const filtersButton = screen.getByText(/filters/i);
    await user.click(filtersButton);

    // Find date inputs
    const fromDateInput = screen.getByLabelText(/from date/i);
    const toDateInput = screen.getByLabelText(/to date/i);

    // Set date range
    await user.type(fromDateInput, '2024-01-01');
    await user.type(toDateInput, '2024-01-31');

    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        dateFrom: expect.any(Date),
        dateTo: expect.any(Date)
      })
    );
  });

  it('displays active filter chips', async () => {
    const user = userEvent.setup();
    
    const propsWithFilters = {
      ...defaultProps,
      activeFilters: {
        communicationType: ['Email'],
        deliveryStatus: ['Delivered'],
        searchTerm: 'order'
      }
    };

    render(<CommunicationAuditSearch {...propsWithFilters} />);

    // Check for active filter chips
    expect(screen.getByText('Type: Email')).toBeInTheDocument();
    expect(screen.getByText('Status: Delivered')).toBeInTheDocument();
    expect(screen.getByText('Search: order')).toBeInTheDocument();
  });

  it('removes individual filter chips when clicked', async () => {
    const user = userEvent.setup();
    
    const propsWithFilters = {
      ...defaultProps,
      activeFilters: {
        communicationType: ['Email', 'SMS'],
        deliveryStatus: ['Delivered']
      }
    };

    render(<CommunicationAuditSearch {...propsWithFilters} />);

    // Find and click remove button for Email filter
    const emailFilterChip = screen.getByText('Type: Email, SMS');
    const removeButton = emailFilterChip.parentElement?.querySelector('[aria-label*="remove"]');
    
    if (removeButton) {
      await user.click(removeButton);
    }

    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        communicationType: []
      })
    );
  });

  it('clears all filters when clear button is clicked', async () => {
    const user = userEvent.setup();
    
    const propsWithFilters = {
      ...defaultProps,
      activeFilters: {
        communicationType: ['Email'],
        deliveryStatus: ['Delivered'],
        searchTerm: 'test'
      }
    };

    render(<CommunicationAuditSearch {...propsWithFilters} />);

    // Find and click clear filters button
    const clearButton = screen.getByText(/clear all/i);
    await user.click(clearButton);

    expect(mockOnClearFilters).toHaveBeenCalled();
  });

  it('validates date range selection', async () => {
    const user = userEvent.setup();
    render(<CommunicationAuditSearch {...defaultProps} />);

    // Expand filters
    const filtersButton = screen.getByText(/filters/i);
    await user.click(filtersButton);

    const fromDateInput = screen.getByLabelText(/from date/i);
    const toDateInput = screen.getByLabelText(/to date/i);

    // Set invalid date range (to date before from date)
    await user.type(fromDateInput, '2024-01-31');
    await user.type(toDateInput, '2024-01-01');

    // Should show validation error or handle gracefully
    // This would depend on the actual validation implementation
    expect(screen.queryByText(/invalid date range/i)).toBeInTheDocument() || 
           expect(mockOnFiltersChange).not.toHaveBeenCalledWith(
             expect.objectContaining({
               dateFrom: expect.any(Date),
               dateTo: expect.any(Date)
             })
           );
  });

  it('preserves search term across filter changes', async () => {
    const user = userEvent.setup();
    render(<CommunicationAuditSearch {...defaultProps} />);

    const searchInput = screen.getByPlaceholder(/search communications/i);
    
    // Enter search term
    await user.type(searchInput, 'test order');
    
    // Expand and modify filters
    const filtersButton = screen.getByText(/filters/i);
    await user.click(filtersButton);
    
    const typeSelect = screen.getByDisplayValue(/select/i);
    await user.selectOptions(typeSelect, ['Email']);

    // Search term should still be there
    expect(searchInput).toHaveValue('test order');
  });

  it('handles loading state during search', async () => {
    const user = userEvent.setup();
    render(<CommunicationAuditSearch {...defaultProps} loading />);

    const searchButton = screen.getByText(/search/i);
    
    // Search button should be disabled during loading
    expect(searchButton).toBeDisabled();
  });

  it('shows filter count when filters are applied', async () => {
    const propsWithFilters = {
      ...defaultProps,
      activeFilters: {
        communicationType: ['Email', 'SMS'],
        deliveryStatus: ['Delivered']
      }
    };

    render(<CommunicationAuditSearch {...propsWithFilters} />);

    // Should show filter count badge
    expect(screen.getByText(/3/)).toBeInTheDocument(); // 2 types + 1 status = 3 filters
  });

  it('handles keyboard navigation in filter dropdowns', async () => {
    const user = userEvent.setup();
    render(<CommunicationAuditSearch {...defaultProps} />);

    const filtersButton = screen.getByText(/filters/i);
    await user.click(filtersButton);

    const typeSelect = screen.getByDisplayValue(/select/i);
    
    // Tab to the select and use keyboard navigation
    await user.tab();
    expect(typeSelect).toHaveFocus();
    
    // Use arrow keys to navigate options
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');
    
    // Should trigger filter change
    expect(mockOnFiltersChange).toHaveBeenCalled();
  });

  it('persists filter state correctly', async () => {
    const user = userEvent.setup();
    
    const { rerender } = render(<CommunicationAuditSearch {...defaultProps} />);

    // Expand filters and make selections
    const filtersButton = screen.getByText(/filters/i);
    await user.click(filtersButton);

    const typeSelect = screen.getByDisplayValue(/select/i);
    await user.selectOptions(typeSelect, ['Email']);

    // Rerender with new active filters
    rerender(
      <CommunicationAuditSearch 
        {...defaultProps} 
        activeFilters={{ communicationType: ['Email'] }} 
      />
    );

    // Filter should still be applied
    expect(screen.getByText('Type: Email')).toBeInTheDocument();
  });
});