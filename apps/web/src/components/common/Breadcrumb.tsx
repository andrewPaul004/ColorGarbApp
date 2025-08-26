import React from 'react';
import { Breadcrumbs, Link, Typography, Box } from '@mui/material';
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

/**
 * Breadcrumb item interface defining navigation structure.
 * 
 * @interface BreadcrumbItem
 * @since 1.0.0
 */
export interface BreadcrumbItem {
  /** Display label for the breadcrumb item */
  label: string;
  /** Navigation path for the breadcrumb item (optional for current page) */
  path?: string;
  /** Whether this is the current page (non-clickable) */
  current?: boolean;
}

/**
 * Props for the Breadcrumb component.
 * 
 * @interface BreadcrumbProps
 * @since 1.0.0
 */
export interface BreadcrumbProps {
  /** Array of breadcrumb items to display */
  items: BreadcrumbItem[];
  /** Optional custom separator icon */
  separator?: React.ReactNode;
  /** Optional maximum items to show before truncation */
  maxItems?: number;
}

/**
 * Breadcrumb navigation component providing hierarchical navigation context.
 * Shows user's current location within the application and provides quick navigation back to parent pages.
 * 
 * @component
 * @param {BreadcrumbProps} props - Component props
 * @returns {JSX.Element} Breadcrumb navigation component
 * 
 * @example
 * ```tsx
 * const breadcrumbItems = [
 *   { label: 'Dashboard', path: '/dashboard' },
 *   { label: 'Orders', path: '/orders' },
 *   { label: 'Order CG-2023-001', current: true }
 * ];
 * 
 * <Breadcrumb items={breadcrumbItems} />
 * ```
 * 
 * @since 1.0.0
 */
export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator = <NavigateNextIcon fontSize="small" />,
  maxItems = 8
}) => {
  const navigate = useNavigate();

  /**
   * Handles breadcrumb item click navigation.
   * 
   * @param {BreadcrumbItem} item - The clicked breadcrumb item
   */
  const handleItemClick = (item: BreadcrumbItem) => {
    if (item.path && !item.current) {
      navigate(item.path);
    }
  };

  /**
   * Renders a single breadcrumb item.
   * 
   * @param {BreadcrumbItem} item - The breadcrumb item to render
   * @param {number} index - The index of the item in the items array
   * @returns {React.ReactNode} Rendered breadcrumb item
   */
  const renderBreadcrumbItem = (item: BreadcrumbItem, index: number): React.ReactNode => {
    const isLast = index === items.length - 1;
    const isCurrent = item.current || isLast;

    if (isCurrent) {
      // Current page - non-clickable typography
      return (
        <Typography
          key={`breadcrumb-${index}`}
          color="text.primary"
          variant="body2"
          sx={{ fontWeight: 'medium' }}
        >
          {item.label}
        </Typography>
      );
    }

    // Clickable link for navigation
    return (
      <Link
        key={`breadcrumb-${index}`}
        component={RouterLink}
        to={item.path || '#'}
        underline="hover"
        color="inherit"
        variant="body2"
        onClick={(e) => {
          e.preventDefault();
          handleItemClick(item);
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          '&:hover': {
            color: 'primary.main'
          }
        }}
      >
        {item.label}
      </Link>
    );
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        py: 1,
        px: 0
      }}
      role="navigation"
      aria-label="Breadcrumb navigation"
    >
      <Breadcrumbs
        separator={separator}
        maxItems={maxItems}
        aria-label="breadcrumb"
        sx={{
          '& .MuiBreadcrumbs-separator': {
            mx: 1,
            color: 'text.secondary'
          }
        }}
      >
        {items.map((item, index) => renderBreadcrumbItem(item, index))}
      </Breadcrumbs>
    </Box>
  );
};

export default Breadcrumb;