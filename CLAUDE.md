# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Frontend (React + TypeScript + Vite)
```bash
# From root directory
npm run dev:web          # Start frontend dev server
npm run build:web        # Production build
npm run lint:web         # ESLint check

# From apps/web directory
npm test                 # Run Jest tests once
npm run test:watch       # Jest in watch mode
npm run test:coverage    # Coverage report
```

### Backend (.NET 9 API)
```bash
# From root directory
npm run dev:api          # Start API server
npm run build:api        # Build API
npm run test:api         # Run xUnit tests

# From apps/api directory
dotnet run               # Start development server
dotnet test              # Run tests
dotnet ef database update                  # Apply migrations
dotnet ef migrations add <MigrationName>   # Create migration
```

### Full Stack Development
```bash
npm run dev             # Start both frontend and backend concurrently
npm run build           # Build both applications
npm run test            # Run all tests (frontend + backend)
```

### Dependency Management
```bash
# Install with legacy peer deps (resolves MUI + date-fns conflicts)
cd apps/web && npm install --legacy-peer-deps

# Common build issues with date-fns:
# - Use date-fns v4.x with MUI DatePickers v8.x
# - Application imports: import { formatDistanceToNow } from 'date-fns'
```

## Architecture Overview

### Project Structure
This is a **monorepo** containing a multi-tenant costume manufacturing portal:

```
colorgarb-app/
├── apps/web/          # React frontend with Material-UI
├── apps/api/          # .NET 9 ASP.NET Core API
├── packages/shared/   # TypeScript shared types
└── docs/              # Architecture and requirements
```

### Tech Stack
- **Frontend**: React 18 + TypeScript 5 + Vite + Material-UI + Zustand
- **Backend**: .NET 9 + Entity Framework Core + JWT Auth
- **Database**: SQL Server (prod) / SQLite (dev)
- **Caching**: Redis for sessions and rate limiting

## Key Business Domain Concepts

### Multi-Tenant Organization Model
- **Organizations**: Client entities (marching arts organizations)
- **Users**: Belong to organizations with roles (Client, Coach)
- **ColorGarb Staff**: Cross-organization access for order management
- **Data Isolation**: Orders and messages scoped to organization

### 13-Stage Manufacturing Process
Orders progress through a defined workflow:
```typescript
type OrderStage =
  | 'DesignProposal' | 'ProofApproval' | 'Measurements' | 'ProductionPlanning'
  | 'Cutting' | 'Sewing' | 'QualityControl' | 'Finishing'
  | 'FinalInspection' | 'Packaging' | 'ShippingPreparation' | 'ShipOrder'
  | 'Delivery';
```

### Communication System
- **Order-Scoped Messaging**: All communication tied to specific orders
- **Role-Based Recipients**: Messages targeted by role (Client, Staff, All)
- **File Attachments**: Design files, images, documents
- **Complete Audit Trail**: Full communication history for compliance

## Frontend Architecture Patterns

### State Management (Zustand)
- **Global Store**: `apps/web/src/stores/appStore.ts` with persistence
- **Authentication State**: User, token, and organization context
- **Order Management**: Client orders and admin order access
- **Error Handling**: Centralized error state management

### Component Patterns
- **Layout Component**: Consistent `<Layout>` wrapper with navigation
- **Protected Routes**: Role-based route protection
- **Material-UI Theme**: Centralized in `apps/web/src/theme/colorGarbTheme`
- **Service Layer**: Dedicated API services (`authService`, `orderService`, `messageService`)

### Type Safety
- **Shared Types**: Import from `@colorgarb/shared` package
- **API Contracts**: Consistent request/response types
- **Component Props**: Comprehensive TypeScript interfaces with JSDoc

## Backend Architecture Patterns

### Clean Architecture
- **Service Interfaces**: `I{Service}` pattern with dependency injection
- **Repository Pattern**: Data access abstraction layer
- **JWT Authentication**: Role-based authorization with organization scoping
- **Rate Limiting**: Auth endpoints (5/min), general API (100/min)

### Data Access
- **Entity Framework Core**: Code-first with `ColorGarbDbContext`
- **Navigation Properties**: Proper entity relationships
- **Audit Trails**: Comprehensive tracking for orders, messages, communications
- **Multi-Tenant Security**: Organization-level data isolation

### API Design
- **RESTful Endpoints**: Standard HTTP verbs with consistent structure
- **Response Wrappers**: `ApiResponse<T>` and `PaginatedResponse<T>`
- **Error Handling**: Standardized error response format
- **CORS Configuration**: Development (localhost) and production (Vercel) domains

## Critical Coding Standards

### Type Sharing
- **Always** define shared types in `packages/shared`
- Import consistently across frontend and backend
- Use TypeScript interfaces for all API contracts

### JSDoc Documentation
All public functions must include comprehensive JSDoc:
```typescript
/**
 * Submits performer measurements for a specific order.
 * Validates measurement ranges and triggers approval workflow.
 *
 * @param {string} orderId - Unique identifier of the order
 * @param {MeasurementSubmission[]} measurements - Array of performer measurements
 * @returns {Promise<MeasurementResult>} Result containing validation status
 * @throws {ValidationError} When measurements are outside acceptable ranges
 * @example
 * const result = await submitMeasurements("order-123", measurements);
 */
```

### Security Requirements
- **Authentication**: Always verify user permissions and organization access
- **Database Queries**: Use parameterized queries exclusively
- **Organization Isolation**: Enforce row-level security for multi-tenant data
- **File Operations**: Include virus scanning, size validation, secure storage

### Naming Conventions
| Element | Frontend | Backend | Example |
|---------|----------|---------|---------|
| Components | PascalCase | - | `OrderTimeline.tsx` |
| Hooks | camelCase with 'use' | - | `useOrderData.ts` |
| Services | camelCase | PascalCase | `orderService.ts` / `OrderService.cs` |
| API Routes | kebab-case | kebab-case | `/api/order-measurements` |
| Database Tables | - | PascalCase | `OrderStageHistory` |

## Authentication Flow

1. **Login**: POST `/api/auth/login` returns JWT + user info
2. **Token Storage**: localStorage with Zustand persistence
3. **API Calls**: Automatic token injection in service layer
4. **Backend Validation**: JWT verification on protected endpoints
5. **Role Authorization**: Server-side policies based on user role

## File Upload Patterns

### Message Attachments
- **Order-Scoped**: All files tied to specific orders
- **Database Metadata**: File info stored in database
- **File System Storage**: Actual files on disk with access control
- **Audit Tracking**: Complete file access history

### Security
- **File Type Validation**: Server-side type checking
- **Size Limits**: Configurable upload size restrictions
- **Virus Scanning**: File security validation
- **Access Control**: Role-based file access permissions

## Common Development Patterns

### Error Handling
- **Frontend**: Zustand error state with user-friendly messages
- **Backend**: Standardized `ApiResponse<T>` with detailed error info
- **Logging**: Serilog with structured logging in .NET

### Testing
- **Frontend**: Jest + React Testing Library for component tests
- **Backend**: xUnit + Moq for unit and integration tests
- **API Testing**: Test controllers with proper authorization setup

### Database Development
- **Migrations**: Always create migrations for schema changes
- **Seeding**: Use Entity Framework seed data for development
- **Relationships**: Configure navigation properties properly
- **Indexing**: Add indexes for performance on query-heavy columns

## Known Technical Issues

### MUI DatePickers + date-fns Compatibility
- **Issue**: MUI DatePickers v8.x requires specific date-fns configuration
- **Solution**: Use `npm install --legacy-peer-deps` and date-fns v4.x
- **Import Style**: Use `import { formatDistanceToNow } from 'date-fns'`

### Node Modules Permissions (Windows)
- **Issue**: Sometimes npm install fails with EPERM errors
- **Solution**: Run terminal as administrator or clear npm cache
- **Workaround**: Delete node_modules and package-lock.json, reinstall

## Development Environment Setup

### Prerequisites
- Node.js 18+ and npm 9+
- .NET 9 SDK
- SQL Server LocalDB or SQLite for development
- Redis (optional for development - health check will show unhealthy but app functions)

### First-Time Setup
```bash
# 1. Install dependencies
npm install
cd apps/web && npm install --legacy-peer-deps

# 2. Setup database
cd apps/api
dotnet ef database update

# 3. Start development servers
cd ../..
npm run dev  # Starts both frontend (5173) and backend (5132)
```

### Access Points
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5132
- **API Documentation**: http://localhost:5132/openapi
- **Health Check**: http://localhost:5132/api/health/detailed