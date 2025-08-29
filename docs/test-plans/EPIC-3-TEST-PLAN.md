# Epic 3 Testing Plan: Communication & Notification System

**Epic Goal:** Test the automated notification system and message center to verify elimination of manual communication overhead while providing transparent, timely updates to clients throughout the order process.

**Test Scope:** Manual testing of all Epic 3 stories (3.1-3.4) and their integration points.

## Test Environment Setup
- **Test Data**: Use existing orders in system with different organizations and user roles
- **User Accounts**: Director, Finance, ColorGarb Staff roles  
- **Communication Channels**: Valid email addresses and phone numbers for testing
- **Navigation Note**: No order creation interface exists - testing uses existing orders only

## Story 3.1: Automated Email Notifications

### Test 3.1.1: Order Milestone Email Triggers

**Test Case: Order Creation Email (Backend/API Testing)**
1. **Setup:**
   - **Log in as ColorGarb Staff user:**
     - Navigate to: http://localhost:5173/auth/login
     - Enter staff credentials (username: staff@colorgarb.com, password: [get from team])
     - Verify you see "ColorGarbStaff" role chip in navigation
   
   - **Ensure test client has email notifications enabled:**
     - Option A: Use existing client with notifications enabled
     - Option B: Set up test client notifications:
       1. Log out of staff account
       2. Log in as test client (username: testclient@organization.com)
       3. Navigate to: http://localhost:5173/profile
       4. Scroll to "Notification Preferences" section
       5. Verify "Email Notifications" toggle is ON (blue/enabled)
       6. Verify "Order creation/updates" milestone has email enabled
       7. Log back out and return to staff account

2. **Execution (Backend/API Options):**
   
   **Option A - API Testing (if API endpoints available):**
   - Open development tools (F12) → Network tab
   - Use Postman or curl to POST to: http://localhost:5000/api/orders
   - Example payload:
     ```json
     {
       "organizationId": "test-org-id",
       "description": "Test Costume Order - Email Notification",
       "quantity": 5,
       "dueDate": "2024-12-31",
       "clientContactEmail": "testclient@organization.com"
     }
     ```
   - Include Authorization header with staff JWT token
   
   **Option B - Database Direct (SQL Server):**
   - Open SQL Server Management Studio or Azure Data Studio
   - Connect to: ColorGarbDb (connection string from appsettings.json)
   - Execute SQL:
     ```sql
     INSERT INTO Orders (Id, OrganizationId, OrderNumber, Description, Quantity, DueDate, CreatedAt, CreatedBy)
     VALUES (NEWID(), '[TEST-ORG-ID]', 'CG-2024-TEST', 'Test Email Notification Order', 5, '2024-12-31', GETDATE(), '[STAFF-USER-ID]')
     ```
   
   **Option C - Trigger Email Manually:**
   - Access email service configuration in appsettings.json
   - Find email notification service class (likely EmailNotificationService.cs)
   - Use debugging to trigger notification manually

3. **Verification:**
   - **Check client's email inbox:**
     - Use email client or webmail (Gmail, Outlook, etc.)
     - Look for email from: notifications@colorgarb.com (or configured sender)
     - Subject line format: "New Order Created - [Order Number]"
     - Email should arrive within 1-2 minutes of order creation
   
   - **Verify email content contains:**
     - Order number (format: CG-2024-###)
     - Order description exactly as entered
     - Due date in readable format
     - Client organization name
     - "View Order" button or link
     - ColorGarb branding/logo
   
   - **Test portal link functionality:**
     - Click "View Order" link in email
     - Should redirect to: http://localhost:5173/orders/[order-id]
     - If not logged in, should redirect to: http://localhost:5173/auth/login
     - After login, should automatically redirect back to order page
     - Order page should display all order details correctly

**Expected Result:** Client receives professional email within 1-2 minutes with correct order details and functional portal link.

**Troubleshooting if email not received:**
- Check application logs for email service errors
- Verify SMTP configuration in appsettings.json
- Check spam/junk folder
- Confirm email service is running (check application output for email service startup messages)

---

**Test Case: Measurements Due Email**
1. **Setup:**
   - Use existing order from previous test
   - Verify order is in "Measurements Needed" stage

2. **Execution:**
   - As ColorGarb Staff, navigate to order detail page
   - Click "Request Measurements" button
   - Select performers requiring measurements
   - Add custom measurement instructions (optional)
   - Click "Send Measurement Request"

3. **Verification:**
   - Check client email for "Measurements Required" notification
   - Verify email includes:
     - Performer names requiring measurements
     - Measurement deadline date
     - Link to measurement upload page
     - ColorGarb contact information
   - Test measurement upload link functionality

**Expected Result:** Client receives measurement request email with clear instructions and functional upload link.

---

**Test Case: Production Start Notification**
1. **Setup:**
   - Use order with approved measurements
   - Ensure order is ready for production stage

2. **Execution:**
   - As ColorGarb Staff, navigate to order timeline
   - Update order stage to "Production Planning"
   - Add production start date
   - Click "Update Stage" button

3. **Verification:**
   - Check client email for "Production Started" notification
   - Verify email contains:
     - Production start confirmation
     - Estimated completion timeline
     - Updated ship date (if changed)
     - Link to track progress

**Expected Result:** Client receives production notification with timeline updates.

---

### Test 3.1.2: Email Notification Preferences

**Test Case: Accessing Notification Preferences**
1. **Setup:**
   - Log in as client user (Director role)
   - Ensure user profile is complete

2. **Execution:**
   - Click user profile avatar (top-right corner)
   - Select "Profile Settings" from dropdown menu
   - Navigate to Profile page ("/profile")
   - Look for "Notification Preferences" section/component

3. **Verification:**
   - Confirm presence of comprehensive notification interface with:
     - Global email/SMS toggles
     - Milestone-specific settings for:
       * Measurements Due
       * Proof Approval  
       * Production Start
       * Shipping
       * Delivery
   - Verify frequency options: Immediate, Daily Summary, Weekly Summary
   - Check phone verification interface for SMS
   - Verify Settings and SMS History tabs

**Expected Result:** User can access comprehensive notification preference interface with granular milestone controls.

---

**Test Case: Toggle Email Notifications Off**
1. **Setup:**
   - Access notification preferences (from previous test)
   - Ensure all notifications currently enabled

2. **Execution:**
   - Toggle OFF "Order Updates" email notifications
   - Toggle OFF "Production Milestones" email notifications
   - Keep other notifications ON
   - Click "Save Preferences" button
   - Wait for confirmation message

3. **Verification:**
   - Verify success message appears: "Notification preferences updated"
   - Refresh page and confirm toggles remain OFF
   - Navigate to different page and return - verify settings persist

4. **Functional Test:**
   - Create new order update (as staff)
   - Confirm NO email sent for disabled notification types
   - Verify other enabled notifications still work

**Expected Result:** Disabled notifications are not sent; enabled notifications continue working.

---

**Test Case: Frequency Settings (Daily Digest)**
1. **Setup:**
   - Access notification preferences
   - Enable all notification types

2. **Execution:**
   - Change frequency from "Immediate" to "Daily Digest"
   - Select digest delivery time: "8:00 AM"
   - Click "Save Preferences"

3. **Verification:**
   - Create multiple order activities throughout the day:
     - Update order stage
     - Add message to order
     - Request measurements
   - Verify NO immediate emails are sent
   - Wait for next daily digest time (or simulate)
   - Check for single digest email containing all activities

**Expected Result:** Multiple activities bundled into single daily digest email.

---

### Test 3.1.3: Email Content and Delivery

**Test Case: Professional Branding Verification**
1. **Setup:**
   - Trigger any email notification (order creation recommended)
   - Use various email clients for testing (Gmail, Outlook, Apple Mail)

2. **Execution:**
   - Open received email in each email client
   - Check email header, body, and footer elements

3. **Verification - Header:**
   - ColorGarb logo displays correctly
   - "From" address: notifications@colorgarb.com
   - Subject line includes order number and clear action

4. **Verification - Body:**
   - Professional greeting with client's name
   - Clear, concise message content
   - Proper grammar and spelling
   - ColorGarb brand colors used appropriately
   - Call-to-action buttons are prominent and styled

5. **Verification - Footer:**
   - ColorGarb contact information
   - Physical address
   - Unsubscribe link present and styled
   - Social media links (if applicable)

**Expected Result:** Email maintains professional ColorGarb branding across all email clients.

---

**Test Case: Portal Link Authentication**
1. **Setup:**
   - Receive email notification with portal link
   - Ensure user is NOT currently logged into portal

2. **Execution:**
   - Click "View Order" link in email
   - Note redirect behavior

3. **Verification - Not Logged In:**
   - Redirects to login page
   - After login, automatically redirects to intended order page
   - Order displays correctly with full functionality

4. **Verification - Already Logged In:**
   - Log into portal in separate browser tab
   - Click email link
   - Verify direct navigation to order (no login required)

**Expected Result:** Portal links work seamlessly with proper authentication flow.

---

**Test Case: Mobile Email Rendering**
1. **Setup:**
   - Send test email notification
   - Access email on mobile devices: iOS (iPhone), Android

2. **Execution:**
   - Open email in mobile email apps:
     - iOS Mail app
     - Gmail mobile app
     - Outlook mobile app

3. **Verification:**
   - Text is readable without horizontal scrolling
   - Images scale appropriately to screen width
   - Buttons are touch-friendly (minimum 44px height)
   - Links are easily tappable
   - ColorGarb branding remains intact
   - No content gets cut off

**Expected Result:** Email displays properly on mobile devices with good user experience.

---

**Test Case: Unsubscribe Functionality**
1. **Setup:**
   - Receive any notification email
   - Identify unsubscribe link in footer

2. **Execution:**
   - Click "Unsubscribe" link
   - Complete unsubscribe process

3. **Verification - Unsubscribe Page:**
   - Loads ColorGarb-branded unsubscribe page
   - Shows current subscription preferences
   - Allows granular unsubscribe options (not all-or-nothing)
   - Includes option to manage preferences instead of full unsubscribe

4. **Verification - Process:**
   - Select specific notification types to disable
   - Click "Update Preferences" button
   - Receive confirmation message
   - Verify preferences updated in user account

5. **Verification - Functional Test:**
   - Trigger notifications for unsubscribed categories
   - Confirm NO emails sent for unsubscribed types
   - Verify other subscriptions still active

**Expected Result:** Granular unsubscribe process works correctly, updating user preferences without breaking other notifications.

### Story 3.1 Test Scenarios Summary:
- ✅ **TC-3.1.1**: Order milestone emails triggered correctly for all event types
- ✅ **TC-3.1.2**: Email notification preferences save and apply properly  
- ✅ **TC-3.1.3**: Professional branding consistent across email clients
- ✅ **TC-3.1.4**: Portal links authenticate and redirect correctly
- ✅ **TC-3.1.5**: Mobile email rendering responsive and functional
- ✅ **TC-3.1.6**: Unsubscribe process granular and updates preferences
- ✅ **TC-3.1.7**: Daily/weekly digest functionality consolidates notifications
- ✅ **TC-3.1.8**: Email delivery within 1 minute for immediate notifications

## Story 3.2: SMS Notification System

### Test 3.2.1: Phone Number Setup and Verification

**Test Case: Phone Number Verification Process**

**Prerequisites:**
- Test user account with Director or Finance role access
- Valid phone number for SMS testing
- Access to receive SMS messages on test phone

**Detailed Setup Steps:**
1. Navigate to: `http://localhost:5173/auth/login`
2. Login with client test credentials:
   - Username: `director@[test-org].com` (or `finance@[test-org].com`)
   - Password: `[obtain from development team]`
3. Navigate to: `http://localhost:5173/profile`
4. Locate "Notification Preferences" section on profile page
5. Confirm no phone number is currently verified (status should show "Not Verified" or empty)

**Step-by-Step Execution:**

**Step 1: Access SMS Settings**
1. In Notification Preferences section, find "SMS Notifications" toggle
2. Attempt to enable SMS notifications by clicking toggle to "ON"
3. System should display alert/warning message: "Phone verification required for SMS notifications"
4. Look for "Add Phone Number" or "Verify Phone" button in the alert
5. Click the verification button to open dialog

**Step 2: Phone Number Entry and Format Testing**
1. PhoneVerificationDialog opens with title "Verify Phone Number"
2. Test various phone number formats in sequence:

   **Test Valid US Formats:**
   - Enter: `(555) 123-4567` → Click "Validate" → Should accept
   - Clear field, enter: `555-123-4567` → Click "Validate" → Should accept  
   - Clear field, enter: `5551234567` → Click "Validate" → Should accept
   - Clear field, enter: `+1-555-123-4567` → Click "Validate" → Should accept

   **Test International Formats:**
   - Clear field, enter: `+44 20 7946 0958` → Click "Validate" → Should accept
   - Clear field, enter: `+61 2 9876 5432` → Click "Validate" → Should accept

   **Test Invalid Formats (should be rejected):**
   - Clear field, enter: `555-123` → Click "Validate" → Should show error "Invalid phone number format"
   - Clear field, enter: `abc-def-ghij` → Should show error "Phone number must contain only digits"
   - Clear field, enter: `555.123.4567` → Should show error "Use dashes or spaces for formatting"

**Step 3: Verification Code Request Process**
1. Enter valid phone number: `+1-555-123-4567`
2. Click "Send Verification Code" button
3. Observe dialog changes:
   - Button shows loading spinner: "Sending..."
   - Success message appears: "Verification code sent to +1-555-123-4567"
   - Code input field appears below phone number field
   - Countdown timer displays: "Code expires in 15:00"
   - "Resend Code" button becomes available (disabled for 60 seconds)

**Verification Checkpoints:**

**UI Verification:**
- Phone verification dialog opens with proper styling and ColorGarb branding
- Input field accepts phone number entry with real-time format validation
- Clear, specific error messages for each invalid format type
- Send code button only activates with valid phone number
- Dialog layout is mobile-responsive and accessible

**SMS Delivery Verification:**
- SMS arrives on test phone within 30 seconds
- SMS contains exactly 6 numeric digits (e.g., "123456")
- SMS sender shows as "ColorGarb" or recognizable service name
- SMS text includes:
  - "Your ColorGarb verification code: [123456]"
  - "Code expires in 15 minutes"
  - "Do not share this code with anyone"

**System State Verification:**
- SMS notifications toggle remains OFF/disabled until verification complete
- Dialog shows proper countdown timer (15:00, 14:59, 14:58...)
- Phone number field becomes read-only after code is sent
- System properly handles all tested phone number format variations

**Troubleshooting Notes:**
- If SMS not received: Check phone has signal, try "Resend Code" after 60 seconds
- If dialog doesn't open: Check browser console for errors, refresh page and retry
- If validation fails unexpectedly: Clear browser cache and restart browser

**Expected Result:** Phone verification dialog opens with comprehensive format validation, successful SMS delivery, and proper UI state management.

---

**Test Case: SMS Verification Process**

**Prerequisites:**
- Phone number added but unverified (from previous test case)
- Physical access to test phone for SMS reception
- PhoneVerificationDialog still open with code input field visible

**Detailed Step-by-Step Execution:**

**Step 1: Receive and Note Verification Code**
1. Check test phone for incoming SMS (should arrive within 30 seconds)
2. Open the SMS message from ColorGarb
3. Note the 6-digit verification code (e.g., "123456")
4. Verify SMS content includes all required elements:
   - Code format: exactly 6 numeric digits
   - Sender: "ColorGarb" or similar recognizable name
   - Message text: "Your ColorGarb verification code: 123456"
   - Expiration notice: "Code expires in 15 minutes"
   - Security warning: "Do not share this code with anyone"

**Step 2: Enter Verification Code**
1. Return to browser with PhoneVerificationDialog open
2. Locate "Verification Code" input field (should be visible after SMS sent)
3. Click in the verification code input field
4. Enter the 6-digit code exactly as received: `123456`
5. Verify input field shows the entered code clearly

**Step 3: Complete Verification Process**
1. Click "Verify Phone" button (should become enabled after code entry)
2. Observe loading state: button shows "Verifying..." with spinner
3. Wait for verification response (should complete within 5 seconds)

**Step 4: Verify Successful Completion**
1. Success message appears: "Phone number verified successfully!"
2. Dialog automatically closes after 2 seconds (or provides "Close" button)
3. Return to Notification Preferences page
4. Confirm phone number field now shows:
   - Phone number: `+1-555-123-4567`
   - Status: "Verified" with green checkmark icon
   - Verification date: current date/time

**Step 5: Confirm SMS Notifications Enabled**
1. SMS notifications toggle should now be set to "ON"
2. All SMS notification options should be available and configurable:
   - Order Status Updates
   - Payment Reminders  
   - Shipping Notifications
   - Urgent Messages
3. Frequency settings should be accessible (Immediate vs bundled)

**Verification Checkpoints:**

**SMS Content Verification:**
- SMS received within 30 seconds of request
- Code format is exactly 6 numeric digits (no letters, symbols, or spaces)
- ColorGarb branding clearly visible in sender name
- Message includes clear instructions and security warning
- Expiration time clearly stated (15 minutes)

**Code Entry Verification:**
- Verification code input field accepts all digits properly
- Field provides visual feedback (shows entered digits)
- "Verify Phone" button activates only after complete 6-digit entry
- System validates code format before sending verification request

**Success State Verification:**
- Verification completes successfully with correct code
- Phone status updates to "Verified" with visual confirmation
- SMS notifications become fully functional and configurable
- User can now receive SMS notifications for all enabled categories

**Error Handling Tests:**
1. **Wrong Code Test:**
   - Enter incorrect 6-digit code: `999999`
   - Click "Verify Phone" button
   - Should show error: "Invalid verification code. Please try again."
   - Should allow re-entry without requiring new SMS

2. **Expired Code Test:**
   - Wait for code expiration (15+ minutes)
   - Enter original valid code
   - Should show error: "Verification code has expired. Please request a new code."
   - Should provide "Resend Code" option

**Troubleshooting Scenarios:**
- **Code not received:** Click "Resend Code" button (available after 60 seconds)
- **Wrong code entered:** Clear field and re-enter, or request new code
- **Verification fails:** Check network connection, refresh page, try again
- **Dialog closes unexpectedly:** Refresh Profile page, SMS settings should remember verification status

**Expected Result:** Verification process completes successfully, phone status shows "Verified", and all SMS notification features become available for configuration.

---

**Test Case: Verification Code Expiration**
1. **Setup:**
   - Add new phone number
   - Request verification code but don't enter it

2. **Execution:**
   - Wait 16 minutes (past expiration)
   - Attempt to enter the original verification code
   - Observe error handling

3. **Verification:**
   - System rejects expired code with clear error message
   - "Resend Code" option appears
   - New verification code can be requested
   - Second code works within expiration window

**Expected Result:** Expired codes properly rejected with user-friendly error handling.

---

**Test Case: SMS Opt-in Compliance**
1. **Setup:**
   - Complete phone verification process
   - Reach SMS notification toggle options

2. **Execution:**
   - Attempt to enable SMS notifications
   - Read compliance messaging presented
   - Complete opt-in process

3. **Verification - Compliance Elements:**
   - Clear disclosure about SMS charges (carrier rates apply)
   - Frequency expectations ("up to 5 messages per order")
   - Opt-out instructions ("Reply STOP to unsubscribe")
   - ColorGarb contact information
   - Terms of service link
   - Privacy policy link
   - Required checkbox: "I agree to receive SMS notifications"

**Expected Result:** Full compliance with SMS marketing regulations and clear user consent.

---

### Test 3.2.2: SMS Delivery and Content

**Test Case: Critical Notification - Shipping Alert**
1. **Setup:**
   - Order ready for shipping
   - Client has SMS notifications enabled
   - Phone number verified

2. **Execution:**
   - As ColorGarb Staff, update order to "Shipped" status
   - Add tracking number: "1Z999AA1234567890"
   - Click "Update Status" and "Send Notifications"

3. **Verification - SMS Content:**
   - Message received within 2 minutes
   - Content includes:
     - Order number (CG-2024-001)
     - "Shipped" status confirmation
     - Tracking number
     - Portal link (short URL)
   - Total character count ≤ 160 characters
   - Professional, concise tone

4. **Verification - Link Functionality:**
   - Click portal link on mobile device
   - Verify redirect to order tracking page
   - Confirm tracking information displays correctly
   - Test on both iOS and Android devices

**Expected Result:** SMS delivered quickly with accurate shipping information and functional portal link.

---

**Test Case: Payment Due Notification**
1. **Setup:**
   - Order with outstanding balance
   - Payment due date approaching (within 48 hours)
   - SMS notifications enabled

2. **Execution:**
   - Trigger payment reminder (manually or via automated system)
   - Check SMS delivery

3. **Verification - SMS Content:**
   - Payment amount due clearly stated
   - Due date prominently displayed
   - Payment portal link included
   - Order reference number
   - Character count within limits

4. **Verification - Payment Link:**
   - Click payment link from SMS
   - Verify redirect to secure payment page
   - Confirm SSL certificate and secure connection
   - Test payment form accessibility on mobile

**Expected Result:** Payment reminder SMS clear and actionable with secure payment link.

---

**Test Case: Urgent Issue Notification**
1. **Setup:**
   - Order experiencing production delay or issue
   - Client contact marked as "Urgent" notification needed

2. **Execution:**
   - As ColorGarb Staff, create urgent message:
     - Subject: Production delay requiring client input
     - Priority: Urgent
     - Request immediate response
   - Send notification

3. **Verification:**
   - SMS sent immediately (not subject to digest settings)
   - Content conveys urgency appropriately
   - Includes direct contact information for immediate response
   - Portal link for detailed information
   - Follow-up email also sent automatically

**Expected Result:** Urgent notifications bypass normal delivery rules and clearly communicate priority.

---

### Test 3.2.3: SMS Opt-out and Rate Limiting

**Test Case: STOP Reply Functionality**
1. **Setup:**
   - Active SMS notifications enabled
   - Verified phone number receiving messages

2. **Execution:**
   - Reply "STOP" to any ColorGarb SMS
   - Wait for confirmation response
   - Trigger new notifications that would normally send SMS

3. **Verification - STOP Response:**
   - Receive immediate confirmation SMS
   - Message confirms unsubscription
   - Provides re-subscription instructions
   - References ColorGarb customer service

4. **Verification - Opt-out Effect:**
   - No further SMS messages sent
   - Email notifications continue (if enabled)
   - Account settings updated to show SMS disabled
   - User can re-enable through portal if desired

**Expected Result:** STOP replies immediately disable SMS with proper confirmation and re-subscription options.

---

**Test Case: Rate Limiting Prevention**
1. **Setup:**
   - Order with multiple activities occurring rapidly
   - SMS notifications enabled for all activity types

2. **Execution:**
   - Within 5-minute window, trigger multiple SMS-worthy events:
     - Update order stage
     - Add urgent message
     - Request additional information
     - Update shipping details
   - Monitor SMS delivery

3. **Verification:**
   - Maximum 1 SMS sent per 5-minute window
   - Additional activities queued or bundled
   - Most critical/urgent notification takes priority
   - Less urgent items held for next window or email
   - User informed of rate limiting (if applicable)

**Expected Result:** Rate limiting prevents SMS spam while ensuring critical communications get through.

---

**Test Case: International Phone Numbers**
1. **Setup:**
   - Test with various international formats:
     - UK: +44 20 7946 0958
     - Canada: +1 416 555 0123
     - Australia: +61 2 9876 5432

2. **Execution:**
   - Add each international number
   - Complete verification process
   - Test SMS delivery to each region

3. **Verification:**
   - System accepts valid international formats
   - Verification codes delivered successfully
   - SMS notifications work across regions
   - Proper country code handling
   - Time zone considerations for delivery timing

**Expected Result:** International SMS functionality works correctly with proper formatting and delivery.

### Story 3.2 Test Scenarios Summary:
- ✅ **TC-3.2.1**: Phone verification required and working for all valid formats
- ✅ **TC-3.2.2**: SMS compliance messaging complete and legally compliant
- ✅ **TC-3.2.3**: Critical notifications (shipping, payment, urgent) delivered promptly
- ✅ **TC-3.2.4**: SMS content concise (≤160 chars) with functional portal links
- ✅ **TC-3.2.5**: STOP reply immediately disables SMS with confirmation
- ✅ **TC-3.2.6**: Rate limiting prevents spam (max 1 SMS per 5 minutes)
- ✅ **TC-3.2.7**: International phone numbers supported with proper formatting
- ✅ **TC-3.2.8**: Verification code expiration and resend functionality working

## Story 3.3: Order-Specific Message Center

### Test 3.3.1: Message Thread Access and Navigation

**Test Case: Accessing Order Message Center**

**Prerequisites:**
- Test user account with Director role access  
- At least one existing order available for testing
- Order should have some existing message history if possible

**Detailed Setup Steps:**
1. Navigate to: `http://localhost:5173/auth/login`
2. Login with client Director credentials:
   - Username: `director@[test-org].com`
   - Password: `[obtain from development team]`
3. Navigate to: `http://localhost:5173/dashboard`
4. Confirm Dashboard page loads with order cards visible

**Step-by-Step Execution:**

**Step 1: Navigate to Order Detail**
1. On Dashboard, locate an order card (should show order number, description, status)
2. Click on the order card to navigate to Order Detail page
3. URL should change to: `http://localhost:5173/orders/[order-id]`
4. Wait for Order Detail page to fully load (watch for loading spinner to complete)

**Step 2: Locate Message Center Interface**
1. Scroll down on Order Detail page to find "Message Center" or "Communications" section
2. Look for one of these possible interface patterns:
   - **Always Visible**: Message center displayed as part of the page layout
   - **Toggle Panel**: "View Messages" button or similar to expand message center
   - **Quick Actions Section**: Message center access in "Quick Actions" area
3. If toggle/button exists, click to open message center interface

**Step 3: Message Center Component Inspection**
1. Once message center is accessible, observe the layout structure:
   - **Header Section**: Should show order context (order number, description)
   - **Message History Area**: Central scrollable area for message list
   - **Input Section**: Bottom area with message composer and send functionality
   - **Search/Filter**: Look for search interface (may be collapsible)

**Verification Checkpoints:**

**Interface Element Verification:**
1. **Order Context Header:**
   - Order number prominently displayed: "Order CG-2024-001"
   - Order description visible: "Band Uniforms - Spring Performance"
   - Current order status shown: "Production Planning" or similar
   
2. **Message Composer (Bottom Section):**
   - Large text input field for message entry
   - "Attach File" button with paperclip or upload icon
   - "Send Message" button clearly labeled and styled
   - Character count indicator (if implemented)
   - Input field placeholder text: "Type your message here..."

3. **Message List (Central Area):**
   - Messages display in chronological order (oldest at top, newest at bottom)
   - Each message shows: sender name, role badge, timestamp, content
   - Visual distinction between sent (right-aligned) and received (left-aligned) messages
   - Attachment indicators for messages with files

4. **Search Functionality:**
   - Search input field with magnifying glass icon
   - "Search Messages" placeholder text
   - Search results highlighting (if search is performed)

**Functional Verification:**
1. **Order Isolation Test:**
   - Note current order ID from URL: `/orders/[current-order-id]`
   - Navigate to different order: go back to Dashboard, click different order card
   - Confirm message center shows different/no messages for different order
   - Messages should be completely isolated per order

2. **Interface Responsiveness:**
   - Resize browser window to test mobile responsiveness
   - Message center should adapt layout appropriately
   - All buttons and input fields should remain accessible

**Navigation Test:**
1. Click browser back button to return to Dashboard
2. Navigate to same order again via order card click  
3. Message center should retain same state and message history
4. No loss of message data or interface state

**Error Handling Verification:**
1. If message center fails to load:
   - Check browser console for JavaScript errors
   - Look for error messages in interface
   - Verify network requests complete successfully (check Network tab)

**Expected Result:** Message center loads correctly within Order Detail page, displays proper order context, shows all functional interface elements (composer, message list, search), and properly isolates messages to the specific order being viewed.

---

**Test Case: Message Thread Organization**
1. **Setup:**
   - Access message center for order with existing conversation history
   - Messages should exist from multiple participants (client, staff)

2. **Execution:**
   - Scroll through message history
   - Observe message organization and threading

3. **Verification - Message Display:**
   - Messages display in chronological order (newest at bottom)
   - Each message shows:
     - Sender name and role
     - Timestamp (format: "Mar 15, 2024 at 2:30 PM")
     - Message content with proper formatting
     - File attachments (if any) with download links
   - Visual distinction between sent/received messages
   - Staff messages clearly identified with ColorGarb branding

4. **Verification - Threading:**
   - Replies maintain conversation context
   - No messages from other orders mixed in
   - Message IDs unique and properly sequenced

**Expected Result:** Messages organized chronologically with clear sender identification and proper threading.

---

### Test 3.3.2: Message Sending and Receiving

**Test Case: Basic Text Message Sending (Client to Staff)**

**Prerequisites:**
- Test client user account (Director role)
- Active order with message center access
- Staff user account available for verification testing

**Detailed Setup Steps:**
1. Navigate to: `http://localhost:5173/auth/login`
2. Login as client user:
   - Username: `director@[test-org].com`
   - Password: `[obtain from team]`
3. Navigate to: `http://localhost:5173/dashboard`
4. Click on an order card to access: `http://localhost:5173/orders/[order-id]`
5. Locate and access the Message Center section (scroll down or click "View Messages")

**Step-by-Step Execution:**

**Step 1: Message Composition**
1. In the Message Center, locate the message input area at the bottom
2. Click in the message text input field (should show placeholder: "Type your message here...")
3. Input field should gain focus with cursor visible
4. Type test message exactly as shown:
   ```
   "I have a question about the measurements for performer John Doe. Can you please clarify the chest measurement requirements?"
   ```
5. Observe character count (if displayed) - should show approximately 125 characters

**Step 2: Send Message Process**
1. Locate "Send Message" button (should be enabled after text entry)
2. Click "Send Message" button
3. Observe immediate UI feedback:
   - Button shows "Sending..." text with loading spinner
   - Message input field becomes disabled/grayed out
   - Button becomes disabled during send process

**Step 3: Immediate Message Display Verification**
1. After successful send (within 2-3 seconds):
   - Message input field clears and returns to placeholder text
   - "Send Message" button returns to normal state and re-enables
   - New message appears in conversation thread
2. Verify message display properties:
   - Message appears aligned to right side (indicating "sent by you")
   - Sender name shows your user name
   - Timestamp displays current time in format: "Mar 15, 2024 at 3:45 PM"
   - Message content matches exactly what was typed
   - Message has appropriate visual styling (background color, borders)

**Step 4: Message Status Verification**
1. New message should show status indicators:
   - "Sent" status icon (check mark or similar)
   - No error indicators visible
   - Message appears in proper chronological position
2. Message thread automatically scrolls to show new message
3. Unread message count should update if displayed elsewhere

**Step 5: Staff Notification Verification**

**Part A: Switch to Staff Account**
1. Open new browser tab/window (keep client session active)
2. Navigate to: `http://localhost:5173/auth/login`  
3. Login as staff user:
   - Username: `staff@colorgarb.com`
   - Password: `[obtain from team]`
4. Navigate to: `http://localhost:5173/dashboard`

**Part B: Check for Notification**
1. Look for notification indicators:
   - Badge or count on navigation menu item for messages
   - Dashboard notification panel or alert
   - Browser notification (if enabled)
2. Check email inbox (if email notifications enabled):
   - Subject line should include order number and "New Message"
   - Email should contain message preview and portal link

**Part C: Access Message from Staff Side**  
1. Navigate to same order: `http://localhost:5173/orders/[same-order-id]`
2. Access Message Center for this order
3. Verify client message is visible:
   - Message appears aligned to left side (indicating "received")
   - Sender shows client's name and role
   - Same timestamp as sent from client side
   - Complete message content visible
   - Message marked as "unread" (if implemented)

**Verification Checkpoints:**

**Client-Side Verification:**
- Message input field properly accepts text entry
- Send button activates only when message has content
- Sending process provides clear visual feedback
- Message appears immediately in conversation thread
- Message formatting and timestamp are correct
- Interface returns to ready state for next message

**Staff-Side Verification:**
- Staff receives appropriate notification (email/badge/alert)
- Message is visible to staff user in same order's message center
- Message content, sender info, and timestamp are accurate
- Message properly displays as received/unread
- Staff can access full conversation context

**Error Handling Tests:**
1. **Network Failure Test**: Disconnect internet, send message, should show retry option
2. **Long Message Test**: Enter 1000+ character message, should handle gracefully
3. **Rapid Send Test**: Send multiple messages quickly, should queue properly

**Expected Result:** Message successfully sent from client to staff with immediate display in client interface, proper staff notification delivery, and accurate message display on staff side with complete conversation context maintained.

---

**Test Case: Staff Response to Client Message**
1. **Setup:**
   - Log in as ColorGarb Staff user
   - Access message center with unread client message
   - Prepare detailed response

2. **Execution:**
   - Read client's message about measurement clarification
   - Type detailed response: "For John Doe's chest measurement, please measure at the fullest part of the chest, arms at sides, measuring tape parallel to the floor. The measurement should be taken over a close-fitting shirt. Please include measurements in both inches and centimeters."
   - Click "Send" button

3. **Verification - Staff Response:**
   - Message sends successfully
   - Staff branding/identifier visible on message
   - Professional tone and helpful content
   - Message appears immediately in thread

4. **Verification - Client Notification:**
   - Switch to client user account
   - Check for staff response notification
   - Verify message visible in message center
   - Confirm proper threading with original question

**Expected Result:** Staff can respond effectively with proper notifications to client.

---

**Test Case: Message Character Limits and Formatting**
1. **Setup:**
   - Access message center as any user
   - Prepare various test messages

2. **Execution - Long Message Test:**
   - Type message exceeding 2000 characters
   - Attempt to send
   - Observe system behavior

3. **Execution - Formatting Test:**
   - Type message with:
     - Line breaks
     - Special characters (!@#$%^&*)
     - Numbers and measurements
     - URLs (if allowed)
   - Send and verify display

4. **Verification:**
   - Character limit enforced appropriately
   - Long messages handled gracefully (truncation or scrolling)
   - Special characters display correctly
   - Line breaks preserved in display
   - URLs converted to clickable links (if supported)

**Expected Result:** Message formatting and limits work correctly with good user experience.

---

### Test 3.3.3: File Attachment Functionality

**Test Case: Image File Upload**
1. **Setup:**
   - Access message center
   - Prepare test image files:
     - Small JPG (< 1MB): measurement_photo.jpg
     - Large PNG (5MB): costume_design.png
     - Invalid format: test_file.bmp

2. **Execution:**
   - Click file attachment button (paperclip icon)
   - Select small JPG file
   - Add message text: "Here's the measurement photo for John Doe"
   - Click "Send"

3. **Verification - Upload Process:**
   - Upload progress indicator shows
   - File uploads successfully
   - Thumbnail preview appears in message
   - File name and size displayed
   - Message sends with attachment

4. **Verification - File Display:**
   - Attached image displays as thumbnail
   - Click thumbnail opens full-size view
   - Download link available
   - File metadata visible (name, size, date)

**Expected Result:** Image files upload and display correctly with proper download functionality.

---

**Test Case: PDF Document Attachment**
1. **Setup:**
   - Prepare test PDF file: measurement_form.pdf (2MB)
   - Access message center

2. **Execution:**
   - Click attachment button
   - Select PDF file
   - Add message: "Completed measurement form attached"
   - Send message

3. **Verification:**
   - PDF uploads successfully
   - File icon displays (not thumbnail)
   - File name, size, and type shown
   - Download link functional
   - PDF opens correctly when downloaded

**Expected Result:** PDF attachments handled properly with appropriate display and download functionality.

---

**Test Case: File Size and Type Restrictions**
1. **Setup:**
   - Prepare various test files:
     - Oversized file (> 10MB): large_video.mp4
     - Restricted type: executable_file.exe
     - Multiple files for batch test

2. **Execution:**
   - Attempt to upload oversized file
   - Attempt to upload restricted file type
   - Try uploading multiple files simultaneously

3. **Verification - Size Limits:**
   - Files over limit rejected with clear error message
   - Error message specifies maximum allowed size
   - Alternative suggestions provided (compression, file splitting)

4. **Verification - Type Restrictions:**
   - Restricted file types blocked
   - Clear error message about allowed file types
   - List of permitted formats displayed

5. **Verification - Multiple Files:**
   - Multiple files can be attached to single message (if supported)
   - Each file processed individually
   - Clear indication of upload status for each file

**Expected Result:** File restrictions enforced appropriately with helpful error messaging.

---

### Test 3.3.4: Message Search and Filtering

**Test Case: Search by Content**
1. **Setup:**
   - Order with substantial message history (20+ messages)
   - Messages containing various keywords: "measurements", "shipping", "payment", "urgent"

2. **Execution:**
   - Locate search box in message center interface
   - Search for "measurements"
   - Review search results

3. **Verification:**
   - Search results highlight matching keyword
   - Results show relevant context (partial message content)
   - Clicking result navigates to full message in thread
   - Search is case-insensitive
   - Partial word matching works appropriately

**Expected Result:** Content search finds relevant messages and provides useful context.

---

**Test Case: Filter by Sender**
1. **Setup:**
   - Message thread with multiple participants (client, staff, different staff members)
   - Access message filtering options

2. **Execution:**
   - Apply filter: "Show only Staff messages"
   - Apply filter: "Show only Client messages"
   - Apply filter: "Show messages from [specific staff member]"

3. **Verification:**
   - Filtering works correctly for each option
   - Message count updates appropriately
   - Easy to clear filters and return to full view
   - Filter state maintained during session

**Expected Result:** Message filtering by sender works accurately and intuitively.

---

**Test Case: Date Range Filtering**
1. **Setup:**
   - Order with messages spanning several weeks/months
   - Access date filtering options

2. **Execution:**
   - Set date range: "Last 7 days"
   - Set date range: "Last 30 days"
   - Set custom date range: specific start and end dates

3. **Verification:**
   - Date filters show only messages within specified range
   - Date picker interface user-friendly
   - Results accurately reflect selected timeframe
   - Easy to adjust or clear date filters

**Expected Result:** Date filtering provides accurate results with intuitive interface.

---

### Test 3.3.5: Mobile Interface Testing

**Test Case: Mobile Responsive Design**
1. **Setup:**
   - Access message center on mobile devices:
     - iPhone (various sizes: SE, 12, 14 Pro)
     - Android phones (various screen sizes)
   - Test in both portrait and landscape orientations

2. **Execution:**
   - Navigate to order message center
   - Scroll through message history
   - Type and send new message
   - Attempt file attachment

3. **Verification - Layout:**
   - Messages display properly without horizontal scrolling
   - Text remains readable at mobile screen sizes
   - Touch targets are appropriate size (minimum 44px)
   - Interface elements don't overlap or get cut off
   - Navigation between order details and messages smooth

4. **Verification - Functionality:**
   - Virtual keyboard doesn't obscure message input
   - Send button remains accessible when typing
   - File attachment button easily tappable
   - Scroll behavior smooth and intuitive

**Expected Result:** Mobile interface fully responsive and functional across device types.

---

**Test Case: Mobile Camera Integration**
1. **Setup:**
   - Access message center on mobile device with camera
   - Ensure camera permissions granted

2. **Execution:**
   - Click file attachment button
   - Select "Take Photo" option (if available)
   - Use camera to take measurement photo
   - Add photo to message and send

3. **Verification:**
   - Camera interface launches correctly
   - Photo taken successfully
   - Image quality appropriate for measurements
   - Photo attaches to message properly
   - Upload process works on mobile connection

**Expected Result:** Camera integration provides smooth photo capture and attachment workflow.

---

**Test Case: Touch Gestures and Interactions**
1. **Setup:**
   - Message center open on touch device
   - Multiple messages visible on screen

2. **Execution:**
   - Test various touch interactions:
     - Tap to select message input field
     - Swipe to scroll through messages
     - Long press on message (context menu if available)
     - Pinch to zoom on attached images
     - Pull to refresh message list

3. **Verification:**
   - All touch gestures respond appropriately
   - No accidental actions triggered
   - Gesture feedback clear and immediate
   - Interface remains responsive during gestures

**Expected Result:** Touch interactions natural and responsive on mobile devices.

### Story 3.3 Test Scenarios Summary:
- ✅ **TC-3.3.1**: Message center accessible and properly isolated by order
- ✅ **TC-3.3.2**: Messages send/receive correctly between client and staff
- ✅ **TC-3.3.3**: File attachments (images, PDFs) upload and download properly
- ✅ **TC-3.3.4**: Message search by content, sender, and date range functional
- ✅ **TC-3.3.5**: Mobile interface fully responsive and touch-friendly
- ✅ **TC-3.3.6**: Camera integration for photo attachments works on mobile
- ✅ **TC-3.3.7**: File size/type restrictions enforced with clear error messages
- ✅ **TC-3.3.8**: Message formatting and character limits handled appropriately
- ✅ **TC-3.3.9**: Real-time message updates and notifications working
- ✅ **TC-3.3.10**: Message threading maintains conversation context properly

## Story 3.4: Communication Audit Trail

### Test 3.4.1: Audit Trail Access and Security

**Test Case: Staff Access to Communication Dashboard**
1. **Setup:**
   - Log in as ColorGarb Staff user
   - Ensure system has communication history across multiple orders and organizations
   - Verify staff user has appropriate permissions

2. **Execution:**
   - Navigate to main navigation menu
   - Look for "Communication Audit" or "Audit Trail" option
   - Click to access audit trail dashboard

3. **Verification - Interface Elements:**
   - Dashboard loads successfully
   - Summary statistics visible:
     - Total communications this month
     - Email delivery success rate
     - SMS delivery success rate
     - Messages by organization
   - Search and filter options prominent
   - Export functionality clearly available
   - Date range selector present

4. **Verification - Data Access:**
   - Communication records from ALL organizations visible
   - No restrictions on cross-organization viewing
   - All communication channels represented (email, SMS, messages)
   - Delivery status information included

**Expected Result:** Staff users have full access to comprehensive communication audit dashboard.

---

**Test Case: Client Access Restrictions**
1. **Setup:**
   - Log in as client user (Director role)
   - Attempt to access audit trail functionality

2. **Execution:**
   - Check main navigation for audit trail options
   - Attempt direct URL access to audit trail (if known)
   - Look for any communication history features in client interface

3. **Verification - Access Restrictions:**
   - No audit trail menu option visible to client users
   - Direct URL access blocked with appropriate error (403 Forbidden)
   - Error message professional and informative
   - Client redirected to appropriate authorized page

4. **Verification - Client Data View:**
   - Clients can only see their organization's communications
   - Communication history limited to order-specific context
   - No cross-organization data leakage
   - Proper role-based security enforced

**Expected Result:** Client users properly restricted from accessing audit trail with secure error handling.

---

**Test Case: Organization Data Isolation**
1. **Setup:**
   - Create test data with multiple organizations:
     - Organization A: 10 orders, 50+ communications
     - Organization B: 8 orders, 30+ communications  
     - Organization C: 5 orders, 20+ communications
   - Log in as staff user

2. **Execution:**
   - Access audit trail dashboard
   - Apply organization filter for "Organization A"
   - Review displayed results
   - Switch filter to "Organization B"
   - Compare result sets

3. **Verification:**
   - Organization filter works correctly
   - Results show only communications for selected organization
   - Communication counts match expected values
   - No cross-contamination between organizations
   - Filter can be cleared to show all organizations

**Expected Result:** Organization filtering provides accurate data isolation while maintaining staff oversight capabilities.

---

### Test 3.4.2: Communication Log Details and Status Tracking

**Test Case: Email Delivery Status Tracking**
1. **Setup:**
   - Trigger various email notifications to different recipients
   - Use valid and invalid email addresses for testing
   - Allow 30 minutes for delivery status updates

2. **Execution:**
   - Access audit trail dashboard
   - Search for recent email communications
   - Examine delivery status details

3. **Verification - Status Tracking:**
   - Each email shows clear delivery status:
     - **Queued**: Email prepared for sending
     - **Sent**: Email dispatched from server
     - **Delivered**: Confirmed delivery to recipient server
     - **Bounced**: Email returned/undeliverable
     - **Failed**: Sending error occurred
   - Timestamps recorded for each status change
   - Bounce/failure reasons provided when applicable
   - Retry attempts logged if applicable

4. **Verification - Additional Details:**
   - Recipient email address (masked for privacy if needed)
   - Subject line recorded
   - Email template used identified
   - Triggering event/action logged
   - Response tracking (opens/clicks) if implemented

**Expected Result:** Comprehensive email delivery tracking with detailed status information and timestamps.

---

**Test Case: SMS Delivery Status Tracking**
1. **Setup:**
   - Send SMS notifications to various phone numbers
   - Include valid numbers, invalid numbers, and opted-out numbers
   - Monitor over 15-minute period

2. **Execution:**
   - Access audit trail for SMS communications
   - Review delivery status for each SMS

3. **Verification - SMS Status Details:**
   - Status tracking includes:
     - **Queued**: SMS prepared for sending
     - **Sent**: SMS dispatched to carrier
     - **Delivered**: Confirmed delivery to device
     - **Failed**: Delivery failed (invalid number, network issue)
     - **Blocked**: Number opted out or blocked
   - Phone numbers displayed (last 4 digits for privacy)
   - SMS content preview (first 50 characters)
   - Character count and segment information
   - Carrier information if available

**Expected Result:** Detailed SMS delivery tracking with carrier-level status updates and privacy considerations.

---

**Test Case: Message Center Activity Logging**
1. **Setup:**
   - Exchange multiple messages in order message center
   - Include text messages and file attachments
   - Use different user roles (client, staff)

2. **Execution:**
   - Access audit trail dashboard
   - Search for message center communications
   - Review logged message activity

3. **Verification - Message Logs:**
   - Each message interaction logged:
     - Message sent/received events
     - Sender and recipient information
     - Message content (preview or full text)
     - Attachment details (file name, size, type)
     - Read receipts (if implemented)
   - Order context maintained in logs
   - Thread/conversation grouping clear

**Expected Result:** Complete message center activity logged with proper context and detail level.

---

### Test 3.4.3: Search and Filtering Functionality

**Test Case: Advanced Search Capabilities**
1. **Setup:**
   - Audit trail with substantial data (100+ communications)
   - Communications spanning 3+ months
   - Multiple communication types and organizations

2. **Execution - Content Search:**
   - Search for specific keywords in communication content
   - Search for email subjects containing "payment"
   - Search for SMS messages containing "shipped"
   - Search for messages with specific order numbers

3. **Verification:**
   - Search results accurate and comprehensive
   - Search highlights matching terms
   - Results ranked by relevance or chronologically
   - Search across all communication types simultaneously
   - Case-insensitive search functionality

**Expected Result:** Robust search functionality finds relevant communications across all channels and content.

---

**Test Case: Multi-Criteria Filtering**
1. **Setup:**
   - Access audit trail dashboard with full dataset
   - Prepare to test multiple filter combinations

2. **Execution:**
   - Apply date range filter: "Last 30 days"
   - Add communication type filter: "Email only"
   - Add organization filter: "Organization A"
   - Add delivery status filter: "Successfully delivered"
   - Apply all filters simultaneously

3. **Verification - Filter Combinations:**
   - Multiple filters work together correctly
   - Results meet ALL filter criteria
   - Filter logic uses AND operations appropriately
   - Easy to add/remove individual filters
   - Filter state clearly displayed to user
   - Results update dynamically as filters applied

4. **Verification - Filter Performance:**
   - Filtering happens quickly (< 3 seconds)
   - Large datasets handled efficiently
   - Pagination works with filtered results
   - Filter combinations don't break interface

**Expected Result:** Multi-criteria filtering provides accurate results with good performance and user experience.

---

**Test Case: Date Range and Time-Based Filtering**
1. **Setup:**
   - Communications spanning several months
   - Various time patterns (business hours, weekends, holidays)

2. **Execution:**
   - Test preset date ranges:
     - "Today"
     - "Last 7 days"
     - "Last 30 days"
     - "This month"
     - "Last month"
   - Test custom date range selection
   - Test time-of-day filtering (business hours only)

3. **Verification:**
   - Date filters accurately restrict results
   - Custom date picker functional and intuitive
   - Time zone handling correct for all users
   - Date range clearly displayed in interface
   - Results count updates with date changes

**Expected Result:** Flexible date/time filtering with accurate results and intuitive interface.

---

### Test 3.4.4: Export and Reporting Functionality

**Test Case: CSV Export Functionality**
1. **Setup:**
   - Apply specific filters to create targeted dataset
   - Ensure dataset includes various communication types
   - Prepare to test export with 100+ records

2. **Execution:**
   - Click "Export" button in audit trail dashboard
   - Select "CSV" format
   - Choose export options (date range, fields to include)
   - Initiate export process

3. **Verification - Export Process:**
   - Export starts immediately or queues appropriately
   - Progress indicator shown for large exports
   - Export completes without errors
   - Download link provided when ready
   - File downloads successfully

4. **Verification - CSV Content:**
   - File opens correctly in Excel/spreadsheet software
   - All expected columns present:
     - Timestamp
     - Communication Type
     - Organization
     - Recipient
     - Subject/Content Preview  
     - Delivery Status
     - Order Reference
   - Data matches dashboard display
   - No truncated or corrupted data
   - Proper CSV formatting maintained

**Expected Result:** CSV export produces complete, accurate data file suitable for analysis.

---

**Test Case: Excel Export with Formatting**
1. **Setup:**
   - Select substantial dataset for export
   - Choose Excel (.xlsx) format option

2. **Execution:**
   - Configure Excel export options
   - Include charts/graphs if available
   - Add summary statistics sheet
   - Generate export

3. **Verification - Excel Features:**
   - File opens correctly in Microsoft Excel
   - Data properly formatted with:
     - Column headers
     - Date formatting
     - Conditional formatting for status
     - Frozen header row
   - Multiple worksheets if applicable:
     - Main data sheet
     - Summary statistics
     - Charts/visualizations
   - File size reasonable for content

**Expected Result:** Excel export provides professionally formatted, analysis-ready spreadsheet.

---

**Test Case: PDF Report Generation**
1. **Setup:**
   - Select focused dataset (specific organization, date range)
   - Choose PDF report format

2. **Execution:**
   - Configure PDF report options:
     - Report title and date range
     - Summary statistics inclusion
     - Detail level selection
   - Generate PDF report

3. **Verification - PDF Content:**
   - Professional report formatting
   - ColorGarb branding and headers
   - Executive summary section
   - Detailed communication logs
   - Charts and graphs for key metrics
   - Page numbers and proper pagination
   - Readable fonts and layout

4. **Verification - PDF Quality:**
   - File size appropriate for content
   - Text searchable within PDF
   - Images/charts render clearly
   - Print quality acceptable

**Expected Result:** Professional PDF report suitable for management review and archival.

---

**Test Case: Large Dataset Export Handling**
1. **Setup:**
   - Create scenario with large dataset (1000+ communications)
   - Test system behavior under load

2. **Execution:**
   - Attempt export of very large dataset
   - Monitor system performance during export
   - Test various export formats with large data

3. **Verification - Performance:**
   - Export process handles large datasets gracefully
   - Background processing used for large exports
   - User notified of processing status
   - Email notification when export ready (if applicable)
   - System remains responsive during export

4. **Verification - Data Integrity:**
   - Complete dataset exported (no missing records)
   - Export file integrity maintained
   - No memory or timeout errors
   - Pagination or chunking handled correctly

**Expected Result:** Large dataset exports complete successfully without impacting system performance.

### Story 3.4 Test Scenarios Summary:
- ✅ **TC-3.4.1**: Staff users have full audit trail access; client users properly restricted
- ✅ **TC-3.4.2**: Organization data isolation enforced while maintaining staff oversight
- ✅ **TC-3.4.3**: Email delivery status tracked through all stages (queued/sent/delivered/bounced)
- ✅ **TC-3.4.4**: SMS delivery status includes carrier-level tracking and privacy protection
- ✅ **TC-3.4.5**: Message center activity fully logged with proper context and threading
- ✅ **TC-3.4.6**: Advanced search finds communications across all channels and content
- ✅ **TC-3.4.7**: Multi-criteria filtering works accurately with good performance
- ✅ **TC-3.4.8**: CSV export produces complete, analysis-ready data files
- ✅ **TC-3.4.9**: Excel export includes professional formatting and multiple worksheets
- ✅ **TC-3.4.10**: PDF reports provide executive-level summaries with ColorGarb branding
- ✅ **TC-3.4.11**: Large dataset exports handled efficiently with background processing

## Integration Testing Scenarios

### Integration Test 1: Complete Order Communication Journey

**Test Case: End-to-End Order Communication Flow**
1. **Setup:**
   - Create new test order with fresh data
   - Client user with email AND SMS notifications enabled
   - Staff user ready to respond
   - Clear audit trail to track all activities

2. **Execution Phase 1 - Order Creation:**
   - Staff creates new order for test client
   - Verify automated email notification sent immediately
   - Check SMS notification sent (if configured for order creation)
   - Confirm audit trail logs both notifications

3. **Execution Phase 2 - Client Inquiry:**
   - Client receives email notification
   - Client clicks portal link to access order
   - Client navigates to message center
   - Client sends message: "I have questions about the costume design requirements. Can you provide more details about the fabric choices?"

4. **Execution Phase 3 - Staff Response:**
   - Staff receives email notification of new client message
   - Staff accesses same order's message center
   - Staff responds with detailed fabric information
   - Staff attaches PDF document with fabric samples

5. **Execution Phase 4 - Measurement Request:**
   - Staff initiates measurement request through order timeline
   - System generates measurement request email to client
   - Email includes measurement upload link
   - Client receives notification within 1 minute

6. **Execution Phase 5 - Measurement Upload:**
   - Client clicks measurement upload link
   - Client uploads measurement photos via message center
   - Client includes message: "Here are the measurements for all 5 performers"
   - Staff receives notification of measurement upload

7. **Execution Phase 6 - Production Update:**
   - Staff updates order stage to "Production Started"
   - Automated email sent to client with production timeline
   - SMS sent with brief production start notification
   - Both notifications logged in audit trail

8. **Execution Phase 7 - Shipping Notification:**
   - Order status updated to "Shipped"
   - Tracking number added: "1Z999AA1234567890"
   - Automated email with detailed shipping info sent
   - SMS with brief shipping alert and tracking number sent
   - Client receives both notifications

9. **Verification - Complete Flow:**
   - All communications delivered successfully
   - Message center contains complete conversation thread
   - Email notifications professionally formatted
   - SMS notifications concise and informative
   - Portal links functional throughout process
   - File attachments uploaded/downloaded successfully
   - Audit trail captures every communication touchpoint
   - No duplicate or missed notifications
   - Timing appropriate for each communication type

**Expected Result:** Seamless communication flow from order creation to delivery with all systems working together correctly.

---

### Integration Test 2: Dynamic Notification Preference Changes

**Test Case: Mid-Order Preference Modifications**
1. **Setup:**
   - Active order in progress with ongoing communications
   - Client initially has all notification types enabled
   - Order currently in "Measurements" stage

2. **Execution Phase 1 - Initial State:**
   - Trigger measurement reminder notification
   - Verify both email and SMS sent successfully
   - Client receives both notification types

3. **Execution Phase 2 - Disable Email:**
   - Client accesses notification preferences
   - Disables email notifications for "Order Updates"
   - Keeps SMS notifications enabled
   - Saves preference changes

4. **Execution Phase 3 - Test Email Disabled:**
   - Staff adds comment to order requiring client attention
   - System should send SMS only (no email)
   - Verify SMS contains necessary information
   - Confirm no email notification sent

5. **Execution Phase 4 - Enable SMS, Add Phone:**
   - Client initially had no SMS capability
   - Client adds phone number: +1-555-123-4567
   - Complete SMS verification process
   - Enable SMS notifications for all order types

6. **Execution Phase 5 - Test New SMS:**
   - Staff updates order to next stage
   - System sends SMS to newly verified number
   - SMS includes order stage update information
   - Email also sent (if email notifications still enabled)

7. **Execution Phase 6 - Frequency Change:**
   - Client changes email frequency to "Daily Digest"
   - Multiple order activities occur throughout day
   - Verify individual emails NOT sent immediately
   - Confirm digest email sent at specified time

8. **Verification - Preference Adherence:**
   - Preference changes take effect immediately
   - No notifications sent to disabled channels
   - New phone number works correctly
   - Digest functionality consolidates notifications
   - Audit trail reflects preference changes
   - No system errors during preference transitions

**Expected Result:** Notification preferences dynamically control communication delivery without disrupting ongoing order processes.

---

### Integration Test 3: Cross-System Data Consistency

**Test Case: Audit Trail Integration Verification**
1. **Setup:**
   - Multiple orders across different organizations
   - Various communication activities planned
   - Staff user with audit trail access

2. **Execution - Generate Diverse Communications:**
   - Send 5 different email notification types
   - Send 3 different SMS notification types  
   - Exchange 10 messages through message center
   - Upload 4 file attachments
   - Change notification preferences 2 times

3. **Verification - Audit Trail Completeness:**
   - Access audit trail dashboard as staff user
   - Search for all communications from test period
   - Verify every communication activity logged:
     • Email notifications with delivery status
     • SMS notifications with delivery confirmation
     • Message center interactions (sent/received)
     • File attachment uploads/downloads
     • Preference changes with timestamps

4. **Verification - Data Accuracy:**
   - Timestamps match actual communication times
   - Delivery statuses accurate (sent/delivered/failed)
   - Organization isolation maintained
   - Communication content previews correct
   - File attachment metadata complete
   - No missing or duplicate entries

5. **Verification - Export Consistency:**
   - Export audit data to CSV
   - Compare export data with dashboard display
   - Verify export includes all logged communications
   - Check data integrity in exported file

**Expected Result:** Audit trail provides complete, accurate record of all communication activities across all systems.

---

### Integration Test 4: Role-Based Access Consistency

**Test Case: Security Integration Across Features**
1. **Setup:**
   - Multiple user accounts with different roles:
     • Client Director (Organization A)
     • Client Finance (Organization A)  
     • Client Director (Organization B)
     • ColorGarb Staff
   - Communications across multiple organizations

2. **Execution - Role-Based Testing:**
   - Test each user's access to:
     • Email notification preferences
     • SMS notification setup
     • Message center access
     • Audit trail functionality
     • Export capabilities

3. **Verification - Client Director (Org A):**
   - Can manage notification preferences for Org A
   - Can access message centers for Org A orders only
   - Cannot access audit trail dashboard
   - Cannot see communications from Org B
   - Can export own organization's message history

4. **Verification - Client Finance (Org A):**
   - Same restrictions as Director
   - Role-specific notification defaults (payment-focused)
   - Cannot modify other users' preferences

5. **Verification - Client Director (Org B):**
   - Completely isolated from Org A data
   - Cannot access Org A orders or messages
   - Own organization data fully accessible

6. **Verification - ColorGarb Staff:**
   - Full access to audit trail for all organizations
   - Can view all message centers across all orders
   - Can export comprehensive communication reports
   - Cannot modify client notification preferences directly
   - Can send messages on behalf of ColorGarb

**Expected Result:** Role-based security consistently enforced across all communication features with proper data isolation.

---

### Integration Test 5: Error Handling and Recovery

**Test Case: System Resilience Integration**
1. **Setup:**
   - Active order with ongoing communications
   - Prepared to simulate various error conditions

2. **Execution - Email Service Disruption:**
   - Temporarily disable email service (simulate outage)
   - Trigger email notifications
   - Verify system behavior and error handling
   - Re-enable email service
   - Confirm queued emails process correctly

3. **Execution - SMS Service Failure:**
   - Simulate SMS service unavailability
   - Attempt to send SMS notifications
   - Verify fallback mechanisms (email backup?)
   - Check error logging in audit trail

4. **Execution - File Upload Errors:**
   - Attempt oversized file upload
   - Try uploading restricted file types
   - Simulate network interruption during upload
   - Verify graceful error handling

5. **Execution - Database Connectivity Issues:**
   - Simulate brief database unavailability
   - Attempt various communication operations
   - Verify system recovery behavior
   - Check data consistency after recovery

6. **Verification - Error Recovery:**
   - No data loss during error conditions
   - User-friendly error messages displayed
   - System attempts appropriate retries
   - Audit trail logs error conditions
   - Normal operations resume after recovery
   - No duplicate notifications sent after recovery

**Expected Result:** Communication system demonstrates resilience with graceful error handling and proper recovery procedures.

### Integration Test Summary:
- ✅ **INT-1**: Complete order communication journey works end-to-end
- ✅ **INT-2**: Dynamic notification preferences honored across all channels
- ✅ **INT-3**: Audit trail captures all communication activities accurately
- ✅ **INT-4**: Role-based security consistent across all communication features
- ✅ **INT-5**: Error handling and recovery maintain system integrity
- ✅ **INT-6**: Cross-story data flows work seamlessly
- ✅ **INT-7**: Performance acceptable under realistic load conditions
- ✅ **INT-8**: Mobile functionality integrated properly with all features

## Performance & Load Testing

### High-Volume Scenarios
- **Message Center**: Test with 100+ messages per order
- **Audit Trail**: Search across 10,000+ communication records
- **Export**: Generate reports with large datasets
- **Notifications**: Verify rate limiting under load

### Mobile Performance
- Test message center performance on slower mobile networks
- Verify file upload progress indicators work properly
- Check responsive design across different screen sizes

## Compliance & Security Testing

### Data Privacy & Access Control
- Verify organization isolation (clients can't see other organizations)
- Test role-based restrictions for audit trail access
- Confirm communication data export follows security policies
- Validate unsubscribe and opt-out mechanisms work properly

## Critical Test Cases Summary

### High Priority Tests
1. **Complete order communication flow** (email → message → SMS)
2. **Phone verification and SMS opt-out process**
3. **File attachment security and access controls**
4. **Audit trail access restrictions by role**
5. **Mobile message center functionality**

### Medium Priority Tests
1. **Email template rendering** across email clients
2. **Export functionality** for large datasets
3. **Advanced search and filtering** accuracy
4. **Notification delivery retry** mechanisms
5. **Real-time message updates**

### Success Criteria
- ✅ All communication channels work end-to-end
- ✅ User preferences are respected consistently
- ✅ Mobile experience is fully functional
- ✅ Audit trail captures all communication accurately
- ✅ Security and compliance requirements met

## Test Execution Notes

**Recommended Test Order:**
1. Start with Story 3.3 (Message Center) - core implemented functionality
2. Move to Story 3.1 (Email Notifications via Profile) - notification preferences
3. Test Story 3.2 (SMS) - phone verification and SMS preferences  
4. Finish with Story 3.4 (Audit Trail) - if accessible by staff users
5. Run integration scenarios focusing on existing order workflows

**Test Data Requirements:**
- Multiple organizations with different user roles already in system
- **Existing orders** in various stages (no order creation UI available)
- Valid email addresses and phone numbers for notification testing
- Test file attachments for MessageCenter (various formats and sizes)

**Implementation Status Notes:**
- ✅ **MessageCenter**: Fully implemented in Order Detail pages
- ✅ **NotificationPreferences**: Complete implementation in Profile page
- ✅ **PhoneVerification**: Dialog and SMS verification implemented
- ✅ **CommunicationAudit**: Components exist but navigation may be limited
- ❌ **Order Creation UI**: Not implemented - testing uses existing orders only
- ⚠️ **Email/SMS Triggering**: May require backend/API testing for automation

**Navigation Corrections:**
- Dashboard ("/dashboard") → Click order cards → Order Detail ("/orders/{orderId}")
- Profile ("/profile") → NotificationPreferences component
- Communication Audit may require direct URL access or admin navigation

This updated test plan reflects the actual implemented functionality and correct navigation paths.