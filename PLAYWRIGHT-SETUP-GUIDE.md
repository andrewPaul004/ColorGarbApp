# ColorGarb Playwright E2E Testing Setup Guide

## Quick Start

### 1. Install Playwright Dependencies
```bash
# Install Playwright test runner
npm install --save-dev @playwright/test

# Install browsers
npx playwright install

# Install additional dependencies if needed
npx playwright install-deps
```

### 2. Verify Installation
```bash
# Check Playwright version
npx playwright --version

# Run a quick test to verify setup
npx playwright test --help
```

### 3. Start Development Servers
```bash
# Terminal 1: Start backend API
npm run dev:api
# This should start the .NET API on http://localhost:5132

# Terminal 2: Start frontend
npm run dev:web
# This should start the React app on http://localhost:5173
```

### 4. Run Tests
```bash
# Run all tests (headless)
npm run test:e2e

# Run tests in UI mode (recommended for development)
npm run test:e2e:ui

# Run specific test file
npx playwright test tests/auth/authentication.spec.ts

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug a specific test
npm run test:e2e:debug tests/auth/authentication.spec.ts
```

## Test Structure Overview

```
tests/
├── auth/                               # Authentication & session management
│   └── authentication.spec.ts         # Login, logout, validation, security
├── orders/                             # Order management workflows
│   └── order-workflow.spec.ts         # Order creation, navigation, filtering
├── manufacturing/                      # Manufacturing process validation
│   └── stage-progression.spec.ts      # 13-stage workflow testing
├── security/                           # Security & access control
│   ├── multi-tenant-isolation.spec.ts # Organization data isolation
│   └── role-based-access.spec.ts      # Permission validation
├── page-objects/                       # Reusable page models
│   ├── BasePage.ts                     # Common functionality
│   ├── LoginPage.ts                    # Authentication pages
│   ├── DashboardPage.ts               # Order dashboard
│   └── OrderDetailPage.ts             # Order details & messaging
├── global-setup.ts                     # Test environment setup
├── global-teardown.ts                 # Test cleanup
└── auth-states/                        # Generated auth tokens
    ├── director.json                   # Director user session
    ├── finance.json                    # Finance user session
    └── staff.json                      # ColorGarb staff session
```

## Test Users & Credentials

The tests use these predefined user accounts:

```javascript
// Organization: Lincoln High School
director@lincolnhigh.edu / password123  (Director role)
finance@lincolnhigh.edu / password123   (Finance role)

// Organization: ColorGarb Staff
staff@colorgarb.com / password123       (ColorGarbStaff role)
```

## Test Commands Reference

### Development Commands
```bash
# Interactive test development
npm run test:e2e:ui

# Debug specific test
npm run test:e2e:debug tests/auth/authentication.spec.ts

# Run tests with console output
npx playwright test --headed --project=chromium

# Generate test code (record interactions)
npx playwright codegen http://localhost:5173
```

### CI/CD Commands
```bash
# Run all tests (CI mode)
npm run test:e2e

# Run with specific reporter
npx playwright test --reporter=github

# Run specific browser
npx playwright test --project=chromium

# Parallel execution
npx playwright test --workers=4
```

### Reporting Commands
```bash
# Generate HTML report
npm run test:e2e:report

# View last test results
npx playwright show-report

# Generate trace viewer (for failed tests)
npx playwright show-trace test-results/trace.zip
```

## Test Data Requirements

### Database Setup
The tests assume the following data exists:
- At least one organization (Lincoln High School)
- Users with appropriate roles
- Sample orders in various stages
- Basic test data for messaging

### Environment Variables
Create a `.env` file in the project root:
```bash
# Application URLs
BASE_URL=http://localhost:5173
API_URL=http://localhost:5132

# Test configuration
WEB_PORT=5173
API_PORT=5132
NODE_ENV=test
```

## Browser Configuration

The tests run on multiple browsers:

| Browser | Desktop | Mobile | Accessibility |
|---------|---------|--------|---------------|
| Chromium | ✅ | ✅ | ✅ |
| Firefox | ✅ | ❌ | ✅ |
| WebKit | ✅ | ❌ | ✅ |

### Custom Browser Configuration
Edit `playwright.config.ts` to modify browser settings:

```javascript
// Add custom browser project
{
  name: 'custom-chrome',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    // Add custom settings
  }
}
```

## Common Issues & Solutions

### Issue: Tests fail with "Browser not found"
```bash
# Solution: Install browsers
npx playwright install
```

### Issue: API connection refused
```bash
# Solution: Ensure backend is running
npm run dev:api
# Check http://localhost:5132/api/health
```

### Issue: Frontend not loading
```bash
# Solution: Ensure frontend is running
npm run dev:web
# Check http://localhost:5173
```

### Issue: Authentication state not saved
```bash
# Solution: Check auth-states directory exists
mkdir -p tests/auth-states
# Re-run global setup
npx playwright test --global-setup-only
```

### Issue: Tests are flaky
```bash
# Solution: Run with retries
npx playwright test --retries=2

# Or increase timeouts in playwright.config.ts
timeout: 60000,
expect: { timeout: 15000 }
```

## Performance Optimization

### Faster Test Execution
```bash
# Run tests in parallel
npx playwright test --workers=4

# Run only changed tests (if using git)
npx playwright test --only-changed

# Skip browser downloads in CI
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install
```

### Test Selection
```bash
# Run specific test categories
npx playwright test tests/auth/

# Run by test name pattern
npx playwright test --grep "login"

# Skip slow tests in development
npx playwright test --grep-invert "slow"
```

## Debugging Tips

### Visual Debugging
```bash
# Open browser during test execution
npx playwright test --headed --project=chromium

# Slow down test execution
npx playwright test --slow-mo=1000

# Debug with DevTools
npx playwright test --debug
```

### Screenshots & Videos
```bash
# Take screenshots on failure (already configured)
screenshot: 'only-on-failure'

# Record videos of failed tests (already configured)
video: 'retain-on-failure'

# Custom screenshots in tests
await page.screenshot({ path: 'debug-screenshot.png' });
```

### Trace Analysis
```bash
# Generate traces for failed tests (already configured)
trace: 'on-first-retry'

# View trace files
npx playwright show-trace test-results/trace.zip
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Start servers
        run: |
          npm run dev:api &
          npm run dev:web &

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: test-results/
```

## Contributing to Tests

### Adding New Tests
1. Create test file in appropriate directory
2. Use existing Page Objects when possible
3. Follow naming conventions: `feature-name.spec.ts`
4. Include both positive and negative test cases
5. Add proper test documentation

### Test Best Practices
1. **Isolation**: Each test should be independent
2. **Reliability**: Use proper wait strategies
3. **Maintainability**: Use Page Object Model
4. **Clarity**: Descriptive test names and comments
5. **Performance**: Avoid unnecessary delays

### Page Object Updates
When UI changes, update Page Objects:
1. Update selectors in page object files
2. Add new methods for new functionality
3. Maintain backward compatibility when possible
4. Update JSDoc documentation

## Support & Resources

### Documentation
- [Playwright Official Docs](https://playwright.dev/)
- [ColorGarb Test Coverage Analysis](./TEST-COVERAGE-ANALYSIS.md)
- [Project README](./README.md)

### Getting Help
1. Check existing test files for examples
2. Review Page Object implementations
3. Use Playwright's codegen for new interactions
4. Consult team members familiar with the codebase

This setup guide provides everything needed to run and maintain the ColorGarb E2E test suite effectively.