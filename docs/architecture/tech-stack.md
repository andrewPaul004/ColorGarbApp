# Tech Stack

## Technology Stack Table

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Frontend Language | TypeScript | 5.0+ | Type-safe frontend development | Eliminates runtime type errors and improves maintainability for complex order workflows |
| Frontend Framework | React | 18.0+ | Component-based UI development | Mature ecosystem, excellent mobile performance, strong TypeScript integration |
| UI Component Library | Material-UI (MUI) | 5.0+ | Consistent, accessible component library | WCAG AA compliance built-in, mobile-responsive components, customizable theming |
| State Management | Zustand | 4.0+ | Lightweight state management | Simpler than Redux for this use case, excellent TypeScript support, minimal boilerplate |
| Backend Language | C# | 11.0+ | Enterprise-grade API development | Strong typing, excellent async support for I/O operations, mature ecosystem |
| Backend Framework | .NET Core | 7.0+ | Cross-platform web API framework | High performance, built-in dependency injection, excellent Azure integration |
| API Style | REST | - | HTTP-based API communication | Simple, well-understood, excellent tooling support, fits request/response patterns |
| Database | Azure SQL Database | - | Relational data storage | ACID compliance for financial data, excellent .NET integration, automated backup/scaling |
| Cache | Redis | 7.0+ | Session storage and caching | High performance, supports complex data structures for timeline caching |
| File Storage | Azure Blob Storage | - | Document and image storage | Cost-effective, integrated with Azure, CDN support for static assets |
| Authentication | Azure AD B2C | - | Enterprise identity management | SAML/OAuth support for school systems, multi-factor auth, compliance features |
| Frontend Testing | Jest + React Testing Library | Latest | Component and integration testing | Industry standard, excellent async testing support, accessibility testing |
| Backend Testing | xUnit + Moq | Latest | Unit and integration testing | .NET standard, excellent mocking capabilities, parallel test execution |
| E2E Testing | Playwright | Latest | End-to-end user flow testing | Cross-browser support, mobile testing, excellent async handling |
| Build Tool | Vite | 4.0+ | Fast frontend build tooling | Fastest HMR, excellent TypeScript support, optimized production builds |
| Bundler | Built-in Vite | - | Module bundling and optimization | Integrated with Vite, tree-shaking, code splitting |
| IaC Tool | Azure ARM Templates | - | Infrastructure as code | Native Azure integration, version control for infrastructure |
| CI/CD | Azure DevOps | - | Continuous integration/deployment | Integrated with Azure, excellent .NET support, automated testing pipelines |
| Monitoring | Application Insights | - | Application performance monitoring | Real-time performance metrics, error tracking, user analytics |
| Logging | Serilog | Latest | Structured logging framework | JSON logging, multiple sinks, excellent .NET Core integration |
| CSS Framework | Tailwind CSS | 3.0+ | Utility-first CSS framework | Rapid development, mobile-first, excellent tree-shaking |
