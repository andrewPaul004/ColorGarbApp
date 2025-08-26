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

1. **Setup API Testing Environment:**
   - Open API client (Postman/Insomnia) or use Swagger/OpenAPI UI
   - Access API documentation at: https://localhost:5001/openapi/v1.json or https://localhost:5001/scalar/v1
   - **Expected:** API documentation loads successfully with all endpoints visible
   
   **Obtain Staff Authentication Token:**
   - **POST** `/api/auth/login`
   - Body: 
     ```json
     {
       "email": "production@colorgarb.com",
       "password": "password123"
     }
     ```
   - **Expected:** Response status 200 with JWT token in response body
   - **Expected:** Token contains ColorGarbStaff role claim
   - Copy JWT token for use in subsequent requests

2. **Test Admin Orders Listing:**
   
   **Basic Orders Retrieval:**
   - **GET** `/api/orders/admin/orders`
   - Headers: `Authorization: Bearer {staff_token}`
   - **Expected Response:**
     - Status: 200 OK
     - Body contains array of orders from all organizations
     - Each order includes: id, orderNumber, organizationName, currentStage, totalAmount, currentShipDate
     - Pagination metadata: currentPage, totalPages, totalCount, hasNextPage
   
   **Test Filtering Parameters:**
   - **GET** `/api/orders/admin/orders?organizationId=AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA`
   - **Expected:** Only orders from Roosevelt High School returned
   
   - **GET** `/api/orders/admin/orders?stage=Fabric Cutting`
   - **Expected:** Only orders currently in Fabric Cutting stage returned
   
   - **GET** `/api/orders/admin/orders?paymentStatus=Pending`
   - **Expected:** Only orders with Pending payment status returned
   
   **Test Pagination:**
   - **GET** `/api/orders/admin/orders?page=1&pageSize=2`
   - **Expected:** Maximum 2 orders returned with proper pagination metadata
   - **Expected:** hasNextPage: true if more orders exist

3. **Test Individual Order Details:**
   
   **Get Specific Order for Admin:**
   - **GET** `/api/orders/admin/orders/{orderId}` (use Order ID from test data: 11111111-2222-3333-4444-555555555555)
   - Headers: `Authorization: Bearer {staff_token}`
   - **Expected Response:**
     - Status: 200 OK
     - Complete order details including organization info
     - Stage history with timestamps and staff attributions
     - Ship date change history with reasons
     - Current production status and notes

4. **Test Individual Order Stage Update:**
   
   **Valid Stage Progression:**
   - **PATCH** `/api/orders/11111111-2222-3333-4444-555555555555/admin/stage`
   - Headers: `Authorization: Bearer {staff_token}`, `Content-Type: application/json`
   - Body: 
     ```json
     {
       "newStage": "Initial Sewing",
       "reason": "Production scheduling - fabric cutting completed",
       "notes": "All fabric pieces cut and quality checked. Ready for sewing phase."
     }
     ```
   - **Expected Response:**
     - Status: 200 OK
     - Order currentStage updated to "Initial Sewing"
     - New entry added to OrderStageHistory table
     - Audit trail created with staff member ID and timestamp
   
   **Invalid Stage Progression Test:**
   - **PATCH** `/api/orders/11111111-2222-3333-4444-555555555555/admin/stage`
   - Body:
     ```json
     {
       "newStage": "Shipped",
       "reason": "Invalid test"
     }
     ```
   - **Expected Response:**
     - Status: 400 Bad Request
     - Error message: "Invalid stage progression from [current] to Shipped"
     - Order stage remains unchanged

5. **Test Ship Date Update:**
   
   **Update Current Ship Date:**
   - **PATCH** `/api/orders/11111111-2222-3333-4444-555555555555/admin/shipdate`
   - Headers: `Authorization: Bearer {staff_token}`, `Content-Type: application/json`
   - Body:
     ```json
     {
       "newShipDate": "2025-12-01T00:00:00.000Z",
       "reason": "Material delay - specialty fabric backordered",
       "changeType": "delay"
     }
     ```
   - **Expected Response:**
     - Status: 200 OK
     - Order currentShipDate updated to new date
     - OrderStageHistory entry created with ship date change details
     - ChangeReason and date change metadata recorded
   
   **Verify Change History:**
   - **GET** `/api/orders/11111111-2222-3333-4444-555555555555/admin/shipdate-history`
   - **Expected:** Array of all ship date changes with reasons and timestamps

6. **Test Bulk Order Updates:**
   
   **Multiple Order Stage Updates:**
   - **POST** `/api/orders/admin/bulk-update`
   - Headers: `Authorization: Bearer {staff_token}`, `Content-Type: application/json`
   - Body:
     ```json
     {
       "updates": [
         {
           "orderId": "22222222-3333-4444-5555-666666666666",
           "newStage": "Measurements",
           "reason": "Batch processing - measurements ready"
         },
         {
           "orderId": "33333333-4444-5555-6666-777777777777", 
           "newStage": "Fabric Sourcing",
           "reason": "Batch processing - designs approved"
         }
       ]
     }
     ```
   - **Expected Response:**
     - Status: 200 OK
     - Response includes success/failure status for each order
     - Successful updates create audit trail entries
     - Failed updates include specific error messages
   
   **Test Partial Failure Handling:**
   - Include one invalid order ID in bulk update request
   - **Expected:** Valid orders updated successfully, invalid ones return specific errors
   - **Expected:** Partial success response with detailed results array

7. **Test Production System Integration:**
   
   **Verify External System Notifications:**
   - Perform any order stage update from step 4
   - Check application logs or monitoring dashboard
   - **Expected:** Production tracking service called with order update
   - **Expected:** External system webhook/API call logged
   - **Expected:** Integration failure doesn't prevent core order update
   
   **Health Check Production Integration:**
   - **GET** `/api/admin/production-system/health`
   - **Expected:** Status of production system integration
   - **Expected:** Last successful sync timestamp
   - **Expected:** Error count and recent failure details if any

8. **Verify Email Notification System:**
   
   **Test Ship Date Change Notifications:**
   - Update ship date on any order (from step 5)
   - Check email service logs or test email inbox
   - **Expected:** Email sent to organization primary contact
   - **Expected:** Email contains order number, old/new dates, and reason
   - **Expected:** Different email templates for delays vs. accelerations
   
   **Test Stage Update Notifications:**
   - Update order stage to "Quality Control" or "Shipped"
   - **Expected:** Appropriate milestone notification email sent
   - **Expected:** Email delivery status logged in system

9. **Test Authorization and Security:**
   
   **Missing Authentication:**
   - **GET** `/api/orders/admin/orders` (without Authorization header)
   - **Expected Response:**
     - Status: 401 Unauthorized
     - Error message about missing authentication
   
   **Invalid/Expired Token:**
   - **GET** `/api/orders/admin/orders`
   - Headers: `Authorization: Bearer invalid_token_here`
   - **Expected Response:**
     - Status: 401 Unauthorized
     - Error message about invalid token
   
   **Insufficient Privileges (Client User Token):**
   - Login as client user (director@roosevelthigh.edu / password123)
   - Use client JWT token in admin endpoint
   - **GET** `/api/orders/admin/orders`
   - Headers: `Authorization: Bearer {client_token}`
   - **Expected Response:**
     - Status: 403 Forbidden
     - Error message about insufficient privileges
   
   **Cross-Organization Access Verification:**
   - Login as staff user
   - **GET** `/api/orders/admin/orders`
   - **Expected:** Returns orders from ALL organizations (bypassing isolation)
   - Verify orders from Roosevelt High School, Community Playhouse, etc. all appear

10. **Test Input Validation and Error Handling:**

    **Invalid Order ID Format:**
    - **GET** `/api/orders/admin/orders/invalid-guid-format`
    - **Expected Response:**
      - Status: 400 Bad Request
      - Error message about invalid GUID format
    
    **Non-existent Order ID:**
    - **GET** `/api/orders/admin/orders/99999999-9999-9999-9999-999999999999`
    - **Expected Response:**
      - Status: 404 Not Found
      - Error message about order not found
    
    **Invalid JSON in Request Body:**
    - **PATCH** `/api/orders/11111111-2222-3333-4444-555555555555/admin/stage`
    - Body: `{ invalid json format }`
    - **Expected Response:**
      - Status: 400 Bad Request
      - JSON parsing error message
    
    **Missing Required Fields:**
    - **PATCH** `/api/orders/11111111-2222-3333-4444-555555555555/admin/stage`
    - Body: `{ "reason": "Missing stage field" }`
    - **Expected Response:**
      - Status: 400 Bad Request
      - Validation error about required newStage field

11. **Performance and Load Testing:**

    **Large Order Set Retrieval:**
    - **GET** `/api/orders/admin/orders?pageSize=100`
    - **Expected:** Response time under 2 seconds
    - **Expected:** Proper pagination prevents excessive memory usage
    
    **Concurrent Bulk Updates:**
    - Submit multiple bulk update requests simultaneously
    - **Expected:** Proper database locking prevents conflicts
    - **Expected:** Each request processed independently

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