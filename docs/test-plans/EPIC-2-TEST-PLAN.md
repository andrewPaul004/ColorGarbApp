# Epic 2: Order Management & Progress Tracking - Comprehensive Test Plan

## Overview
This test plan covers comprehensive testing of Epic 2 features focusing on Order Management and Progress Tracking functionality. The epic implements a complete order visualization and management system for both clients and ColorGarb staff.

**Epic Goal:** Enable comprehensive order tracking with detailed workspace views, visual progress timelines, ship date management, and staff administrative tools.

**Features Covered:**
- Order Detail Workspace with comprehensive information display
- 13-Stage Progress Timeline with visual indicators
- Dual Ship Date Management with change history tracking
- Order Status Updates with staff administrative controls

---

## Prerequisites & Setup

### Local Development Setup
Ensure your development environment is properly configured with all dependencies installed.

**Required Components:**
- Node.js v18+ and npm
- .NET 8.0 SDK
- SQL Server LocalDB
- Git

### Starting the Application

1. **Terminal 1 - Backend API:**
   ```bash
   cd apps/api
   dotnet run
   ```
   Wait for: `Now listening on: https://localhost:5001`

2. **Terminal 2 - Frontend App:**
   ```bash
   cd apps/web
   npm run dev
   ```
   Wait for: `Local: http://localhost:3000`

### Access Points
- **Frontend Application:** http://localhost:3000
- **Backend API:** https://localhost:5001
- **API Documentation:** https://localhost:5001/swagger

---

## Happy Path Test Scenarios

### Test Scenario 1: Order Detail Workspace Navigation
**Story 2.1: Order Detail Workspace**

#### Test Order Selection and Navigation

1. **Navigate to Client Portal:**
   - Open http://localhost:3000
   - Login with band director credentials:
     - Email: `director@westfieldband.edu`
     - Password: `Test123!`
   - **Expected:** Dashboard loads showing order cards

2. **Access Order Detail:**
   - Click on any order card from the dashboard
   - **Expected:** Navigate to order detail page at `/orders/{orderId}`
   - **Expected:** Order detail workspace loads with complete information

3. **Verify Order Header Information:**
   - **Expected:** Order number, description, and current stage displayed
   - **Expected:** Original and current ship dates shown with proper formatting
   - **Expected:** Order status badge with appropriate color coding
   - **Expected:** Visual stage indicator matches current manufacturing phase

4. **Verify Order Summary Section:**
   - **Expected:** Product details and specifications displayed
   - **Expected:** Quantity information and pricing breakdown shown
   - **Expected:** Total amount and order creation timestamps visible

5. **Verify Contact and Shipping Information:**
   - **Expected:** Organization name and contact details displayed
   - **Expected:** Complete shipping address formatted properly
   - **Expected:** Primary contact email and phone number shown
   - **Expected:** Payment terms and organization type displayed

6. **Test Quick Action Buttons:**
   - **Expected:** Stage-appropriate action buttons displayed
   - Click "Submit Measurements" (if in Measurements stage)
   - **Expected:** Appropriate action modal or navigation occurs
   - **Expected:** "View Messages" and "Upload Documents" buttons functional

7. **Test Mobile Responsiveness:**
   - Open browser developer tools and switch to mobile view (375px)
   - **Expected:** Layout adapts to mobile screen with proper spacing
   - **Expected:** Touch-friendly interaction targets (minimum 44px)
   - **Expected:** Information sections stack vertically on small screens

**✅ Expected Result:** Complete order detail workspace with all information properly displayed and responsive design working across all device sizes.

### Test Scenario 2: 13-Stage Progress Timeline Display  
**Story 2.2: 13-Stage Progress Timeline**

#### Test Visual Timeline Component

1. **Access Order Detail with Timeline:**
   - From previous test scenario, ensure order detail page is loaded
   - **Expected:** OrderTimeline component visible within order workspace
   - **Expected:** All 13 stages displayed: Design Proposal, Proof Approval, Measurements, Production Planning, Cutting, Sewing, Quality Control, Finishing, Final Inspection, Packaging, Shipping Preparation, Ship Order, Delivery

2. **Verify Stage Status Indicators:**
   - **Expected:** Completed stages show green checkmark icons with timestamps
   - **Expected:** Current stage highlighted with primary color and border
   - **Expected:** Future stages appear greyed out with pending appearance
   - **Expected:** Stage progression follows logical manufacturing sequence

3. **Test Stage Descriptions and Context:**
   - Hover over each stage
   - **Expected:** Stage descriptions and estimated durations displayed
   - **Expected:** Appropriate context provided for each manufacturing phase

4. **Test Stage Interaction:**
   - Click/tap on different stages
   - **Expected:** Stage click handlers trigger with proper stage parameter
   - **Expected:** Console log shows clicked stage (development feature)
   - **Expected:** Visual feedback on hover and click interactions

5. **Verify Timeline Responsive Design:**
   - Switch to mobile view (375px width)
   - **Expected:** Timeline layout adapts to mobile constraints
   - **Expected:** Touch targets maintain minimum 44px height
   - **Expected:** Horizontal scrolling enabled if needed for mobile
   - **Expected:** Timeline remains visually clear and accessible

6. **Test with Different Order Stages:**
   - Navigate to orders in different manufacturing stages
   - **Expected:** Timeline correctly highlights current stage for each order
   - **Expected:** Completed vs. pending stages update appropriately
   - **Expected:** Stage history timestamps show proper chronological progression

**✅ Expected Result:** Visual 13-stage timeline with proper status indicators, responsive design, and interactive elements working correctly.

### Test Scenario 3: Dual Ship Date Management
**Story 2.3: Dual Ship Date Management**

#### Test Ship Date Display and Change History

1. **Verify Dual Date Display:**
   - On order detail page, locate ship date section
   - **Expected:** Original Ship Date displayed with proper label
   - **Expected:** Current Ship Date shown with conditional color coding
   - **Expected:** Date formatting follows locale-appropriate format (e.g., "Mar 15, 2024")

2. **Test Visual Change Indicators:**
   - **Expected:** No change indicator (green) when dates match
   - **Expected:** Delayed indicator (orange) when current date is later than original
   - **Expected:** Accelerated indicator (blue) when current date is earlier than original
   - **Expected:** Appropriate icons accompany change indicators

3. **Verify Change History Display:**
   - Look for change history section
   - **Expected:** Expandable history section available
   - **Expected:** All ship date changes listed chronologically
   - **Expected:** Each change shows: date, reason, who made the change
   - **Expected:** Reason codes properly displayed (material delay, design revision, etc.)

4. **Test History Expansion:**
   - Click expand/collapse button for change history
   - **Expected:** History section expands with smooth animation
   - **Expected:** Touch-friendly interaction on mobile devices
   - **Expected:** History data loads and displays properly

5. **Test Mobile Layout:**
   - Switch to mobile view (375px)
   - **Expected:** Ship dates stack vertically on small screens
   - **Expected:** Change history remains accessible and readable
   - **Expected:** Visual indicators maintain clarity on mobile

6. **Verify Date Formatting Consistency:**
   - Check date formatting across different locales if applicable
   - **Expected:** Consistent date format throughout application
   - **Expected:** Proper timezone handling and display

**✅ Expected Result:** Dual ship date display with visual change indicators and accessible change history working properly on all device sizes.

### Test Scenario 4: Order Status Updates (Staff Interface)
**Story 2.4: Order Status Updates - Backend API Testing**

#### Test Admin API Endpoints (Backend Phase 1)

1. **Setup API Testing:**
   - Open API client (Postman/Insomnia) or use Swagger UI at https://localhost:5001/swagger
   - Obtain ColorGarb staff JWT token for authentication
   - **Expected:** Access to admin endpoints requires proper staff authentication

2. **Test Admin Orders Listing:**
   - **GET** `/api/orders/admin/orders`
   - Headers: `Authorization: Bearer {staff_token}`
   - **Expected:** Returns paginated list of orders across all organizations
   - **Expected:** Response includes order details, organization info, and pagination metadata
   - **Expected:** Filtering by organization, status, and stage works properly

3. **Test Individual Order Update:**
   - **PATCH** `/api/orders/{orderId}/admin`
   - Headers: `Authorization: Bearer {staff_token}`
   - Body: `{ "stage": "Cutting", "reason": "Production scheduling" }`
   - **Expected:** Order stage updated successfully
   - **Expected:** Audit trail entry created with staff member attribution
   - **Expected:** Stage validation prevents invalid transitions

4. **Test Ship Date Update:**
   - **PATCH** `/api/orders/{orderId}/admin`
   - Body: `{ "shipDate": "2024-04-15", "reason": "Material delay" }`
   - **Expected:** Ship date updated with change reason recorded
   - **Expected:** Change history entry created
   - **Expected:** Automatic notification triggered (email service integration)

5. **Test Bulk Order Updates:**
   - **POST** `/api/orders/admin/orders/bulk-update`
   - Body: Array of order updates with multiple orderIds
   - **Expected:** Multiple orders updated in single operation
   - **Expected:** Partial success/failure handling for mixed results
   - **Expected:** Audit trail entries for all successful updates

6. **Test Production System Integration:**
   - Perform order updates and verify production tracking sync
   - **Expected:** External production system receives update notifications
   - **Expected:** Sync failures don't block core operations
   - **Expected:** Health monitoring tracks production system availability

7. **Verify Notification System:**
   - Update order stages and ship dates
   - **Expected:** Email notifications sent to organization contacts
   - **Expected:** Different notification content for delays vs. acceleration
   - **Expected:** Notification delivery status logged properly

8. **Test Authorization and Security:**
   - Attempt API calls without staff token
   - **Expected:** 401 Unauthorized response for missing authentication
   - Attempt API calls with client user token
   - **Expected:** 403 Forbidden response for insufficient privileges
   - **Expected:** Organization isolation bypassed correctly for staff users

**✅ Expected Result:** Complete backend API functionality for staff order management with proper security, notifications, and audit trails.

---

## Additional Verification Tests

### Security Verification

#### Authentication & Authorization Testing
1. **Client Portal Access Control:**
   - Attempt to access `/orders/{orderId}` without authentication
   - **Expected:** Redirect to login page
   - Login with client credentials and attempt to access order from different organization
   - **Expected:** 404 or access denied (organization isolation working)

2. **Staff Admin Access Control:**
   - Attempt admin API endpoints with client token
   - **Expected:** 403 Forbidden response
   - Verify staff can access orders across all organizations
   - **Expected:** Cross-organization access working for staff role

3. **JWT Token Security:**
   - Verify token expiration handling
   - Test with malformed or expired tokens
   - **Expected:** Proper error handling and security responses

#### Data Protection Testing
1. **Organization Isolation:**
   - Verify client users only see their organization's orders
   - Test API responses don't leak data from other organizations
   - **Expected:** Proper row-level security enforcement

### Error Handling Verification

#### Network Error Scenarios
1. **API Unavailability:**
   - Stop backend API server
   - Navigate to order detail pages
   - **Expected:** Graceful error handling with user-friendly messages
   - **Expected:** Loading states and error boundaries working properly

2. **Timeout Handling:**
   - Test with slow network conditions
   - **Expected:** Appropriate timeout messages and retry mechanisms

#### Data Error Scenarios
1. **Invalid Order Data:**
   - Test with orders having missing or invalid data
   - **Expected:** Graceful degradation and error handling
   - **Expected:** User interface remains functional despite data issues

2. **Stage Transition Validation:**
   - Attempt invalid stage transitions via API
   - **Expected:** Validation prevents impossible progressions
   - **Expected:** Clear error messages for validation failures

---

## Success Criteria Summary

### Story 2.1: Order Detail Workspace ✅
- [ ] Order detail page accessible from dashboard order links
- [ ] Complete order header with key information display
- [ ] Order summary section with product details and financial information
- [ ] Contact and shipping address information properly displayed
- [ ] Quick action buttons appropriate to current order stage
- [ ] Mobile-optimized responsive layout working correctly
- [ ] Breadcrumb navigation back to dashboard functional

### Story 2.2: 13-Stage Progress Timeline ✅
- [ ] Visual timeline displaying all 13 manufacturing stages in correct order
- [ ] Current stage highlighted with proper visual indicator
- [ ] Completed stages marked with checkmarks and timestamps
- [ ] Future stages shown as pending with appropriate styling
- [ ] Stage descriptions and estimated durations displayed
- [ ] Mobile-responsive timeline layout and interactions
- [ ] Stage click functionality working with proper callbacks

### Story 2.3: Dual Ship Date Management ✅
- [ ] Original and current ship dates displayed clearly
- [ ] Change history log showing all modifications with reasons
- [ ] Visual indicators for date changes (delays vs. acceleration)
- [ ] Expandable history interface with proper interaction
- [ ] Reason codes displayed for all ship date changes
- [ ] Locale-appropriate date formatting throughout
- [ ] Mobile-friendly ship date information display

### Story 2.4: Order Status Updates (Backend Phase 1) ✅
- [ ] Admin API endpoints requiring staff authentication
- [ ] Cross-organization order listing with filtering and pagination
- [ ] Individual order stage and ship date update functionality
- [ ] Bulk order update capabilities with proper error handling
- [ ] Comprehensive audit trail for all admin operations
- [ ] Production system integration with health monitoring
- [ ] Automatic notification system for order changes
- [ ] Stage progression validation preventing invalid transitions

---

## Troubleshooting

### Common Issues and Solutions

#### Application Startup Issues
**Issue:** Backend API fails to start with database connection error
**Solution:**
```bash
# Update database schema
cd apps/api
dotnet ef database update
```

**Issue:** Frontend displays authentication errors
**Solution:**
```bash
# Clear browser local storage and cookies
# Restart both frontend and backend
```

#### Order Data Issues
**Issue:** Order detail page shows "Order not found"
**Solution:**
- Verify order exists in database
- Check organization association for current user
- Confirm JWT token contains correct organization claim

**Issue:** Timeline displays incorrectly
**Solution:**
- Check order stage history data
- Verify stage enum values match frontend expectations
- Clear browser cache and refresh

#### API Testing Issues
**Issue:** Admin endpoints return 403 Forbidden
**Solution:**
- Verify JWT token contains ColorGarbStaff role claim
- Check token expiration and refresh if needed
- Confirm user is properly authenticated as staff member

**Issue:** Production system sync failures
**Solution:**
- Check production tracking service configuration
- Verify external system availability
- Review error logs for connection issues

### Database Reset Commands
If you need to reset test data:
```bash
cd apps/api
dotnet ef database drop --force
dotnet ef database update
dotnet run --seed-data
```

### Port Conflicts
If default ports are occupied:
- Frontend: Modify `vite.config.ts` to use different port
- Backend: Update `launchSettings.json` to use different ports

---

## Test Completion Checklist

### Pre-Test Verification ✅
- [ ] Development environment properly set up
- [ ] Both frontend and backend applications running
- [ ] Test user accounts available (client and staff)
- [ ] Database seeded with appropriate test data
- [ ] Browser developer tools ready for mobile testing

### Core Functionality Testing ✅
- [ ] Order detail workspace comprehensive testing complete
- [ ] 13-stage progress timeline verification complete
- [ ] Dual ship date management testing complete
- [ ] Backend admin API endpoints testing complete
- [ ] Mobile responsiveness verified across all features
- [ ] Security and authorization testing complete

### Integration Testing ✅
- [ ] End-to-end order viewing workflow tested
- [ ] Cross-component integration verified
- [ ] Error handling scenarios tested
- [ ] Performance and loading states verified

### Final Verification ✅
- [ ] All acceptance criteria validated
- [ ] User experience flows complete successfully
- [ ] Security measures properly implemented
- [ ] Documentation updated appropriately

---

## Test Duration
**Estimated Time:** 45-60 minutes for complete test execution
**Break-down:**
- Setup and preparation: 10 minutes
- Core functionality testing: 25-35 minutes  
- Security and error testing: 10 minutes
- Final verification and documentation: 5 minutes

## Next Steps
Upon successful completion of this test plan:
1. **Document any issues found** in individual story QA results
2. **Update quality gates** for each story based on test outcomes
3. **Prepare for Epic 2 demo** with stakeholders
4. **Plan any necessary bug fixes** or refinements
5. **Ready Epic 2 for production deployment** consideration

---

*This test plan is designed to ensure Epic 2 meets all acceptance criteria and provides a robust, user-friendly order management and tracking experience for both client users and ColorGarb staff members.*