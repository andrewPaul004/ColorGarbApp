# ColorGarb Client Portal

A full-stack web application for managing costume manufacturing orders and client communications.

## 🏗️ Project Structure

This is a monorepo containing:

```
colorgarb-app/
├── apps/
│   ├── web/          # React TypeScript frontend
│   └── api/          # .NET Core Web API backend
├── packages/
│   └── shared/       # Shared types and utilities
├── infrastructure/   # Azure ARM templates
├── docs/            # Documentation and specifications
└── .bmad-core/      # BMAD agent configuration
```

## 🛠️ Tech Stack

### Frontend
- **React 18** - Component-based UI framework
- **TypeScript 5** - Type-safe JavaScript
- **Vite 4** - Fast build tool with HMR
- **Material-UI 5** - Component library with accessibility
- **Tailwind CSS 3** - Utility-first styling
- **Zustand 4** - Lightweight state management
- **Jest + React Testing Library** - Testing framework

### Backend
- **.NET Core 9** - High-performance web API framework
- **C# 11** - Modern programming language
- **Entity Framework Core** - ORM for database operations
- **Azure SQL Database** - Relational database
- **Redis 7** - Session storage and caching
- **JWT Authentication** - Secure API authentication
- **xUnit + Moq** - Testing framework

### Infrastructure
- **Azure App Services** - Backend hosting
- **Azure Static Web Apps** - Frontend hosting
- **Azure SQL Database** - Database hosting
- **Azure Cache for Redis** - Redis hosting
- **Azure DevOps** - CI/CD pipeline
- **Application Insights** - Monitoring and logging

## 🚀 Development Setup

### Prerequisites

1. **Node.js 18+** and **npm 9+**
2. **.NET 9 SDK**
3. **Git**
4. **Azure CLI** (for deployment)
5. **Visual Studio Code** (recommended)

### Local Development Environment

#### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd ColorGarbApp

# Install root workspace dependencies
npm install

# Install frontend dependencies
cd apps/web
npm install

# Restore backend dependencies
cd ../api
dotnet restore
```

#### 2. Database Setup

```bash
# Create and run database migrations
cd apps/api
dotnet ef database update

# Verify database connection
dotnet run --urls="http://localhost:5132"
# Visit http://localhost:5132/api/health/detailed
```

#### 3. Redis Setup (Optional for Development)

For local development, Redis will attempt to connect to `localhost:6379`. If Redis is not available, the health check will report it as unhealthy, but the application will continue to function.

**Install Redis locally:**

**Windows (using Chocolatey):**
```bash
choco install redis-64
redis-server
```

**macOS (using Homebrew):**
```bash
brew install redis
brew services start redis
```

**Linux (Ubuntu):**
```bash
sudo apt-get install redis-server
sudo systemctl start redis-server
```

#### 4. Start Development Servers

```bash
# Option 1: Start both servers concurrently (from root)
npm run dev

# Option 2: Start servers individually
# Terminal 1 - Frontend (from root)
npm run dev:web

# Terminal 2 - Backend (from root)
npm run dev:api
```

**Access Points:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5132
- API Documentation: http://localhost:5132/openapi

## 🧪 Testing

### Frontend Tests

```bash
cd apps/web

# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Backend Tests

```bash
cd apps/api

# Run all tests
dotnet test

# Run tests with coverage
dotnet test --collect:"XPlat Code Coverage"
```

### Run All Tests

```bash
# From root directory
npm run test
```

## 🏗️ Build and Deployment

### Local Build

```bash
# Build frontend
npm run build:web

# Build backend
npm run build:api

# Build both
npm run build
```

### Production Deployment

Deployment is automated through Azure DevOps pipelines:

1. **Push to `develop` branch** → Deploys to Development environment
2. **Push to `main` branch** → Deploys to Production environment

### Manual Deployment Setup

```bash
# 1. Create Azure resource group
az group create --name colorgarb-rg --location eastus

# 2. Deploy infrastructure (development)
az deployment group create \
  --resource-group colorgarb-rg \
  --template-file infrastructure/azure-resources.json \
  --parameters environment=dev

# 3. Deploy infrastructure (production)
az deployment group create \
  --resource-group colorgarb-rg \
  --template-file infrastructure/azure-resources.json \
  --parameters environment=prod
```

## 📁 Key Directories and Files

### Configuration Files
- `package.json` - Workspace configuration and scripts
- `apps/web/package.json` - Frontend dependencies and scripts
- `apps/api/ColorGarbApi.csproj` - Backend dependencies
- `apps/web/vite.config.ts` - Vite build configuration
- `apps/api/appsettings.json` - Backend configuration
- `azure-pipelines.yml` - CI/CD pipeline configuration

### Source Code Organization
- `apps/web/src/components/` - React components
- `apps/web/src/stores/` - Zustand state management
- `apps/web/src/tests/` - Frontend tests
- `apps/api/Controllers/` - API endpoints
- `apps/api/Models/` - Data models
- `apps/api/Services/` - Business logic services
- `apps/api/Data/` - Database context and configuration

## 🔧 Development Scripts

### Root Level Scripts

```bash
npm run dev           # Start both frontend and backend
npm run dev:web       # Start frontend development server
npm run dev:api       # Start backend development server
npm run build         # Build both applications
npm run build:web     # Build frontend only
npm run build:api     # Build backend only
npm run test          # Run all tests
npm run test:web      # Run frontend tests only
npm run test:api      # Run backend tests only
npm run lint          # Run linting on all projects
npm run clean         # Clean all build artifacts
```

### Frontend Scripts (apps/web)

```bash
npm run dev           # Start Vite development server
npm run build         # Production build
npm run preview       # Preview production build locally
npm run test          # Run tests once
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run lint          # Run ESLint
npm run lint:fix      # Auto-fix ESLint issues
```

### Backend Scripts (apps/api)

```bash
dotnet run            # Start development server
dotnet build          # Build application
dotnet test           # Run tests
dotnet ef migrations add <name>    # Create new migration
dotnet ef database update         # Apply migrations to database
dotnet publish        # Create production build
```

## 🔐 Environment Variables

### Frontend (.env files in apps/web/)

```bash
# Development
VITE_API_BASE_URL=http://localhost:5132/api

# Production
VITE_API_BASE_URL=https://your-api-domain.azurewebsites.net/api
```

### Backend (appsettings.json or environment variables)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=ColorGarbDb;Trusted_Connection=true;MultipleActiveResultSets=true;TrustServerCertificate=true",
    "Redis": "localhost:6379"
  },
  "Jwt": {
    "Key": "dev-secret-key-that-should-be-changed-in-production",
    "Issuer": "ColorGarbApi",
    "Audience": "ColorGarbClient"
  }
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Frontend build fails with TypeScript errors**
   ```bash
   cd apps/web
   npm run lint:fix
   npm run build
   ```

2. **Backend database connection issues**
   ```bash
   cd apps/api
   dotnet ef database update
   # Verify connection string in appsettings.json
   ```

3. **Redis connection failures**
   - Check if Redis is running: `redis-cli ping`
   - Verify connection string in configuration
   - For development, Redis failures are non-fatal

4. **Port conflicts**
   - Frontend: Change port in `apps/web/vite.config.ts`
   - Backend: Use `--urls` parameter: `dotnet run --urls="http://localhost:5001"`

### Debug Mode

```bash
# Frontend with debug logging
cd apps/web
npm run dev -- --debug

# Backend with detailed logging
cd apps/api
dotnet run --environment Development
```

## 📚 Additional Resources

- [Architecture Documentation](docs/architecture/)
- [PRD and Requirements](docs/prd/)
- [Frontend Specifications](docs/front-end-spec/)
- [API Documentation](http://localhost5132/openapi) (when running locally)
- [Azure DevOps Project](https://dev.azure.com/your-org/colorgarb)

## 🤝 Contributing

1. Create a feature branch from `develop`
2. Make your changes following the coding standards
3. Add tests for new functionality
4. Run the full test suite
5. Create a pull request to `develop`

## 📄 License

[Your License Here]