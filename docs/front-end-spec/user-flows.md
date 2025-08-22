# User Flows

## Order Status Check Flow

**User Goal:** Quickly check the current status of active orders and understand next steps

**Entry Points:** Login screen, dashboard refresh, notification links

**Success Criteria:** User sees current stage, timeline progress, and any required actions within 30 seconds

### Flow Diagram

```mermaid
graph TD
    A[User Login] --> B[Dashboard Load]
    B --> C{Active Orders?}
    C -->|Yes| D[Show Order List]
    C -->|No| E[Show Welcome Message]
    D --> F[User Selects Order]
    F --> G[Order Detail View]
    G --> H[Timeline Display]
    H --> I{Actions Required?}
    I -->|Yes| J[Highlight Required Actions]
    I -->|No| K[Show Current Progress]
    J --> L[User Takes Action]
    K --> M[User Reviews Status]
```

### Edge Cases & Error Handling:
- **Network timeout during dashboard load:** Show cached data with sync indicator
- **No active orders:** Display welcome message with contact information
- **Order data inconsistency:** Show last known status with refresh option
- **Required action deadline passed:** Highlight urgency and provide contact method

**Notes:** Flow optimized for mobile-first with minimal taps to reach critical information. Desktop version adds quick preview capabilities.

## Measurement Submission Flow

**User Goal:** Submit accurate measurements for all performers efficiently

**Entry Points:** Order detail page, notification link, dashboard measurement reminder

**Success Criteria:** All measurements validated and submitted with confirmation

### Flow Diagram

```mermaid
graph TD
    A[Access Measurements] --> B{Measurement Type?}
    B -->|Individual| C[Individual Form]
    B -->|Bulk Upload| D[Template Download]
    C --> E[Enter Performer Data]
    D --> F[Upload Spreadsheet]
    E --> G[Validate Measurements]
    F --> H[Preview Import Data]
    G --> I{Validation Pass?}
    H --> I
    I -->|Yes| J[Submit Measurements]
    I -->|No| K[Show Errors]
    K --> L[Correct Errors]
    L --> G
    J --> M[Confirmation Page]
```

### Edge Cases & Error Handling:
- **Invalid measurement ranges:** Show acceptable ranges with measurement guide
- **Incomplete performer list:** Allow partial submission with missing performer tracking
- **File upload failure:** Provide manual entry fallback option
- **Size mapping conflicts:** Route to ColorGarb staff for custom size consultation

**Notes:** Dual-path design accommodates both small programs (individual entry) and large programs (bulk upload) with appropriate validation for each method.

## Payment Processing Flow

**User Goal:** Complete secure payment for costume order following organization's financial policies

**Entry Points:** Order detail payment section, invoice notification, payment reminder

**Success Criteria:** Payment processed successfully with proper documentation and approval trail

### Flow Diagram

```mermaid
graph TD
    A[Access Payment Section] --> B[Review Payment Details]
    B --> C{Payment Method?}
    C -->|Credit Card| D[Card Payment Form]
    C -->|PO Required| E[Upload PO]
    C -->|ACH Transfer| F[Bank Details Form]
    E --> G[PO Validation]
    G --> H{Approval Required?}
    H -->|Yes| I[Route to Approver]
    H -->|No| J[Process Payment]
    D --> J
    F --> J
    I --> K[Approval Notification]
    K --> L{Approved?}
    L -->|Yes| J
    L -->|No| M[Rejection Notice]
    J --> N[Payment Confirmation]
```

### Edge Cases & Error Handling:
- **Payment processing failure:** Retry with alternative method options
- **PO number conflict:** Validation against existing PO database
- **Approval timeout:** Escalation to backup approver
- **Insufficient funds:** Clear error message with alternative payment options

**Notes:** Flow accommodates complex organizational approval workflows common in educational institutions while maintaining payment security standards.
