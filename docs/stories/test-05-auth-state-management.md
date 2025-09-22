# Story Test-05: Fix Authentication State Management

**Title**: Create Reliable Authentication State Persistence for Tests

## User Story
As a Test Engineer, I want authentication state properly managed and persisted so that tests can efficiently reuse login sessions without redundant authentication steps.

## Priority
**Medium**

## Effort Estimate
5 story points

## Dependencies
- Story Test-03 (test data management)

## Acceptance Criteria
- Authentication state files are generated and stored correctly
- Tests can reuse authentication sessions across scenarios
- Auth state is valid for the duration of test runs
- Role-based authentication states are properly isolated
- Authentication setup is reliable and fast

## Technical Requirements
- Fix authentication state storage in `tests/auth-states/` directory
- Ensure auth tokens are valid and properly formatted
- Implement role-based authentication state files
- Add authentication state validation mechanisms
- Update test dependencies to use persistent auth states
- Create authentication troubleshooting documentation

## Current Issue
Authentication state files are not being generated correctly, causing tests to fail authentication or run slowly due to repeated login attempts.

## Authentication States to Create
```
tests/auth-states/
├── director-auth.json      # For director role tests
├── finance-auth.json       # For finance role tests
├── staff-auth.json         # For ColorGarb staff tests
└── unauthenticated.json    # For testing login flows
```

## Auth State File Format
```json
{
  "cookies": [...],
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

## Setup Process Enhancement
1. **Global Setup**: Create authentication states for all test users
2. **Test Dependencies**: Configure tests to use appropriate auth states
3. **State Validation**: Verify auth states are valid before test execution
4. **State Refresh**: Regenerate states when they expire

## Playwright Configuration Updates
```typescript
// Update playwright.config.ts projects
{
  name: 'director-authenticated',
  use: {
    ...devices['Desktop Chrome'],
    storageState: 'tests/auth-states/director-auth.json',
  },
  dependencies: ['setup'],
},
```

## Files to Update
- `tests/global-setup.ts` - Add auth state generation
- `playwright.config.ts` - Configure auth state usage
- Test files - Update to use proper auth dependencies

## Authentication Flow Testing
- Separate unauthenticated tests (login flows)
- Authenticated tests (dashboard, orders, etc.)
- Role-based access testing
- Session persistence validation

## Troubleshooting Features
- Auth state validation utilities
- Debug logging for authentication issues
- Auth state regeneration helpers
- Token expiration handling

## Success Criteria
- Tests reuse authentication sessions efficiently
- No redundant login attempts during test runs
- Role-based authentication works correctly
- Authentication-related test failures are eliminated
- Test execution time is optimized

## Story Status
**TODO**