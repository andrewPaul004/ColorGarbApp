# Epic 1 - Happy Path Test Plan
## ColorGarb Client Portal - Foundation Features

This document provides a comprehensive testing guide for Epic 1 features, covering project setup, user authentication, role-based access control, and the basic client portal framework.

---

## 🚀 Local Development Setup

### Prerequisites
Before starting the test, ensure you have the following installed:

1. **Node.js 18+** and **npm 9+**
2. **.NET 9 SDK**
3. **Git**
4. **SQL Server LocalDB** or **SQL Server** instance
5. **Redis** (optional - will work without for basic testing)

### Starting the Application

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
# Navigate to backend directory
cd apps/api

# Create and apply database migrations
dotnet ef database update

# Verify database connection (optional)
dotnet run --urls="http://localhost:5132"
# Visit http://localhost5132/api/health/detailed
```

#### 3. Start Development Servers

**Option 1: Start both servers concurrently (Recommended)**
```bash
# From root directory
npm run dev
```

**Option 2: Start servers individually**
```bash
# Terminal 1 - Frontend
npm run dev:web

# Terminal 2 - Backend  
npm run dev:api
```

**Access Points:**
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5132
- **API Documentation**: http://localhost:5132/openapi

---

## 🧪 Happy Path Test Scenarios

### Test Scenario 1: Project Infrastructure Verification
**Story 1.1: Project Setup and Development Environment**

#### Verify Development Environment

1. **Confirm servers are running:**
   - Open http://localhost:5173 - Should show React app
   - Open http://localhost:5132/api/health - Should return {"status": "Healthy"}
   - Open http://localhost:5132/openapi - Should show Swagger UI

2. **Verify hot reloading:**
   - **Frontend**: Make a small change to any React component, save - should auto-refresh
   - **Backend**: Make a small change to any controller, save - should auto-recompile

3. **Test database connectivity:**
   - Visit http://localhost:5132/api/health/detailed
   - Verify "Database" status shows "Healthy"
   - Verify "Redis" status (may show "Unhealthy" if not installed - this is OK for testing)

**✅ Expected Result:** Development environment fully operational with hot reloading

---

### Test Scenario 2: User Authentication Flow
**Story 1.2: User Authentication System**

#### Test Login Functionality

1. **Access login page:**
   - Navigate to http://localhost:5173
   - Should automatically redirect to login page (`/auth/login`)
   - Verify mobile-responsive design by resizing browser window

2. **Test invalid login attempts:**
   - Enter invalid email: `invalid@example.com`
   - Enter any password: `password123`
   - Click "Sign In"
   - **Expected**: Clear error message displayed
   - **Expected**: No account lockout after few attempts (security feature)

3. **Test valid login (using seeded test data):**
   ```
   Email: director@testschool.edu
   Password: TestPassword123!
   ```
   - Enter credentials and click "Sign In"
   - **Expected**: Successful login and redirect to dashboard
   - **Expected**: JWT token stored in browser localStorage

4. **Verify session persistence:**
   - Refresh the browser page
   - **Expected**: User remains logged in
   - **Expected**: Dashboard loads without redirect to login

**✅ Expected Result:** Secure authentication with proper error handling and session management

---

### Test Scenario 3: Role-Based Access Control
**Story 1.3: Role-Based Access Control**

#### Test Director Role Access

1. **Verify role-based navigation (logged in as Director):**
   - **Expected**: Navigation menu shows:
     - Dashboard
     - Orders  
     - Organization (Director-only item)
   - **Expected**: User profile shows "Director" role chip

2. **Test organization data isolation:**
   - **Expected**: Can only see orders for "Test School" organization
   - **Expected**: Cannot access other organizations' data
   - **Expected**: Organization ID properly displayed in user profile

3. **Test authorization:**
   - Open browser Developer Tools → Network tab
   - Navigate between dashboard pages
   - **Expected**: All API requests include `Authorization: Bearer <token>` header
   - **Expected**: API responses only contain organization-specific data

#### Test Finance Role Access (Optional - if test data available)

1. **Log out and log in as Finance user:**
   ```
   Email: finance@testschool.edu
   Password: TestPassword123!
   ```

2. **Verify restricted navigation:**
   - **Expected**: Navigation shows Dashboard and Orders only
   - **Expected**: No "Organization" menu item (Director-only)
   - **Expected**: Same organization data as Director, but limited menu

**✅ Expected Result:** Proper role-based access control with organization data isolation

---

### Test Scenario 4: Client Portal Dashboard
**Story 1.4: Basic Client Portal Framework**

#### Test Dashboard Features

1. **Verify dashboard layout:**
   - **Expected**: "Order Dashboard" header with personalized greeting
   - **Expected**: Summary cards showing:
     - Total Orders count
     - Active orders count  
     - Overdue orders count
     - Total Value in USD currency format

2. **Test order filtering:**
   - **Status Filter**: Change from "Active Only" to "All Orders"
     - **Expected**: Additional completed orders appear
     - **Expected**: Summary statistics update
   
   - **Stage Filter**: Select "Measurements" 
     - **Expected**: Only orders in Measurements stage shown
     - **Expected**: Filter dropdown includes all 13 manufacturing stages

3. **Verify order card information:**
   - Each order card should display:
     - **Order Number** (e.g., "CG-2023-001")
     - **Description** (truncated if long)
     - **Current Stage** with progress bar percentage
     - **Payment Status** chip with appropriate color
     - **Ship Date** (red if overdue, normal if on time)
     - **Total Amount** in USD format

4. **Test responsive design:**
   - **Desktop view**: Orders in 3-column grid
   - **Tablet view**: Orders in 2-column grid
   - **Mobile view**: Orders in single column with hamburger menu navigation

5. **Test order card interactions:**
   - Click on any order card
   - **Expected**: Console log shows "Order selected: [order-id]" (placeholder for future navigation)

#### Test Mobile Navigation

1. **Resize browser to mobile width** (< 768px):
   - **Expected**: Hamburger menu icon appears in top-left
   - **Expected**: Desktop navigation menu hidden

2. **Test mobile menu:**
   - Click hamburger icon
   - **Expected**: Slide-out drawer opens from left
   - **Expected**: Menu items: Dashboard, Orders, Organization (if Director)
   - **Expected**: User name displayed in drawer header

3. **Test mobile navigation:**
   - Click "Orders" in mobile menu
   - **Expected**: Menu closes automatically
   - **Expected**: Navigation works properly on mobile

#### Test User Profile Section

1. **Access user profile:**
   - Click user avatar/initials in top-right corner
   - Select "Profile Settings" from dropdown menu

2. **Verify profile information:**
   - **Expected**: User's full name and email displayed
   - **Expected**: User role chip with proper color and icon
   - **Expected**: Organization details card (if user has organization)
   - **Expected**: Organization ID and contact information displayed

3. **Test logout functionality:**
   - Click "Logout" button in profile page
   - **Expected**: Confirmation dialog appears
   - Click "Logout" in dialog
   - **Expected**: Redirected to login page
   - **Expected**: JWT token removed from localStorage
   - **Expected**: Cannot access dashboard without re-authentication

**✅ Expected Result:** Fully functional dashboard with responsive design, filtering, and secure user management

---

### Test Scenario 5: ColorGarb Branding and Theme
**Story 1.4: Basic Client Portal Framework - Branding**

#### Verify Brand Consistency

1. **Test ColorGarb theme:**
   - **Expected**: Primary blue color (#4198ed) used throughout
   - **Expected**: Secondary orange color (#ef984a) for accents
   - **Expected**: Professional gradient buttons and cards
   - **Expected**: Consistent typography with proper font weights

2. **Verify responsive components:**
   - **Expected**: Material-UI components with custom ColorGarb styling
   - **Expected**: Proper hover effects on interactive elements
   - **Expected**: Consistent spacing and layout across all screen sizes

3. **Test progress indicators:**
   - **Expected**: Order progress bars show gradient from blue to orange
   - **Expected**: Payment status chips use appropriate colors (green=paid, orange=partial, etc.)

**✅ Expected Result:** Professional, consistent branding throughout the application

---

## 🔍 Additional Verification Tests

### Security Verification

1. **Test JWT token expiration:**
   - Leave application idle for extended period
   - Try to make API requests
   - **Expected**: Proper token refresh or re-authentication prompt

2. **Test direct URL access:**
   - Log out completely
   - Try to access http://localhost:5173/dashboard directly
   - **Expected**: Redirected to login page

3. **Test API endpoint security:**
   - Open browser DevTools → Network tab
   - Try accessing http://localhost:5132/api/orders without token
   - **Expected**: 401 Unauthorized response

### Error Handling Verification

1. **Test network errors:**
   - Disconnect from internet
   - Try to perform actions
   - **Expected**: User-friendly error messages displayed

2. **Test server errors:**
   - Stop backend server (Ctrl+C in terminal)
   - Try to load dashboard
   - **Expected**: Appropriate error handling, no white screens

---

## 📊 Success Criteria Summary

### Epic 1 Complete Success Indicators:

#### ✅ Story 1.1 - Project Setup
- [x] Development servers start without errors
- [x] Hot reloading works for both frontend and backend
- [x] Database connectivity established
- [x] API documentation accessible

#### ✅ Story 1.2 - Authentication
- [x] Secure login/logout functionality
- [x] JWT token management
- [x] Session persistence across browser refreshes
- [x] Mobile-responsive login interface

#### ✅ Story 1.3 - Access Control
- [x] Role-based navigation menus
- [x] Organization data isolation
- [x] Proper authorization headers on API requests
- [x] User profile displays correct role information

#### ✅ Story 1.4 - Portal Framework
- [x] Dashboard displays organization-specific orders
- [x] Responsive design works on all screen sizes  
- [x] Filtering functionality operates correctly
- [x] ColorGarb branding consistently applied
- [x] User profile and logout functionality complete

---

## 🐛 Troubleshooting Common Issues

### If frontend won't start:
```bash
cd apps/web
rm -rf node_modules
npm install
npm run dev
```

### If backend won't start:
```bash
cd apps/api
dotnet clean
dotnet restore
dotnet ef database update
dotnet run
```

### If database connection fails:
- Verify SQL Server/LocalDB is running
- Check connection string in `apps/api/appsettings.json`
- Run `dotnet ef database update` again

### If no test data appears:
- Check database seeding in `apps/api/Data/DbContext.cs`
- May need to run database migrations again
- Verify test user credentials are seeded

---

## 📋 Test Completion Checklist

- [ ] Development environment starts successfully
- [ ] User can log in with valid credentials
- [ ] Dashboard displays orders correctly
- [ ] Mobile navigation works properly  
- [ ] User profile shows correct information
- [ ] Logout functionality works
- [ ] Responsive design verified on multiple screen sizes
- [ ] All navigation menus function correctly
- [ ] Order filtering operates as expected
- [ ] ColorGarb branding is consistent throughout
- [ ] Error handling displays appropriate messages
- [ ] Security measures prevent unauthorized access

**Test Duration**: Approximately 30-45 minutes for complete happy path testing.

**Next Steps**: After confirming all Epic 1 features work correctly, the foundation is ready for Epic 2 development (Order Management and Timeline Features).