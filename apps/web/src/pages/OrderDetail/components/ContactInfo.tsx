import React from 'react';
import { Box, Typography, Paper, Grid, Chip } from '@mui/material';
import { Email, Phone, Business, LocationOn } from '@mui/icons-material';

/**
 * Contact and shipping information section displaying organization details.
 * Shows complete organization information including address, contact details, and payment terms.
 * 
 * @component
 * @param {ContactInfoProps} props - Component props
 * @returns {JSX.Element} Contact information component with organization details
 * 
 * @example
 * ```tsx
 * <ContactInfo
 *   organizationName="Lincoln High School"
 *   organizationType="School"
 *   contactEmail="band@lincolnhs.edu"
 *   contactPhone="555-123-4567"
 *   address="123 School St, Lincoln, NE 68508"
 *   paymentTerms="Net 30"
 * />
 * ```
 * 
 * @since 1.0.0
 */
export interface ContactInfoProps {
  /** Organization name */
  organizationName: string;
  /** Organization type (School, Theater, etc.) */
  organizationType?: string;
  /** Primary contact email address */
  contactEmail?: string;
  /** Primary contact phone number */
  contactPhone?: string;
  /** Complete shipping address */
  address?: string;
  /** Payment terms for the organization */
  paymentTerms?: string;
}

export const ContactInfo: React.FC<ContactInfoProps> = ({
  organizationName,
  organizationType,
  contactEmail,
  contactPhone,
  address,
  paymentTerms
}) => {
  /**
   * Formats phone number for display.
   * 
   * @param {string} phone - Raw phone number
   * @returns {string} Formatted phone number
   */
  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX if 10 digits
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    // Return original if not standard format
    return phone;
  };

  /**
   * Gets color-coded chip for organization type.
   * 
   * @param {string} type - Organization type
   * @returns {React.ReactElement} Colored chip component
   */
  const getOrganizationTypeChip = (type: string) => {
    const typeLower = type.toLowerCase();
    
    if (typeLower.includes('school') || typeLower.includes('education')) {
      return <Chip label={type} color="primary" size="small" icon={<Business />} />;
    } else if (typeLower.includes('theater') || typeLower.includes('theatre')) {
      return <Chip label={type} color="secondary" size="small" icon={<Business />} />;
    } else if (typeLower.includes('band') || typeLower.includes('music')) {
      return <Chip label={type} color="info" size="small" icon={<Business />} />;
    } else {
      return <Chip label={type} color="default" size="small" icon={<Business />} />;
    }
  };

  /**
   * Parses address string into components for better display.
   * 
   * @param {string} fullAddress - Complete address string
   * @returns {object} Address components
   */
  const parseAddress = (fullAddress: string) => {
    // Simple parsing - in production, would use proper address parsing service
    const parts = fullAddress.split(',').map(part => part.trim());
    
    if (parts.length >= 3) {
      return {
        street: parts[0],
        city: parts[1],
        stateZip: parts.slice(2).join(', ')
      };
    }
    
    return {
      street: fullAddress,
      city: '',
      stateZip: ''
    };
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
        Contact & Shipping Information
      </Typography>
      
      <Grid container spacing={3}>
        {/* Organization Details Section */}
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Organization Details
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Organization Name
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium', mb: 1 }}>
                {organizationName}
              </Typography>
              {organizationType && (
                <Box sx={{ mb: 1 }}>
                  {getOrganizationTypeChip(organizationType)}
                </Box>
              )}
            </Box>

            {/* Contact Information */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {contactEmail && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Email color="action" fontSize="small" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Primary Contact Email
                    </Typography>
                    <Typography 
                      variant="body1" 
                      component="a" 
                      href={`mailto:${contactEmail}`}
                      sx={{ 
                        color: 'primary.main', 
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' }
                      }}
                    >
                      {contactEmail}
                    </Typography>
                  </Box>
                </Box>
              )}
              
              {contactPhone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Phone color="action" fontSize="small" />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Primary Contact Phone
                    </Typography>
                    <Typography 
                      variant="body1" 
                      component="a" 
                      href={`tel:${contactPhone}`}
                      sx={{ 
                        color: 'primary.main', 
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' }
                      }}
                    >
                      {formatPhoneNumber(contactPhone)}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </Grid>

        {/* Shipping Address Section */}
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Shipping Address
            </Typography>
            
            {address ? (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <LocationOn color="action" fontSize="small" sx={{ mt: 0.5 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Complete Address
                  </Typography>
                  {(() => {
                    const { street, city, stateZip } = parseAddress(address);
                    return (
                      <Box>
                        <Typography variant="body1" sx={{ lineHeight: 1.4 }}>
                          {street}
                        </Typography>
                        {city && (
                          <Typography variant="body1" sx={{ lineHeight: 1.4 }}>
                            {city}
                          </Typography>
                        )}
                        {stateZip && (
                          <Typography variant="body1" sx={{ lineHeight: 1.4 }}>
                            {stateZip}
                          </Typography>
                        )}
                      </Box>
                    );
                  })()}
                </Box>
              </Box>
            ) : (
              <Typography variant="body1" color="text.secondary">
                No shipping address on file
              </Typography>
            )}
          </Box>
        </Grid>

        {/* Payment Terms Section */}
        <Grid item xs={12}>
          <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Payment Information
            </Typography>
            
            <Grid container spacing={2}>
              {paymentTerms && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Payment Terms
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    {paymentTerms}
                  </Typography>
                </Grid>
              )}
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Billing Method
                </Typography>
                <Typography variant="body1">
                  Invoice after completion
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default ContactInfo;