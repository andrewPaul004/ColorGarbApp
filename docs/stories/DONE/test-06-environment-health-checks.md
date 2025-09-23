# Story Test-06: Implement Environment Health Checks

**Title**: Add Pre-Test Environment Validation

## User Story
As a Test Engineer, I want automatic environment health checks before test execution so that test failures due to environment issues are caught early and clearly identified.

## Priority
**Medium**

## Effort Estimate
3 story points

## Dependencies
- Story Test-03 (test data management)

## Acceptance Criteria
- Frontend and backend servers are validated before tests
- Database connectivity is verified
- Required test data existence is confirmed
- Network connectivity to external services is checked
- Environment validation failures provide clear guidance

## Technical Requirements
- Implement health check utilities for frontend and backend
- Add database connectivity validation
- Create test data existence verification
- Add environment configuration validation
- Implement pre-test environment setup verification
- Create environment troubleshooting guides

## Current Issue
Tests fail due to environment issues (servers not running, database not accessible) without clear indication of the root cause.

## Health Checks to Implement

### Server Availability
```typescript
// Frontend health check
const frontendHealth = await fetch('http://localhost:5173');
if (!frontendHealth.ok) {
  throw new Error('Frontend server not available at localhost:5173');
}

// Backend health check
const backendHealth = await fetch('http://localhost:5132/api/health');
if (!backendHealth.ok) {
  throw new Error('Backend server not available at localhost:5132');
}
```

### Database Connectivity
```typescript
// Verify database is accessible and responsive
const dbCheck = await fetch('http://localhost:5132/api/health/database');
if (!dbCheck.ok) {
  throw new Error('Database not accessible - check connection string');
}
```

### Test Data Validation
```typescript
// Verify required test users exist
const usersCheck = await fetch('http://localhost:5132/api/test/users');
const users = await usersCheck.json();
const requiredUsers = ['director@lincolnhigh.edu', 'finance@lincolnhigh.edu', 'staff@colorgarb.com'];
const missingUsers = requiredUsers.filter(email => !users.find(u => u.email === email));
if (missingUsers.length > 0) {
  throw new Error(`Missing test users: ${missingUsers.join(', ')}`);
}
```

### Environment Configuration
```typescript
// Verify required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(name => !process.env[name]);
if (missingEnvVars.length > 0) {
  throw new Error(`Missing environment variables: ${missingEnvVars.join(', ')}`);
}
```

## Implementation Files
- `tests/utils/health-checks.ts` - Health check utilities
- `tests/global-setup.ts` - Add health checks to setup
- `tests/utils/environment-validator.ts` - Environment validation
- `docs/troubleshooting/test-environment.md` - Troubleshooting guide

## Health Check Categories
1. **Critical**: Must pass for tests to run (servers, database)
2. **Warning**: Should pass but tests can continue (external services)
3. **Info**: Nice to have (performance metrics, version checks)

## Error Messaging
Provide clear, actionable error messages:
```
❌ Frontend server not responding
   Expected: http://localhost:5173
   Solution: Run 'npm run dev:web' to start the frontend server

❌ Test users not found in database
   Missing: director@lincolnhigh.edu, finance@lincolnhigh.edu
   Solution: Run 'npm run test:setup' to seed test data
```

## Troubleshooting Documentation
Create guides for common issues:
- Server startup problems
- Database connection issues
- Test data seeding failures
- Environment configuration problems

## Performance Monitoring
- Track health check response times
- Monitor resource usage during tests
- Alert on degraded performance

## Success Criteria
- Environment issues are caught before test execution
- Clear error messages guide quick problem resolution
- Test reliability improves due to environment validation
- Reduced time spent debugging environment issues

## Story Status
**COMPLETED**

## Dev Agent Record

### Agent Model Used
Claude Sonnet 4

### File List
- `tests/utils/health-checks.ts` - Comprehensive environment health checker with timeout handling and diagnostic capabilities
- `tests/global-setup.ts` - Enhanced to include environment health validation before test data seeding
- `tests/global-teardown.ts` - Enhanced to include test data cleanup after test runs

### Completion Notes
- Created comprehensive EnvironmentHealthChecker class that validates frontend, backend, database, test data, and environment configuration
- Implements proper timeout handling and detailed error reporting for each health check component
- Enhanced global setup to perform environment validation before proceeding with test data seeding and authentication setup
- Health checker provides clear diagnostic information and suggestions for resolving environment issues
- System fails fast if environment is unhealthy, preventing wasted test execution time
- Supports degraded mode for warnings while allowing tests to proceed when appropriate
- Includes wait-for-services functionality with retry logic for CI/CD environments

### Change Log
- 2025-09-22: Created health-checks.ts with comprehensive environment validation utilities
- 2025-09-22: Enhanced global-setup.ts to integrate health checks before test data seeding
- 2025-09-22: Fixed global setup browser initialization and authentication flow