# Unified Project Structure

```
ColorGarbClientPortal/
├── .github/                    # CI/CD workflows
│   └── workflows/
│       ├── ci.yaml
│       ├── frontend-deploy.yaml
│       └── backend-deploy.yaml
├── apps/                       # Application packages
│   ├── web/                    # Frontend application
│   │   ├── public/             # Static assets
│   │   ├── src/
│   │   │   ├── components/     # Reusable UI components
│   │   │   │   ├── common/     # Generic components
│   │   │   │   ├── forms/      # Form components
│   │   │   │   ├── layout/     # Layout components
│   │   │   │   └── timeline/   # Order timeline components
│   │   │   ├── pages/          # Page-level components
│   │   │   │   ├── Dashboard/  # Main dashboard
│   │   │   │   ├── OrderDetail/ # Order workspace
│   │   │   │   ├── Measurements/ # Measurement collection
│   │   │   │   ├── Payments/   # Payment processing
│   │   │   │   └── Auth/       # Authentication
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── services/       # API client services
│   │   │   ├── stores/         # Zustand state management
│   │   │   ├── types/          # TypeScript interfaces
│   │   │   ├── styles/         # Global styles and themes
│   │   │   └── utils/          # Frontend utilities
│   │   ├── tests/              # Frontend tests
│   │   │   ├── components/     # Component tests
│   │   │   ├── pages/          # Page tests
│   │   │   └── e2e/           # End-to-end tests
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tailwind.config.js
│   └── api/                    # Backend application
│       ├── src/
│       │   ├── Controllers/    # API controllers
│       │   │   ├── AuthController.cs
│       │   │   ├── OrdersController.cs
│       │   │   ├── MeasurementsController.cs
│       │   │   └── PaymentsController.cs
│       │   ├── Services/       # Business logic services
│       │   │   ├── Interfaces/ # Service contracts
│       │   │   ├── OrderService.cs
│       │   │   ├── PaymentService.cs
│       │   │   └── NotificationService.cs
│       │   ├── Models/         # Data models
│       │   │   ├── Entities/   # Database entities
│       │   │   ├── DTOs/       # Data transfer objects
│       │   │   └── Requests/   # Request models
│       │   ├── Data/           # Data access layer
│       │   │   ├── ApplicationDbContext.cs
│       │   │   ├── Repositories/ # Repository implementations
│       │   │   └── Migrations/ # EF Core migrations
│       │   ├── Infrastructure/ # External integrations
│       │   │   ├── Payment/    # Stripe integration
│       │   │   ├── Notifications/ # SendGrid/Twilio
│       │   │   └── Storage/    # Azure Blob Storage
│       │   ├── Common/         # Shared utilities
│       │   │   ├── Extensions/ # Extension methods
│       │   │   ├── Middleware/ # Custom middleware
│       │   │   └── Validators/ # Request validators
│       │   └── Program.cs      # Application entry point
│       ├── tests/              # Backend tests
│       │   ├── Unit/           # Unit tests
│       │   ├── Integration/    # Integration tests
│       │   └── TestUtilities/  # Test helpers
│       ├── ColorGarb.Api.csproj
│       └── appsettings.json
├── packages/                   # Shared packages
│   ├── shared/                 # Shared types and utilities
│   │   ├── src/
│   │   │   ├── types/          # Shared TypeScript interfaces
│   │   │   │   ├── order.ts    # Order-related types
│   │   │   │   ├── user.ts     # User-related types
│   │   │   │   ├── measurement.ts # Measurement types
│   │   │   │   └── payment.ts  # Payment types
│   │   │   ├── constants/      # Shared constants
│   │   │   │   ├── orderStages.ts
│   │   │   │   └── userRoles.ts
│   │   │   └── utils/          # Shared utility functions
│   │   │       ├── validation.ts
│   │   │       └── formatting.ts
│   │   └── package.json
│   ├── ui/                     # Shared UI component library
│   │   ├── src/
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Modal/
│   │   │   └── Timeline/
│   │   └── package.json
│   └── config/                 # Shared configuration
│       ├── eslint/
│       │   └── base.js
│       ├── typescript/
│       │   └── tsconfig.base.json
│       └── jest/
│           └── jest.config.base.js
├── infrastructure/             # Infrastructure as Code
│   ├── arm-templates/          # Azure ARM templates
│   │   ├── main.json          # Main infrastructure template
│   │   ├── database.json      # SQL Database configuration
│   │   ├── app-services.json  # App Service configuration
│   │   └── storage.json       # Storage account configuration
│   ├── environments/          # Environment-specific configs
│   │   ├── development.json
│   │   ├── staging.json
│   │   └── production.json
│   └── scripts/               # Deployment scripts
│       ├── deploy.ps1
│       └── setup-database.sql
├── scripts/                    # Build and utility scripts
│   ├── build.ps1              # Cross-platform build script
│   ├── test.ps1               # Run all tests
│   ├── deploy-dev.ps1         # Development deployment
│   └── setup-local.ps1        # Local development setup
├── docs/                       # Documentation
│   ├── prd.md                 # Product requirements
│   ├── front-end-spec.md      # UI/UX specification
│   ├── architecture.md        # This document
│   ├── api/                   # API documentation
│   └── deployment/            # Deployment guides
├── .env.example                # Environment template
├── .gitignore
├── README.md
├── ColorGarb.sln              # .NET solution file
└── package.json               # Root package.json for npm workspaces
```
