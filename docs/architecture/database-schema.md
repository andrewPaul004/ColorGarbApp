# Database Schema

```sql
-- Organizations table
CREATE TABLE Organizations (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(255) NOT NULL,
    Type NVARCHAR(50) NOT NULL CHECK (Type IN ('School', 'BoosterClub', 'Other')),
    ContactEmail NVARCHAR(255) NOT NULL,
    ContactPhone NVARCHAR(50),
    Address NVARCHAR(MAX), -- JSON object
    TaxId NVARCHAR(50),
    PaymentTerms NVARCHAR(100),
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Users table
CREATE TABLE Users (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Email NVARCHAR(255) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    FirstName NVARCHAR(100) NOT NULL,
    LastName NVARCHAR(100) NOT NULL,
    PhoneNumber NVARCHAR(50),
    Role NVARCHAR(50) NOT NULL CHECK (Role IN ('Director', 'Finance', 'ColorGarbStaff')),
    OrganizationId UNIQUEIDENTIFIER,
    IsActive BIT NOT NULL DEFAULT 1,
    LastLoginAt DATETIME2,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    FOREIGN KEY (OrganizationId) REFERENCES Organizations(Id)
);

-- Orders table
CREATE TABLE Orders (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    OrderNumber NVARCHAR(50) NOT NULL UNIQUE,
    OrganizationId UNIQUEIDENTIFIER NOT NULL,
    Description NVARCHAR(500) NOT NULL,
    CurrentStage NVARCHAR(50) NOT NULL DEFAULT 'DesignProposal',
    OriginalShipDate DATETIME2 NOT NULL,
    CurrentShipDate DATETIME2 NOT NULL,
    TotalAmount DECIMAL(10,2) NOT NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (Status IN ('Active', 'Completed', 'Cancelled')),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    FOREIGN KEY (OrganizationId) REFERENCES Organizations(Id),
    INDEX IX_Orders_Organization (OrganizationId),
    INDEX IX_Orders_Status_Stage (Status, CurrentStage)
);

-- Order stage history for timeline tracking
CREATE TABLE OrderStageHistory (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    OrderId UNIQUEIDENTIFIER NOT NULL,
    Stage NVARCHAR(50) NOT NULL,
    EnteredAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedBy UNIQUEIDENTIFIER NOT NULL,
    Notes NVARCHAR(1000),
    PreviousShipDate DATETIME2,
    NewShipDate DATETIME2,
    ChangeReason NVARCHAR(255),
    
    FOREIGN KEY (OrderId) REFERENCES Orders(Id) ON DELETE CASCADE,
    FOREIGN KEY (UpdatedBy) REFERENCES Users(Id),
    INDEX IX_OrderStageHistory_Order (OrderId)
);

-- Measurements table
CREATE TABLE Measurements (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    OrderId UNIQUEIDENTIFIER NOT NULL,
    PerformerName NVARCHAR(255) NOT NULL,
    MeasurementData NVARCHAR(MAX) NOT NULL, -- JSON object
    SuggestedSize NVARCHAR(50),
    ApprovedSize NVARCHAR(50),
    Status NVARCHAR(50) NOT NULL DEFAULT 'Submitted' CHECK (Status IN ('Submitted', 'Mapped', 'Approved', 'Rejected')),
    SubmittedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ApprovedAt DATETIME2,
    ApprovedBy UNIQUEIDENTIFIER,
    
    FOREIGN KEY (OrderId) REFERENCES Orders(Id) ON DELETE CASCADE,
    FOREIGN KEY (ApprovedBy) REFERENCES Users(Id),
    INDEX IX_Measurements_Order (OrderId),
    INDEX IX_Measurements_Status (Status)
);

-- Payments table
CREATE TABLE Payments (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    OrderId UNIQUEIDENTIFIER NOT NULL,
    Amount DECIMAL(10,2) NOT NULL,
    Method NVARCHAR(50) NOT NULL CHECK (Method IN ('CreditCard', 'ACH', 'Check', 'PurchaseOrder')),
    Status NVARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (Status IN ('Pending', 'Approved', 'Completed', 'Failed', 'Refunded')),
    PurchaseOrderNumber NVARCHAR(100),
    StripePaymentIntentId NVARCHAR(255),
    TransactionId NVARCHAR(255),
    ProcessedAt DATETIME2,
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    FOREIGN KEY (OrderId) REFERENCES Orders(Id) ON DELETE CASCADE,
    INDEX IX_Payments_Order (OrderId),
    INDEX IX_Payments_Status (Status)
);

-- Payment approvals for workflow tracking
CREATE TABLE PaymentApprovals (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    PaymentId UNIQUEIDENTIFIER NOT NULL,
    ApproverId UNIQUEIDENTIFIER NOT NULL,
    Status NVARCHAR(50) NOT NULL CHECK (Status IN ('Pending', 'Approved', 'Rejected')),
    Notes NVARCHAR(500),
    ApprovedAt DATETIME2,
    
    FOREIGN KEY (PaymentId) REFERENCES Payments(Id) ON DELETE CASCADE,
    FOREIGN KEY (ApproverId) REFERENCES Users(Id),
    INDEX IX_PaymentApprovals_Payment (PaymentId)
);

-- Messages table for order communication
CREATE TABLE Messages (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    OrderId UNIQUEIDENTIFIER NOT NULL,
    SenderId UNIQUEIDENTIFIER NOT NULL,
    Content NVARCHAR(MAX) NOT NULL,
    Attachments NVARCHAR(MAX), -- JSON array of file references
    SentAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    ReadAt DATETIME2,
    
    FOREIGN KEY (OrderId) REFERENCES Orders(Id) ON DELETE CASCADE,
    FOREIGN KEY (SenderId) REFERENCES Users(Id),
    INDEX IX_Messages_Order_Date (OrderId, SentAt DESC)
);

-- Notification preferences
CREATE TABLE NotificationPreferences (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    UserId UNIQUEIDENTIFIER NOT NULL,
    EmailEnabled BIT NOT NULL DEFAULT 1,
    SmsEnabled BIT NOT NULL DEFAULT 0,
    NotificationTypes NVARCHAR(MAX) NOT NULL, -- JSON array
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    INDEX IX_NotificationPreferences_User (UserId)
);

-- Documents table for proofs, contracts, etc.
CREATE TABLE Documents (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    OrderId UNIQUEIDENTIFIER NOT NULL,
    FileName NVARCHAR(255) NOT NULL,
    FileType NVARCHAR(50) NOT NULL,
    BlobStorageUrl NVARCHAR(500) NOT NULL,
    DocumentType NVARCHAR(50) NOT NULL CHECK (DocumentType IN ('Proof', 'Contract', 'Measurement', 'Invoice', 'Other')),
    Version INT NOT NULL DEFAULT 1,
    UploadedBy UNIQUEIDENTIFIER NOT NULL,
    UploadedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    IsActive BIT NOT NULL DEFAULT 1,
    
    FOREIGN KEY (OrderId) REFERENCES Orders(Id) ON DELETE CASCADE,
    FOREIGN KEY (UploadedBy) REFERENCES Users(Id),
    INDEX IX_Documents_Order_Type (OrderId, DocumentType)
);

-- Create indexes for performance
CREATE INDEX IX_Users_Organization ON Users(OrganizationId) WHERE OrganizationId IS NOT NULL;
CREATE INDEX IX_Users_Email ON Users(Email);
CREATE INDEX IX_Orders_CurrentStage ON Orders(CurrentStage);
CREATE INDEX IX_Orders_ShipDate ON Orders(CurrentShipDate);

-- Row-level security for organization isolation
ALTER TABLE Orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE Measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE Payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE Messages ENABLE ROW LEVEL SECURITY;

-- Security policies ensure users only see their organization's data
CREATE SECURITY POLICY OrganizationIsolation_Orders ON Orders
    ADD FILTER PREDICATE (
        OrganizationId = CAST(SESSION_CONTEXT(N'OrganizationId') AS UNIQUEIDENTIFIER)
        OR CAST(SESSION_CONTEXT(N'Role') AS NVARCHAR(50)) = 'ColorGarbStaff'
    );
```
