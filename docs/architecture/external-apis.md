# External APIs

## Stripe Payment Processing API

- **Purpose:** Secure payment processing for credit cards and ACH transfers with PCI compliance
- **Documentation:** https://stripe.com/docs/api
- **Base URL(s):** https://api.stripe.com/v1
- **Authentication:** API key-based authentication with webhook signatures
- **Rate Limits:** 100 requests per second for most endpoints

**Key Endpoints Used:**
- `POST /payment_intents` - Create payment intent for order payments
- `POST /customers` - Create customer records for organizations
- `GET /payment_intents/{id}` - Retrieve payment status
- `POST /webhook_endpoints` - Configure payment status webhooks

**Integration Notes:** All payments require Strong Customer Authentication (SCA) compliance. Webhook endpoints handle asynchronous payment confirmations with signature verification for security.

## SendGrid Email API

- **Purpose:** Transactional email delivery for notifications, order updates, and communication
- **Documentation:** https://docs.sendgrid.com/api-reference
- **Base URL(s):** https://api.sendgrid.com/v3
- **Authentication:** API key authentication with domain verification
- **Rate Limits:** Based on plan tier, typically 600 emails per minute

**Key Endpoints Used:**
- `POST /mail/send` - Send transactional emails
- `GET /stats` - Email delivery statistics
- `POST /templates` - Manage email templates
- `POST /webhook/event` - Configure delivery event webhooks

**Integration Notes:** All emails use pre-approved templates for compliance. Delivery tracking and bounce handling implemented through webhook integration.

## Twilio SMS API

- **Purpose:** SMS notifications for urgent updates and mobile-first communication
- **Documentation:** https://www.twilio.com/docs/sms/api
- **Base URL(s):** https://api.twilio.com/2010-04-01
- **Authentication:** Account SID and Auth Token with request signing
- **Rate Limits:** 1 message per second per phone number by default

**Key Endpoints Used:**
- `POST /Accounts/{AccountSid}/Messages.json` - Send SMS messages
- `GET /Accounts/{AccountSid}/Messages/{MessageSid}.json` - Get message status
- `POST /Accounts/{AccountSid}/IncomingPhoneNumbers.json` - Configure webhooks

**Integration Notes:** Opt-in verification required for all SMS recipients. Delivery status tracking through webhook callbacks. Rate limiting implemented to prevent spam.
