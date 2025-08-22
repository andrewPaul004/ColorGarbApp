# Technical Assumptions

## Repository Structure: Monorepo
Single repository structure with separate frontend and backend folders, shared TypeScript types, and coordinated deployment pipeline.

## Service Architecture
RESTful API architecture using .NET Core backend with React/TypeScript frontend. Microservices-ready structure allowing for future scaling while maintaining monolithic deployment simplicity for MVP.

## Testing Requirements
Comprehensive testing strategy including unit tests for business logic, integration tests for API endpoints, and end-to-end tests for critical user workflows. Manual testing convenience methods for QA validation.

## Additional Technical Assumptions and Requests
- **Frontend:** React with TypeScript for type safety and maintainability, responsive CSS framework
- **Backend:** .NET Core for robust enterprise-grade API, C# for business logic
- **Database:** SQL Server or PostgreSQL for relational data, Redis for caching and sessions
- **Hosting/Infrastructure:** Azure or AWS for scalability, CDN for static assets, automated backup systems
- **Integration Requirements:** Payment processors (Stripe, PayPal), email/SMS services, shipping APIs, file storage (Azure Blob/AWS S3)
- **Security:** HTTPS everywhere, role-based authentication, PCI compliance for payments, FERPA considerations for school data
