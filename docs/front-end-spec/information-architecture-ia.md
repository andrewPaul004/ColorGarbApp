# Information Architecture (IA)

## Site Map / Screen Inventory

```mermaid
graph TD
    A[Login Screen] --> B[Main Dashboard]
    B --> C[Order Detail]
    B --> D[Profile & Settings]
    
    C --> C1[Timeline View]
    C --> C2[Message Center]
    C --> C3[Measurements]
    C --> C4[Payments & PO]
    C --> C5[Proof Approval]
    C --> C6[Documents]
    
    C3 --> C3A[Individual Entry]
    C3 --> C3B[Bulk Upload]
    C3 --> C3C[Size Mapping]
    
    C4 --> C4A[Payment Processing]
    C4 --> C4B[PO Upload]
    C4 --> C4C[Payment History]
    
    C5 --> C5A[Design Proofs]
    C5 --> C5B[Sample Requests]
    C5 --> C5C[Approval History]
    
    B --> E[Admin Dashboard - Staff Only]
    E --> E1[All Client Orders]
    E --> E2[Communication Center]
    E --> E3[Production Updates]
```

## Navigation Structure

**Primary Navigation:** Bottom tab bar for mobile with Dashboard, Orders, Messages, Profile. Desktop shows horizontal navigation with same sections plus Admin access for ColorGarb staff.

**Secondary Navigation:** Context-sensitive action buttons within each order detail view. Breadcrumb navigation for desktop users navigating deep into order sections.

**Breadcrumb Strategy:** Mobile relies on back button and contextual headers. Desktop shows full breadcrumb path: Dashboard > Order #12345 > Measurements for clear navigation hierarchy.
