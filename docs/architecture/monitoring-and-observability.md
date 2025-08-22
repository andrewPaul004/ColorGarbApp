# Monitoring and Observability

## Monitoring Stack

- **Frontend Monitoring:** Application Insights for React with custom telemetry
- **Backend Monitoring:** Application Insights for .NET Core with dependency tracking
- **Error Tracking:** Integrated Application Insights error monitoring with alert rules
- **Performance Monitoring:** Real User Monitoring (RUM) and synthetic transaction monitoring

## Key Metrics

**Frontend Metrics:**
- Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- JavaScript error rate and error boundaries triggered
- API response times from user perspective
- User interaction success rates (form submissions, navigation)
- Bundle size and loading performance

**Backend Metrics:**
- Request rate (requests per minute per endpoint)
- Error rate (< 1% for production endpoints)
- Response time (P95 < 500ms for all endpoints)
- Database query performance and connection pool health
- External service dependency health (Stripe, SendGrid, Twilio)

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Create comprehensive fullstack architecture document for ColorGarb Client Portal", "status": "completed"}]