import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Breadcrumbs as MuiBreadcrumbs, Link, Typography, Box } from '@mui/material';
import { Home as HomeIcon, Dashboard as DashboardIcon } from '@mui/icons-material';

interface BreadcrumbsProps {
  /** Order ID for the current page */
  orderId: string;
  /** Order number for display */
  orderNumber: string;
}

/**
 * Breadcrumb navigation component for order detail page.
 * Provides navigation path back to dashboard with proper accessibility.
 * 
 * @component
 * @param {BreadcrumbsProps} props - Component props
 * @returns {JSX.Element} Breadcrumb navigation component
 * 
 * @example
 * ```tsx
 * <Breadcrumbs 
 *   orderId="12345"
 *   orderNumber="CG-2023-001" 
 * />
 * ```
 * 
 * @since 2.1.0
 */
const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  orderId,
  orderNumber
}) => {
  return (
    <Box sx={{ mb: 2 }}>
      <MuiBreadcrumbs 
        aria-label="breadcrumb navigation"
        sx={{ 
          fontSize: '0.875rem',
          '& .MuiBreadcrumbs-separator': {
            margin: '0 8px'
          }
        }}
      >
        <Link
          component={RouterLink}
          to="/dashboard"
          color="inherit"
          underline="hover"
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 0.5,
            '&:hover': {
              color: 'primary.main'
            }
          }}
        >
          <DashboardIcon fontSize="small" />
          Dashboard
        </Link>
        
        <Typography 
          color="text.primary" 
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            fontWeight: 500
          }}
        >
          Order {orderNumber}
        </Typography>
      </MuiBreadcrumbs>
    </Box>
  );
};

export default Breadcrumbs;