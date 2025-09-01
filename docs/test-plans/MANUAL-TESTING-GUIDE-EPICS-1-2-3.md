# Manual Testing Guide: Epics 1, 2, and 3

**Document Version:** 1.0  
**Date:** August 29, 2025  
**Purpose:** Step-by-step manual testing instructions for all functionality  
**Estimated Time:** 4-6 hours for complete testing  

## Prerequisites

### Test Environment Setup
1. **Start the Application:**
   ```bash
   # Backend API
   cd apps/api
   dotnet run

   # Frontend Web App  
   cd apps/web
   npm run dev
   ```

2. **Verify Services:**
   - Database: Ensure LocalDB/SQL Server is running
   - Redis: Check Redis service is running (for rate limiting)
   - Email Service: Verify SendGrid configuration (or use development mode)

3. **Test Data Requirements:**
   - At least 2 organizations with sample orders
   - Test users with different roles (Director, Finance, ColorGarbStaff)
   - Sample orders in different stages

---

# Epic 1: Foundation & Authentication Infrastructure

## Test 1.1: Project Setup and Development Environment

### Basic Application Startup ✅ 
1. **Navigate to:** http://localhost:3000
2. **Verify:** Application loads without console errors
3. **Check:** Responsive design works (resize browser window)
4. **Test:** Hot reload works (make a small change and save)

**Expected Results:**
- Application loads within 3 seconds
- No console errors in browser dev tools
- Layout adapts to different screen sizes
- Changes appear without full page refresh

---

## Test 1.2: User Authentication System

### Login Functionality 🔐
1. **Navigate to:** http://localhost:3000/login
2. **Test Valid Login:**
   - Enter valid email and password
   - Click "Log In"
   - **Verify:** Redirected to dashboard

3. **Test Invalid Credentials:**
   - Enter invalid email/password
   - Click "Log In"  
   - **Verify:** Error message displays
   - **Verify:** No redirect occurs

4. **Test Form Validation:**
   - Leave email field empty → Submit
   - **Verify:** Validation error appears
   - Enter invalid email format → Submit
   - **Verify:** Email validation error appears

### Password Reset Flow 📧
1. **From login page:** Click "Forgot Password"
2. **Enter email address** → Click "Send Reset Link"
3. **Check:** Success message appears
4. **Check email/logs:** Password reset email sent
5. **Click reset link** (or navigate to reset URL)
6. **Enter new password** → Submit
7. **Verify:** Success message and redirect to login

### Account Lockout Protection 🔒
1. **Make 5 failed login attempts** with same email
2. **Verify:** Account locked message appears
3. **Wait 15 minutes** OR check database to confirm lockout
4. **Try login again** → Should work after lockout expires

### Session Management 🕐
1. **Login successfully**
2. **Check:** User remains logged in after page refresh
3. **Wait for token expiration** (or modify token expiry for testing)
4. **Verify:** Automatic logout occurs when token expires

**Test Checklist:**
- [X] Valid login works
- [X] Invalid login shows error
- [X] Form validation prevents empty/invalid inputs
- [ ] Password reset email sent
- [ ] Reset password functionality works
- [X] Account lockout after 5 failed attempts
- [X] Session persists across page refresh
- [X] Automatic logout on token expiration

---

## Test 1.3: Role-Based Access Control

### Test Different User Roles 👥
**Setup:** Create/use test accounts for each role:
- Director: `director@testschool.edu`
- Finance: `finance@testschool.edu`  
- ColorGarbStaff: `staff@colorgarb.com`

### Director Role Testing 👔
1. **Login as Director**
2. **Verify Dashboard Access:**
   - See only own organization's orders
   - No admin menu items visible
3. **Test Navigation:**
   - Can access Orders, Profile, Messages
   - Cannot access Admin sections
4. **Test Order Access:**
   - Can view all orders for organization
   - Can send messages about orders

### Finance Role Testing 💰
1. **Login as Finance User**
2. **Verify Limited Access:**
   - See same organization's orders as Director
   - May have restricted views (based on implementation)
3. **Test Permissions:**
   - Can access financial data
   - Cannot access admin functions

### ColorGarb Staff Testing 🏢
1. **Login as Staff Member**
2. **Verify Admin Access:**
   - Can see admin menu items
   - Can access cross-organization data
3. **Test Admin Functions:**
   - Navigate to Admin Dashboard
   - View orders from multiple organizations
   - Can update order status

### Permission Boundary Testing 🚫
1. **As Director:** Try to access `/admin` URL directly
   - **Verify:** Access denied or redirect
2. **As Finance:** Try to access restricted functions
   - **Verify:** Appropriate restrictions in place
3. **Try URL manipulation** for different roles
   - **Verify:** Backend enforces permissions

**Test Checklist:**
- [X] Director sees only organization orders
- [X] Finance has appropriate restrictions
- [X] ColorGarb Staff has admin access
- [X] Navigation menus show role-appropriate items
- [X] Direct URL access properly restricted
- [X] Backend APIs enforce role permissions

---

## Test 1.4: Basic Client Portal Framework

### Dashboard Functionality 📊
1. **Login as Director/Finance**
2. **Verify Dashboard Content:**
   - Orders display in card format
   - Only organization's orders visible
   - Order cards show: number, description, current stage
3. **Test Responsive Design:**
   - Resize window to mobile size
   - **Verify:** Cards stack properly on mobile

### Navigation Testing 🧭
1. **Test Desktop Navigation:**
   - All menu items clickable
   - Proper highlighting of current section
2. **Test Mobile Navigation:**
   - Hamburger menu appears on small screens
   - Menu items accessible via mobile menu
3. **Test Breadcrumbs:**
   - Navigate to order detail → Check breadcrumb trail
   - Click breadcrumb → Verify navigation back

### User Profile Section 👤
1. **Navigate to Profile/Account section**
2. **Verify Information Displayed:**
   - User name and email
   - Organization name and details
   - Account settings/preferences
3. **Test Profile Updates:**
   - Change notification preferences
   - Update contact information
   - **Verify:** Changes are saved

### Logout Functionality 🚪
1. **Click Logout button/link**
2. **Verify Complete Logout:**
   - Redirected to login page
   - Cannot access protected pages
   - Session storage cleared
   - Back button doesn't allow access

### Mobile Optimization 📱
1. **Test on Mobile Device or Browser Dev Tools:**
   - Use Chrome DevTools → Device emulation
   - Test multiple screen sizes (320px, 768px, 1024px)
2. **Verify Mobile Experience:**
   - Touch targets large enough (44px minimum)
   - Text readable without zoom
   - Navigation works with touch

**Test Checklist:**
- [X] Dashboard shows organization orders only
- [X] Order cards display correctly
- [X] Responsive design works on mobile
- [ ] Desktop navigation functional
- [ ] Mobile hamburger menu works
- [X] User profile displays correctly
- [X] Profile updates save properly
- [X] Logout clears session completely
- [X] Mobile touch interactions work

---

# Epic 2: Order Management & Progress Tracking

## Test 2.1: Order Detail Workspace

### Order Detail Access 📋
1. **From Dashboard:** Click on any order card
2. **Verify:** Navigate to order detail page (`/orders/{orderId}`)
3. **Check URL:** Ensure order ID is correct

### Order Header Information 📄
**Verify the following information displays:**
- [X] Order number
- [X] Order description  
- [X] Current stage with visual indicator
- [X] Original ship date
- [X] Current ship date
- [X] Order status (Active/Completed/etc.)

### Order Summary Section 💼
**Check order summary displays:**
- [X] Product details and specifications
- [X] Quantity information
- [X] Total amount and pricing breakdown
- [X] Order creation date
- [X] Last updated timestamp

### Contact Information Section 📞
**Verify contact section shows:**
- [X] Organization name
- [X] Shipping address (properly formatted)
- [X] Primary contact email
- [X] Contact phone number
- [X] Organization type

### Quick Action Buttons ⚡
1. **Check stage-specific buttons appear:**
   - For Measurements stage: "Submit Measurements" button
   - For all stages: "View Messages", "Upload Documents"
2. **Test button functionality:**
   - Click each available button
   - **Verify:** Appropriate action occurs (navigation/modal/etc.)

### Mobile Order Detail Testing 📱
1. **Use mobile viewport (375px width)**
2. **Verify:** All sections stack properly
3. **Test:** Touch interactions work
4. **Check:** Text remains readable

### Breadcrumb Navigation 🍞
1. **Verify breadcrumb shows:** Dashboard > Order [Order Number]
2. **Click "Dashboard"** → **Verify:** Return to dashboard
3. **Check:** Current page highlighted in breadcrumb

**Test Checklist:**
- [X] Order detail accessible from dashboard
- [X] All order information displays correctly
- [X] Summary section shows product/pricing details
- [X] Contact information properly formatted
- [X] Quick actions appropriate for order stage
- [X] Mobile layout optimized
- [X] Breadcrumb navigation functional

---

## Test 2.2: 13-Stage Progress Timeline

### Timeline Display 📈
**Access order detail page and verify timeline shows all 13 stages:**
1. Design Proposal
2. Proof Approval
3. Measurements
4. Production Planning
5. Cutting
6. Sewing
7. Quality Control
8. Finishing
9. Final Inspection
10. Packaging
11. Shipping Preparation
12. Ship Order
13. Delivery

### Stage Status Indicators 🎯
**Check visual indicators:**
- [X] **Completed stages:** Green checkmark, timestamp shown
- [X] **Current stage:** Highlighted with different color/border
- [X] **Future stages:** Gray/muted appearance

### Stage Interaction 🖱️
1. **Click on different stages**
2. **Verify:** Stage details display (modal/panel)
3. **Test:** Click handlers work for all stages
4. **Check:** Stage descriptions and estimated durations

### Mobile Timeline Testing 📱
1. **Switch to mobile viewport**
2. **Verify:** Timeline adapts to mobile layout
3. **Test:** Touch interactions work
4. **Check:** All stages remain accessible

### Timeline Data Accuracy 📊
1. **Compare with order current stage**
2. **Verify:** Current stage matches timeline highlight
3. **Check:** Completed stages have realistic timestamps
4. **Validate:** Stage progression makes sense

**Test Checklist:**
- [X] All 13 stages display in correct order
- [X] Current stage properly highlighted
- [X] Completed stages show checkmarks and timestamps
- [X] Future stages appear as pending
- [X] Stage descriptions display on interaction
- [X] Mobile timeline layout works
- [X] Timeline data matches order status

---

## Test 2.3: Dual Ship Date Management

### Ship Date Display 📅
**Verify ship date section shows:**
- [X] **Original Ship Date:** Initially promised delivery date
- [X] **Current Ship Date:** Latest revised delivery date
- [X] **Visual indicator** when dates differ (delay/acceleration)

### Change History Tracking 📋
1. **Look for change history section**
2. **If changes exist, verify:**
   - [X] All ship date modifications listed
   - [X] Change reasons provided
   - [X] Staff member who made changes identified
   - [X] Timestamps for each change

### Visual Change Indicators 🚨
**When ship dates differ, check:**
- [X] **Delayed orders:** Warning color/icon
- [X] **Accelerated orders:** Positive color/icon  
- [X] **No changes:** Neutral/success indicator

### Date Formatting 🌍
1. **Check date format** matches user locale
2. **Verify:** Dates are readable and consistent
3. **Test:** Different browser language settings (if applicable)

### Mobile Ship Date Display 📱
1. **Use mobile viewport**
2. **Verify:** Ship dates stack appropriately on mobile
3. **Test:** Change history remains accessible

### Notification Integration 📧
**If you have access to modify ship dates (as staff):**
1. **Update a ship date** with reason
2. **Check:** Client receives notification
3. **Verify:** Notification contains correct information

**Test Checklist:**
- [X] Original and current ship dates display
- [X] Visual indicators for date changes
- [X] Change history shows modifications
- [X] Change reasons and staff attribution visible
- [X] Date formatting appropriate
- [X] Mobile display optimized
- [ ] Notifications sent on ship date changes

---

## Test 2.4: Order Status Updates (Admin Functions)

### Admin Access Testing 👨‍💼
**Login as ColorGarb Staff user:**
1. **Navigate to Admin Dashboard** (`/admin`)
2. **Verify:** Access granted to admin interface
3. **Check:** Cross-organization order visibility

### Order Management Interface 📊
**From admin dashboard, verify you can:**
- [X] See orders from multiple organizations
- [X] Filter orders by organization
- [X] Sort orders by different criteria
- [ ] Search for specific orders

### Individual Order Updates ✏️
1. **Select an order for update**
2. **Test stage progression:**
   - Try updating to next stage → **Verify:** Update succeeds
   - Try invalid stage jump → **Verify:** Validation prevents it
3. **Test ship date updates:**
   - Modify ship date → **Verify:** Reason code required
   - Submit without reason → **Verify:** Validation error

### Bulk Order Operations 📦
**If bulk update functionality available:**
1. **Select multiple orders**
2. **Perform bulk stage update**
3. **Verify:** All selected orders updated
4. **Check:** Audit trail created for each order

### Validation Testing ❌
**Test business rule enforcement:**
- [X] Cannot skip stages (e.g., Design → Shipping)
- [X] Cannot go backwards without proper authorization
- [X] Ship date changes require reason codes
- [X] Future ship dates validate reasonably

### Audit Trail Verification 📝
1. **After making updates, check:**
   - [ ] All changes logged with staff attribution
   - [ ] Timestamps accurate
   - [ ] Change reasons recorded
   - [ ] Previous values preserved

### Client Notification Testing 📬
1. **Update order status as staff**
2. **Verify:** Client receives notification
3. **Check:** Notification content accurate
4. **Test:** Multiple notification types (email/SMS if configured)

**Test Checklist:**
- [X] Admin dashboard accessible to staff only
- [X] Cross-organization order visibility
- [X] Individual order updates work
- [X] Stage progression validation enforced
- [X] Ship date updates require reasons
- [X] Bulk operations function correctly
- [ ] Audit trail captures all changes
- [ ] Client notifications sent automatically

---

# Epic 3: Communication & Notification System

## Test 3.1: Automated Email Notifications

### Notification Preference Management ⚙️
1. **Navigate to User Profile/Settings**
2. **Find notification preferences section**
3. **Test preference updates:**
   - [ ] Enable/disable email notifications
   - [ ] Select specific milestones for notifications
   - [ ] Choose notification frequency (immediate/daily/weekly)
   - [ ] Save changes → **Verify:** Preferences persist

### Email Template Testing 📧
**If you can trigger notifications (as staff or through order updates):**
1. **Trigger a milestone notification**
2. **Check email content:**
   - [ ] Professional ColorGarb branding
   - [ ] Correct order information
   - [ ] Portal links work and authenticate
   - [ ] Mobile-friendly formatting
   - [ ] Unsubscribe link present

### Milestone Notification Testing 🎯
**Test different milestone types:**
- [ ] **Measurements Due:** When order reaches measurement stage
- [ ] **Proof Approval:** When proof is ready for review
- [ ] **Production Start:** When manufacturing begins
- [ ] **Shipping Updates:** When order ships

### Unsubscribe Functionality ❌
1. **Click unsubscribe link** in test email
2. **Verify:** Unsubscribe page loads
3. **Confirm unsubscribe** → **Check:** Preference updated
4. **Test:** Future notifications respect unsubscribe

### Mobile Email Testing 📱
1. **View email on mobile device** (or email client mobile view)
2. **Verify:** Email displays properly
3. **Test:** Links work on mobile
4. **Check:** Text readable without zoom

### Delivery Tracking 📈
**If admin access available:**
1. **Check notification history/delivery status**
2. **Verify:** Delivery confirmations recorded
3. **Test:** Failed delivery retry logic (if configurable)

**Test Checklist:**
- [ ] Notification preferences can be updated
- [ ] Email templates are professional and branded
- [ ] All milestone types trigger appropriate emails
- [ ] Portal links in emails work correctly
- [ ] Unsubscribe functionality works
- [ ] Emails are mobile-friendly
- [ ] Delivery status tracked properly

---

## Test 3.2: SMS Notification System

### Phone Number Verification 📱
1. **Navigate to notification preferences**
2. **Find SMS settings section**
3. **Test phone verification process:**
   - [ ] Enter phone number → **Verify:** Verification code sent
   - [ ] Enter correct code → **Verify:** Phone verified
   - [ ] Enter wrong code → **Verify:** Error message
   - [ ] Test code expiration (if time allows)

### SMS Preference Configuration 🔧
**After phone verification:**
- [ ] Enable SMS notifications
- [ ] Select critical notification types (shipping, urgent issues, payment due)
- [ ] Save preferences → **Verify:** Settings persist

### SMS Content Testing 💬
**If you can trigger SMS notifications:**
1. **Trigger critical notification** (order shipped, urgent issue)
2. **Check SMS content:**
   - [ ] Message under 160 characters
   - [ ] Contains order information
   - [ ] Includes portal link
   - [ ] Has opt-out instructions ("Reply STOP")

### Opt-out Testing ❌
1. **Reply "STOP" to SMS** (or test through admin interface)
2. **Verify:** SMS preferences disabled
3. **Test:** Future SMS notifications respect opt-out

### Rate Limiting Testing ⏱️
**If admin access available:**
1. **Try sending multiple SMS quickly**
2. **Verify:** Rate limiting prevents spam (1 SMS per 5 minutes per user)
3. **Check:** System protects against abuse

### Critical Notification Types 🚨
**Test different critical notification scenarios:**
- [ ] **Order Shipped:** Shipping confirmation with tracking
- [ ] **Urgent Issues:** Quality problems, delays requiring attention
- [ ] **Payment Due:** Payment reminders with portal link

**Test Checklist:**
- [ ] Phone number verification process works
- [ ] SMS preferences can be configured
- [ ] SMS content is concise and informative
- [ ] Portal links in SMS work correctly
- [ ] Opt-out via "STOP" reply functions
- [ ] Rate limiting prevents spam
- [ ] Critical notifications trigger appropriately

---

## Test 3.3: Order-Specific Message Center

### Message Thread Access 💬
1. **From order detail page:** Find message center section
2. **Or navigate to:** Messages section
3. **Verify:** Message threads organized by order
4. **Test:** Can access message history for each order

### Sending Messages ✍️
1. **Compose new message:**
   - [ ] Enter message text
   - [ ] Attach file (if supported)
   - [ ] Submit message
   - [ ] **Verify:** Message appears in thread

2. **Test file attachments:**
   - [ ] Attach image file → **Verify:** Upload succeeds
   - [ ] Attach document → **Verify:** Upload succeeds  
   - [ ] Try large file → **Verify:** Size limit enforced
   - [ ] Try invalid file type → **Verify:** Type restriction enforced

### Message History Display 📚
**Check message thread shows:**
- [ ] All messages in chronological order
- [ ] Sender identification (client vs. staff)
- [ ] Timestamps for each message
- [ ] File attachments with download links
- [ ] Message status indicators

### Unread Message Indicators 🔴
1. **Have staff send message** (or simulate)
2. **Check:** Unread indicator appears
3. **Read message** → **Verify:** Indicator clears
4. **Test:** Unread counts accurate across interface

### Message Search Functionality 🔍
1. **Access search feature** in message center
2. **Test search:**
   - [ ] Search message content
   - [ ] Filter by date range
   - [ ] Search within specific order thread
   - [ ] **Verify:** Search results accurate

### Mobile Messaging Interface 📱
1. **Use mobile viewport**
2. **Test mobile messaging:**
   - [ ] Message threads display properly
   - [ ] Message composition works
   - [ ] File upload works on mobile
   - [ ] Touch interactions responsive

### File Download Testing 📎
1. **Click on attached file**
2. **Verify:** File downloads correctly
3. **Test:** Different file types download properly
4. **Check:** File access restricted to authorized users

**Test Checklist:**
- [ ] Message threads organized by order
- [ ] Can send messages with file attachments
- [ ] Message history displays correctly
- [ ] Unread indicators function properly
- [ ] Search functionality works
- [ ] Mobile messaging interface optimized
- [ ] File attachments upload and download correctly

---

## Test 3.4: Communication Audit Trail (Staff Only)

### Audit Dashboard Access 📊
**Login as ColorGarb Staff:**
1. **Navigate to Communication Audit** (likely in admin section)
2. **Verify:** Can access audit trail dashboard
3. **Check:** Overview of all client communications

### Communication Log Search 🔍
1. **Test search functionality:**
   - [ ] Search by organization
   - [ ] Filter by communication type (Email/SMS/Message)
   - [ ] Filter by date range
   - [ ] Search message content
   - [ ] **Verify:** Search results accurate

2. **Test advanced filtering:**
   - [ ] Delivery status (sent/delivered/failed)
   - [ ] Sender/recipient filtering
   - [ ] Message type filtering

### Audit Trail Display 📋
**Verify audit logs show:**
- [ ] Complete communication history
- [ ] Email notifications with delivery status
- [ ] SMS notifications with delivery confirmation
- [ ] Message center conversations
- [ ] Timestamps and sender identification

### Export Functionality 📤
1. **Test export features:**
   - [ ] Export to CSV format
   - [ ] Export to Excel (if available)
   - [ ] Export with date range filter
   - [ ] **Verify:** Export contains expected data

2. **Check export content:**
   - [ ] All communications included
   - [ ] Proper formatting
   - [ ] Sensitive data handled appropriately

### Delivery Status Tracking 📈
**Check notification delivery tracking:**
- [ ] Email delivery status (sent/delivered/opened)
- [ ] SMS delivery confirmation
- [ ] Failed delivery tracking
- [ ] Retry attempt logging

### Role-Based Access Control 🔐
1. **Test access restrictions:**
   - [ ] Only ColorGarb Staff can access audit trail
   - [ ] Client users cannot access audit data
   - [ ] Organization data properly filtered for non-staff

2. **Test data isolation:**
   - [ ] Staff see all organization communications
   - [ ] Proper data boundaries maintained

**Test Checklist:**
- [ ] Audit dashboard accessible to staff only
- [ ] Communication search and filtering works
- [ ] Complete audit trail displayed
- [ ] Export functionality works correctly
- [ ] Delivery status tracking accurate
- [ ] Role-based access properly enforced

---

# Cross-Epic Integration Testing

## Complete User Journey Testing 🛤️

### Client User Complete Workflow
**Test complete client experience (30-45 minutes):**

1. **Authentication Flow:**
   - [ ] Login as Director
   - [ ] Dashboard loads with organization orders
   - [ ] Navigation works properly

2. **Order Management:**
   - [ ] Click order → Order detail opens
   - [ ] View 13-stage timeline
   - [ ] Check ship date information
   - [ ] Access order-specific messages

3. **Communication:**
   - [ ] Send message to ColorGarb staff
   - [ ] Configure notification preferences
   - [ ] Test email notification receipt
   - [ ] Test SMS verification and preferences

4. **Full Circle:**
   - [ ] Logout completely
   - [ ] Login again → Verify session/preferences persist

### Staff User Complete Workflow
**Test complete staff experience (45-60 minutes):**

1. **Administrative Access:**
   - [ ] Login as ColorGarb Staff
   - [ ] Access admin dashboard
   - [ ] View cross-organization orders

2. **Order Management:**
   - [ ] Update order stage → Verify client notification
   - [ ] Modify ship date → Verify notification sent
   - [ ] Perform bulk updates

3. **Communication Management:**
   - [ ] Respond to client messages
   - [ ] Access communication audit trail
   - [ ] Export communication records

4. **Audit and Compliance:**
   - [ ] Review audit trails for all actions
   - [ ] Verify all changes properly logged

### Performance Testing 🚀
**Basic performance validation:**

1. **Page Load Times:**
   - [ ] Dashboard loads within 3 seconds
   - [ ] Order detail loads within 2 seconds
   - [ ] Admin dashboard loads within 4 seconds

2. **User Experience:**
   - [ ] No noticeable delays in navigation
   - [ ] File uploads complete reasonably
   - [ ] Search results return quickly

3. **Mobile Performance:**
   - [ ] Mobile pages load within 4 seconds
   - [ ] Touch interactions responsive
   - [ ] No layout breaking on small screens

---

# Test Completion Checklist

## Epic 1 Completion ✅
- [ ] Authentication system fully functional
- [ ] Role-based access working correctly
- [ ] Dashboard and navigation operational
- [ ] Mobile responsiveness validated

## Epic 2 Completion ✅
- [ ] Order detail workspace complete
- [ ] 13-stage timeline accurate
- [ ] Ship date management functional
- [ ] Admin order updates working

## Epic 3 Completion ✅
- [ ] Email notifications configured and sending
- [ ] SMS system operational with verification
- [ ] Message center fully functional
- [ ] Audit trail accessible and complete

## Overall System Validation ✅
- [ ] Cross-epic integration working
- [ ] User workflows complete end-to-end
- [ ] Performance acceptable across all features
- [ ] Security and access control proper
- [ ] Mobile experience optimized

---

# Troubleshooting Common Issues

## Authentication Issues 🔐
- **Can't login:** Check database connection, verify user exists
- **Session expires quickly:** Check JWT token configuration
- **Password reset not working:** Verify email service configuration

## Order Management Issues 📋
- **Orders not showing:** Check organization isolation, database queries
- **Timeline incorrect:** Verify stage data and current stage logic
- **Admin updates failing:** Check role authorization, validation logic

## Communication Issues 📧
- **Emails not sending:** Check SendGrid configuration, API keys
- **SMS not working:** Verify Twilio setup, phone number format
- **Messages not appearing:** Check database queries, real-time updates

## Performance Issues 🐌
- **Slow loading:** Check database queries, index usage
- **Mobile performance:** Verify bundle sizes, image optimization
- **Search slow:** Check database indexes, query optimization

---

**Total Estimated Testing Time: 4-6 hours**

This manual testing guide covers all major functionality across the three epics. Follow the checklist format to systematically validate each feature and ensure comprehensive coverage of the ColorGarb Client Portal system.