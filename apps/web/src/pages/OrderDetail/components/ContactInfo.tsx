import React from 'react';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  Typography, 
  Box, 
  Divider,
  Link
} from '@mui/material';
import { 
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import type { OrderDetail } from '../../../types/shared';

interface ContactInfoProps {
  /** Order detail information with organization data */
  order: OrderDetail;
}

/**
 * Contact information component displaying organization and shipping details.
 * Shows organization info, contact details, shipping address, and payment terms.
 * 
 * @component
 * @param {ContactInfoProps} props - Component props
 * @returns {JSX.Element} Contact information with organization details
 * 
 * @example
 * ```tsx
 * <ContactInfo order={orderDetail} />
 * ```
 * 
 * @since 2.1.0
 */
const ContactInfo: React.FC<ContactInfoProps> = ({ order }) => {
  const { organization } = order;

  /**
   * Formats organization type for display
   */
  const formatOrganizationType = (type: string) => {
    switch (type.toLowerCase()) {
      case 'school':
        return 'School';
      case 'boosterclub':
        return 'Booster Club';
      case 'theater':
        return 'Theater Company';
      case 'dance_company':
        return 'Dance Company';
      default:
        return 'Organization';
    }
  };

  /**
   * Formats complete address for display
   */
  const formatAddress = (address: typeof organization.address) => {
    const lines = [
      address.street1,
      address.street2,
      `${address.city}, ${address.state} ${address.zipCode}`,
      address.country !== 'US' ? address.country : null
    ].filter(Boolean);
    
    return lines;
  };

  const addressLines = formatAddress(organization.address);

  return (
    <Card elevation={1}>
      <CardHeader
        avatar={<BusinessIcon color="primary" />}
        title="Contact & Shipping Information"
        titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
        sx={{ pb: 1 }}
      />
      <CardContent sx={{ pt: 0 }}>
        {/* Organization Info */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {organization.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {formatOrganizationType(organization.type)}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Contact Details */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Contact Information
          </Typography>
          
          {/* Email */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <EmailIcon fontSize="small" color="action" />
            <Link 
              href={`mailto:${organization.contactEmail}`}
              color="primary"
              underline="hover"
            >
              {organization.contactEmail}
            </Link>
          </Box>
          
          {/* Phone */}
          {organization.contactPhone && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PhoneIcon fontSize="small" color="action" />
              <Link 
                href={`tel:${organization.contactPhone}`}
                color="primary"
                underline="hover"
              >
                {organization.contactPhone}
              </Link>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Shipping Address */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <LocationIcon fontSize="small" color="action" />
            <Typography variant="subtitle2" color="text.secondary">
              Shipping Address
            </Typography>
          </Box>
          
          <Box sx={{ ml: 3 }}>
            {addressLines.map((line, index) => (
              <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                {line}
              </Typography>
            ))}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Payment Terms */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <PaymentIcon fontSize="small" color="action" />
            <Typography variant="subtitle2" color="text.secondary">
              Payment Terms
            </Typography>
          </Box>
          
          <Box sx={{ ml: 3 }}>
            <Typography variant="body2">
              {organization.paymentTerms}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ContactInfo;