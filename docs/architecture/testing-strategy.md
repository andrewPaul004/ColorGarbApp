# Testing Strategy

## Testing Pyramid

```
E2E Tests (Playwright)
/                    \
Integration Tests     Component Tests
/            \              /          \
Backend API    Database    React       Hooks
   Tests        Tests     Components   Tests
```

## Test Organization

### Frontend Tests
```
apps/web/tests/
├── components/           # Component unit tests
│   ├── OrderTimeline.test.tsx
│   ├── MeasurementForm.test.tsx
│   └── PaymentForm.test.tsx
├── pages/               # Page integration tests
│   ├── Dashboard.test.tsx
│   └── OrderDetail.test.tsx
├── hooks/               # Custom hook tests
│   ├── useOrders.test.ts
│   └── useAuth.test.ts
├── services/            # API service tests
│   ├── orderService.test.ts
│   └── paymentService.test.ts
└── e2e/                 # End-to-end tests
    ├── order-workflow.spec.ts
    ├── payment-flow.spec.ts
    └── measurement-submission.spec.ts
```

### Backend Tests
```
apps/api/tests/
├── Unit/                # Unit tests
│   ├── Services/
│   │   ├── OrderServiceTests.cs
│   │   └── PaymentServiceTests.cs
│   ├── Controllers/
│   │   ├── OrdersControllerTests.cs
│   │   └── PaymentsControllerTests.cs
│   └── Repositories/
│       └── OrderRepositoryTests.cs
├── Integration/         # Integration tests
│   ├── ApiTests/
│   │   ├── OrdersApiTests.cs
│   │   └── PaymentsApiTests.cs
│   ├── DatabaseTests/
│   │   └── OrderIntegrationTests.cs
│   └── ExternalServices/
│       ├── StripeIntegrationTests.cs
│       └── SendGridIntegrationTests.cs
└── TestUtilities/       # Test helpers
    ├── TestWebApplicationFactory.cs
    ├── DatabaseFixture.cs
    └── MockServices/
```

### E2E Tests
```
apps/web/tests/e2e/
├── auth/                # Authentication flows
│   ├── login.spec.ts
│   └── role-access.spec.ts
├── orders/              # Order management flows
│   ├── order-status-check.spec.ts
│   ├── order-timeline.spec.ts
│   └── stage-updates.spec.ts
├── measurements/        # Measurement workflows
│   ├── individual-entry.spec.ts
│   ├── bulk-upload.spec.ts
│   └── size-approval.spec.ts
├── payments/            # Payment processing
│   ├── credit-card-payment.spec.ts
│   ├── po-upload.spec.ts
│   └── approval-workflow.spec.ts
└── communication/       # Message and notification flows
    ├── order-messages.spec.ts
    └── notification-delivery.spec.ts
```

## Test Examples

### Frontend Component Test
```typescript
// apps/web/tests/components/OrderTimeline.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { OrderTimeline } from '../../src/components/timeline/OrderTimeline';
import { OrderStage } from '../../src/types/order';

const mockStageHistory = [
  {
    stage: 'DesignProposal' as OrderStage,
    enteredAt: new Date('2023-01-01'),
    updatedBy: 'staff-user',
    notes: 'Initial design created'
  },
  {
    stage: 'ProofApproval' as OrderStage,
    enteredAt: new Date('2023-01-05'),
    updatedBy: 'client-user',
    notes: 'Proof approved by client'
  }
];

describe('OrderTimeline', () => {
  it('displays all 13 stages with correct status', () => {
    const onStageClick = jest.fn();
    
    render(
      <OrderTimeline
        orderId="test-order-id"
        currentStage="Measurements"
        stageHistory={mockStageHistory}
        onStageClick={onStageClick}
      />
    );

    // Check that all stages are rendered
    expect(screen.getByText('Design Proposal')).toBeInTheDocument();
    expect(screen.getByText('Proof Approval')).toBeInTheDocument();
    expect(screen.getByText('Measurements')).toBeInTheDocument();

    // Check stage status indicators
    expect(screen.getByTestId('stage-DesignProposal')).toHaveClass('completed');
    expect(screen.getByTestId('stage-ProofApproval')).toHaveClass('completed');
    expect(screen.getByTestId('stage-Measurements')).toHaveClass('current');
    expect(screen.getByTestId('stage-ProductionPlanning')).toHaveClass('pending');
  });

  it('calls onStageClick when stage is clicked', () => {
    const onStageClick = jest.fn();
    
    render(
      <OrderTimeline
        orderId="test-order-id"
        currentStage="Measurements"
        stageHistory={mockStageHistory}
        onStageClick={onStageClick}
      />
    );

    fireEvent.click(screen.getByTestId('stage-DesignProposal'));
    expect(onStageClick).toHaveBeenCalledWith('DesignProposal');
  });

  it('shows stage history details when expanded', () => {
    render(
      <OrderTimeline
        orderId="test-order-id"
        currentStage="Measurements"
        stageHistory={mockStageHistory}
        onStageClick={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('expand-DesignProposal'));
    expect(screen.getByText('Initial design created')).toBeInTheDocument();
    expect(screen.getByText('Jan 1, 2023')).toBeInTheDocument();
  });
});
```

### Backend API Test
```csharp
// apps/api/tests/Integration/ApiTests/OrdersApiTests.cs
[Collection("DatabaseCollection")]
public class OrdersApiTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public OrdersApiTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetOrders_WithValidOrganization_ReturnsOrderList()
    {
        // Arrange
        var organizationId = await SeedTestOrganization();
        var orderId = await SeedTestOrder(organizationId);
        
        var token = GenerateJwtToken(organizationId, "Director");
        _client.DefaultRequestHeaders.Authorization = 
            new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.GetAsync("/api/orders");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var orders = await response.Content.ReadFromJsonAsync<List<OrderDto>>();
        orders.Should().NotBeNull();
        orders.Should().HaveCount(1);
        orders.First().Id.Should().Be(orderId);
    }

    [Fact]
    public async Task GetOrders_WithDifferentOrganization_ReturnsEmptyList()
    {
        // Arrange
        var organizationId1 = await SeedTestOrganization();
        var organizationId2 = await SeedTestOrganization();
        await SeedTestOrder(organizationId1);
        
        var token = GenerateJwtToken(organizationId2, "Director");
        _client.DefaultRequestHeaders.Authorization = 
            new AuthenticationHeaderValue("Bearer", token);

        // Act
        var response = await _client.GetAsync("/api/orders");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var orders = await response.Content.ReadFromJsonAsync<List<OrderDto>>();
        orders.Should().NotBeNull();
        orders.Should().BeEmpty();
    }

    [Theory]
    [InlineData("Director")]
    [InlineData("Finance")]
    public async Task UpdateOrderStage_WithNonStaffRole_ReturnsForbidden(string role)
    {
        // Arrange
        var organizationId = await SeedTestOrganization();
        var orderId = await SeedTestOrder(organizationId);
        
        var token = GenerateJwtToken(organizationId, role);
        _client.DefaultRequestHeaders.Authorization = 
            new AuthenticationHeaderValue("Bearer", token);

        var updateRequest = new UpdateOrderStageRequest
        {
            Stage = "ProductionPlanning",
            ShipDate = DateTime.UtcNow.AddDays(30),
            Reason = "Ready for production"
        };

        // Act
        var response = await _client.PatchAsJsonAsync($"/api/orders/{orderId}", updateRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    private async Task<Guid> SeedTestOrganization()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        
        var organization = new Organization
        {
            Id = Guid.NewGuid(),
            Name = "Test School",
            Type = "School",
            ContactEmail = "test@testschool.edu",
            ContactPhone = "555-0123",
            Address = JsonSerializer.Serialize(new Address 
            { 
                Street1 = "123 Main St", 
                City = "Test City", 
                State = "TS", 
                ZipCode = "12345" 
            }),
            IsActive = true
        };
        
        context.Organizations.Add(organization);
        await context.SaveChangesAsync();
        
        return organization.Id;
    }
}
```

### E2E Test
```typescript
// apps/web/tests/e2e/orders/order-status-check.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Order Status Check Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as band director
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'director@testschool.edu');
    await page.fill('[data-testid="password"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    
    // Wait for dashboard to load
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('should display order list with current status', async ({ page }) => {
    // Check that orders are displayed
    await expect(page.locator('[data-testid="order-card"]')).toHaveCount(2);
    
    // Check first order details
    const firstOrder = page.locator('[data-testid="order-card"]').first();
    await expect(firstOrder.locator('[data-testid="order-number"]')).toContainText('CG-2023-001');
    await expect(firstOrder.locator('[data-testid="current-stage"]')).toContainText('Measurements');
    await expect(firstOrder.locator('[data-testid="ship-date"]')).toContainText('Mar 15, 2024');
  });

  test('should navigate to order detail and show timeline', async ({ page }) => {
    // Click on first order
    await page.click('[data-testid="order-card"]:first-child');
    
    // Verify order detail page
    await expect(page.locator('[data-testid="order-detail-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-number"]')).toContainText('CG-2023-001');
    
    // Check timeline is displayed
    await expect(page.locator('[data-testid="order-timeline"]')).toBeVisible();
    
    // Verify current stage is highlighted
    await expect(page.locator('[data-testid="stage-Measurements"]')).toHaveClass(/current/);
    
    // Verify completed stages are marked
    await expect(page.locator('[data-testid="stage-DesignProposal"]')).toHaveClass(/completed/);
    await expect(page.locator('[data-testid="stage-ProofApproval"]')).toHaveClass(/completed/);
    
    // Verify future stages are pending
    await expect(page.locator('[data-testid="stage-ProductionPlanning"]')).toHaveClass(/pending/);
  });

  test('should show required actions for current stage', async ({ page }) => {
    // Navigate to order requiring measurements
    await page.click('[data-testid="order-card"]:first-child');
    
    // Check for action indicators
    await expect(page.locator('[data-testid="required-action"]')).toBeVisible();
    await expect(page.locator('[data-testid="action-text"]')).toContainText('Submit performer measurements');
    
    // Check action button is present
    await expect(page.locator('[data-testid="submit-measurements-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="submit-measurements-button"]')).toBeEnabled();
  });

  test('should handle mobile viewport correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    
    // Check order cards stack vertically
    const orderCards = page.locator('[data-testid="order-card"]');
    const firstCardBox = await orderCards.first().boundingBox();
    const secondCardBox = await orderCards.nth(1).boundingBox();
    
    expect(secondCardBox?.y).toBeGreaterThan(firstCardBox?.y! + firstCardBox?.height!);
  });
});
```
