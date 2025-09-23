# Authentication Troubleshooting Guide

## Overview

This guide helps diagnose and resolve authentication-related issues in Playwright E2E tests for the ColorGarb application.

## Common Authentication Issues

### 1. Auth State Files Not Found

**Symptoms:**
- Tests fail with "Storage state file not found" errors
- Authentication states are not persisting between test runs

**Diagnosis:**
```bash
# Check if auth states directory exists
ls tests/auth-states/

# Check if specific auth state files exist
ls tests/auth-states/*.json
```

**Solutions:**
1. **Run Global Setup:** Ensure global setup is creating auth states
   ```bash
   npx playwright test --project=setup
   ```

2. **Manual Auth State Creation:** Use the AuthStateValidator utility
   ```typescript
   import { AuthStateValidator } from './tests/utils/auth-validation';

   const validator = new AuthStateValidator();
   await validator.generateAuthStateReport();
   ```

3. **Clean and Recreate:** Remove invalid states and regenerate
   ```bash
   rm -rf tests/auth-states/
   npx playwright test --project=setup
   ```

### 2. Invalid Auth State Structure

**Symptoms:**
- Auth state files exist but tests still require login
- Authentication validation fails
- Session appears expired immediately

**Diagnosis:**
```typescript
// Use the auth validator to check state validity
const validator = new AuthStateValidator();
const states = await validator.validateAllAuthStates();
console.log(states);
```

**Solutions:**
1. **Validate Auth State Structure:** Check for required fields
   ```json
   {
     "origins": [
       {
         "origin": "http://localhost:5173",
         "localStorage": [
           {
             "name": "auth-storage",
             "value": "{\"state\":{\"user\":{\"id\":\"...\",\"email\":\"...\",\"role\":\"...\"},\"token\":\"...\",\"isAuthenticated\":true}}"
           }
         ]
       }
     ]
   }
   ```

2. **Regenerate Specific Auth State:**
   ```typescript
   const success = await validator.createTestAuthState(
     page,
     'director',
     'director@lincolnhigh.edu',
     'http://localhost:5173'
   );
   ```

### 3. Authentication Timeouts

**Symptoms:**
- Global setup fails with timeout errors during login
- Authentication takes too long to complete

**Diagnosis:**
- Check if frontend/backend services are running
- Verify network connectivity
- Check for browser automation detection

**Solutions:**
1. **Increase Timeout Values:**
   ```typescript
   // In global-setup.ts
   await page.waitForURL(/\/(dashboard|admin\/dashboard)/, { timeout: 15000 });
   ```

2. **Check Service Health:**
   ```bash
   curl http://localhost:5173  # Frontend
   curl http://localhost:5132/api/health  # Backend
   ```

3. **Debug Login Process:**
   ```typescript
   // Add debugging to setupAuthentication
   await page.screenshot({ path: 'debug-login.png' });
   console.log('Current URL:', page.url());
   ```

### 4. Role-Based Authentication Issues

**Symptoms:**
- Wrong user role accessing restricted areas
- Permission denied errors
- Incorrect dashboard loading

**Diagnosis:**
```typescript
// Check user info in auth state
const userInfo = validator.extractUserInfo(authState);
console.log('User Role:', userInfo?.role);
console.log('Organization:', userInfo?.organizationId);
```

**Solutions:**
1. **Verify Test Data:** Ensure test users have correct roles
   ```typescript
   // Check test fixtures
   import { testUsers } from './test-data/test-fixtures';
   console.log(testUsers);
   ```

2. **Update Auth State Mappings:**
   ```typescript
   // In playwright.config.ts
   {
     name: 'director-authenticated',
     use: {
       storageState: 'tests/auth-states/director.json',
     },
     testMatch: ['**/director/**'],
   }
   ```

### 5. Cross-Browser Authentication Issues

**Symptoms:**
- Auth works in Chrome but fails in Firefox/Safari
- Browser-specific storage issues

**Solutions:**
1. **Browser-Specific Auth States:** Create separate states per browser
   ```typescript
   const statePath = `tests/auth-states/${role}-${browserName}.json`;
   ```

2. **Cookie vs LocalStorage Issues:** Check browser support
   ```typescript
   // Fallback to cookies if localStorage fails
   await page.context().addCookies(authCookies);
   ```

## Debugging Commands

### Check Auth State Health
```bash
# Run auth validation utility
node -e "
const { AuthStateValidator } = require('./tests/utils/auth-validation');
const validator = new AuthStateValidator();
validator.generateAuthStateReport().then(console.log);
"
```

### Manual Auth State Creation
```bash
# Create auth state for specific role
npx playwright test tests/setup/create-auth-state.ts --project=setup
```

### Clear All Auth States
```bash
# Remove all auth state files
rm -rf tests/auth-states/
mkdir tests/auth-states/
```

### Test Specific Auth State
```bash
# Run tests with specific auth state
npx playwright test --project=director-authenticated tests/authenticated/
```

## Prevention Best Practices

### 1. Regular Auth State Validation
```typescript
// Add to global setup
const report = await authValidator.generateAuthStateReport();
if (report.includes('❌')) {
  console.warn('Invalid auth states detected');
}
```

### 2. Auth State Expiration Handling
```typescript
// Check auth state age
const maxAge = 24 * 60 * 60 * 1000; // 24 hours
if (Date.now() - state.lastModified > maxAge) {
  await regenerateAuthState(state.role);
}
```

### 3. Graceful Degradation
```typescript
// Fallback to manual login if auth state fails
try {
  await page.goto('/dashboard');
  await page.waitForSelector('[data-testid="create-order-button"]', { timeout: 5000 });
} catch (error) {
  console.log('Auth state failed, performing manual login');
  await manualLogin(page, userCredentials);
}
```

## Environment-Specific Issues

### Development Environment
- **Issue:** Auth states point to wrong localhost ports
- **Solution:** Update baseURL in auth states to match current dev server

### CI/CD Environment
- **Issue:** Auth states not persisting between jobs
- **Solution:** Cache auth-states directory or regenerate in each job

### Production-Like Testing
- **Issue:** HTTPS vs HTTP auth state mismatches
- **Solution:** Use environment-specific auth state configurations

## Monitoring and Alerts

### Add Auth Health Checks
```typescript
// In health-checks.ts
async checkAuthStates(): Promise<HealthCheckResult> {
  const validator = new AuthStateValidator();
  const states = await validator.validateAllAuthStates();
  const invalidCount = states.filter(s => !s.isValid).length;

  return {
    status: invalidCount === 0 ? 'pass' : 'warning',
    message: `${states.length - invalidCount}/${states.length} auth states valid`,
    duration: Date.now() - startTime
  };
}
```

### Performance Monitoring
```typescript
// Track auth setup time
const authStartTime = Date.now();
await setupAuthentication(page, baseURL, apiUrl);
const authDuration = Date.now() - authStartTime;
console.log(`🔐 Auth setup completed in ${authDuration}ms`);
```

This guide provides comprehensive troubleshooting for authentication issues in the ColorGarb test suite.