# UI Integration Smoke Test Checklist

## Purpose
This checklist verifies that UI components are properly integrated into the application and accessible through normal user navigation flows. Use this **before** executing detailed test plans to ensure features are actually accessible.

## Instructions
- ✅ Mark items as complete when verified
- ❌ Mark items as failed with notes
- 🚫 Mark items as blocked if feature is not accessible

## Epic 3 Component Integration Verification

### Story 3.1: Email Notification Preferences

**Route**: `/profile`

- [ ] Navigate to `/profile` page
- [ ] Verify "Notification Preferences" section is visible
- [ ] Verify "Email Notifications" toggle is present
- [ ] Verify email milestone settings are accessible
- [ ] Test notification frequency options are selectable
- [ ] Confirm settings can be saved (click "Save Preferences")

**Navigation Path**: Dashboard → Profile (via user menu or direct URL)

**Failure Symptoms**:
- "Notification Preferences" section missing from profile page
- 404 error on `/profile` route
- Component import errors in browser console

---

### Story 3.2: SMS Notification System

**Route**: `/profile` (within Notification Preferences)

- [ ] Navigate to Notification Preferences section
- [ ] Verify "SMS Notifications" toggle is present
- [ ] Verify "Verify Phone" button appears when SMS enabled
- [ ] Click "Verify Phone" to open phone verification dialog
- [ ] Verify phone verification dialog opens successfully
- [ ] Check "SMS History" tab is accessible
- [ ] Verify SMS opt-out compliance messaging is displayed

**Navigation Path**: Dashboard → Profile → Notification Preferences → SMS Settings

**Failure Symptoms**:
- Phone verification dialog fails to open
- SMS History tab missing or broken
- Compliance messaging not displayed

---

### Story 3.3: Order-Specific Message Center

**Route**: `/orders/{orderId}` (within Order Detail page)

- [ ] Navigate to any order detail page
- [ ] Scroll to locate "Message Center" or "Communications" section
- [ ] Verify message center interface is visible
- [ ] Verify message composer (text input + Send button) is present
- [ ] Verify file attachment functionality is accessible
- [ ] Verify message history displays (if any existing messages)
- [ ] Test sending a message works (message appears in thread)

**Navigation Path**: Dashboard → Order Card Click → Order Detail → Message Center

**Failure Symptoms**:
- Message Center section missing from order pages
- MessageCenter component not imported
- Send message functionality broken

---

### Story 3.4: Communication Audit Trail

**Route**: `/communication-audit` or `/audit` (Staff only)

- [ ] **CRITICAL**: Verify route exists in App.tsx routing
- [ ] Navigate to communication audit page (as staff user)
- [ ] Verify audit trail dashboard loads
- [ ] Verify search interface is accessible
- [ ] Verify export functionality is present
- [ ] Test basic search functionality works
- [ ] Verify role-based access (clients cannot access)

**Navigation Path**: Dashboard → Staff Navigation → Communication Audit

**Failure Symptoms**:
- 404 error - route not configured
- Page exists but not accessible via navigation
- Access control not working properly

---

## General Integration Verification

### Component Loading
- [ ] No React component import errors in browser console
- [ ] No missing dependency errors
- [ ] All UI elements render without layout issues

### Navigation Flow
- [ ] All features accessible via documented navigation paths
- [ ] No broken links or 404 errors
- [ ] Back button works properly from all feature pages

### Responsive Design
- [ ] All components display properly on mobile devices
- [ ] Material-UI Grid layouts work correctly
- [ ] No horizontal scrolling issues

## Pre-Test Environment Verification

Before executing detailed test plans, verify:

1. **Application Starts**: `npm run dev` starts without errors
2. **Login Works**: Can authenticate with test credentials
3. **Dashboard Loads**: Main dashboard accessible after login
4. **Core Navigation**: Profile, Orders, and Admin sections accessible

## Failed Integration Recovery

If components fail integration verification:

1. **Check Import Statements**: Verify components are imported where needed
2. **Check Route Configuration**: Ensure routes are added to App.tsx
3. **Check Component Integration**: Verify components are rendered in target pages
4. **Check Props**: Ensure required props are passed correctly
5. **Check Console Errors**: Review browser console for import/runtime errors

## Escalation Criteria

**Block Testing** if:
- ❌ Core navigation paths are broken
- ❌ Major components missing from target pages
- ❌ Application fails to start or authenticate

**Proceed with Caution** if:
- ⚠️ Minor UI layout issues present
- ⚠️ Some features inaccessible but workarounds exist
- ⚠️ Non-critical console warnings present

## Epic 3 Integration Status

**Last Updated**: [Date]
**Verified By**: [QA Engineer Name]

**Component Status**:
- NotificationPreferences: ✅ Integrated (Fixed)
- MessageCenter: ✅ Integrated (Confirmed)  
- CommunicationAuditPage: ✅ Integrated (Fixed)
- PhoneVerificationDialog: ✅ Integrated (Confirmed)

**Integration Fixes Applied**:
1. ✅ Added CommunicationAuditPage route to App.tsx (`/communication-audit`)
2. ✅ Added navigation menu item for ColorGarbStaff users
3. ✅ Integration tests created for both components
4. ✅ All Epic 3 components now properly accessible through UI

**Next Actions**:
1. Run integration smoke tests to verify all components accessible
2. Proceed with detailed test plan execution
3. Update EPIC-3-TEST-PLAN.md with correct navigation paths