/**
 * Test data fixtures for E2E tests
 * Contains predefined test users, organizations, and orders
 *
 * @fileoverview Test data management utilities
 * @since 3.0.0
 */

export interface TestUser {
  id?: string;
  email: string;
  password: string;
  name: string;
  role: 'Director' | 'Finance' | 'Coach' | 'Client' | 'ColorGarbStaff';
  organizationId?: string;
  phone?: string;
  isActive: boolean;
}

export interface TestOrganization {
  id: string;
  name: string;
  type: 'High School' | 'College' | 'Professional' | 'Community';
  contactEmail: string;
  contactPhone: string;
  address: string;
  isActive: boolean;
}

export interface TestOrder {
  id?: string;
  orderNumber: string;
  organizationId: string;
  description: string;
  currentStage: string;
  originalShipDate: string;
  currentShipDate: string;
  totalAmount: number;
  paymentStatus: 'Pending' | 'Paid' | 'Partial' | 'Overdue';
  isActive: boolean;
  notes?: string;
}

/**
 * Test organizations for E2E testing
 */
export const testOrganizations: TestOrganization[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Lincoln High School Marching Band',
    type: 'High School',
    contactEmail: 'band@lincolnhigh.edu',
    contactPhone: '555-0123',
    address: '123 School St, Lincoln, IL 62656',
    isActive: true
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Springfield College Orchestra',
    type: 'College',
    contactEmail: 'music@springfield.edu',
    contactPhone: '555-0456',
    address: '456 University Ave, Springfield, IL 62701',
    isActive: true
  }
];

/**
 * Test users for E2E testing
 */
export const testUsers: TestUser[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'director@lincolnhigh.edu',
    password: 'password123',
    name: 'Jane Smith',
    role: 'Director',
    organizationId: '11111111-1111-1111-1111-111111111111',
    phone: '555-0123',
    isActive: true
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'finance@lincolnhigh.edu',
    password: 'password123',
    name: 'John Finance',
    role: 'Finance',
    organizationId: '11111111-1111-1111-1111-111111111111',
    phone: '555-0124',
    isActive: true
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'coach@lincolnhigh.edu',
    password: 'password123',
    name: 'Mike Coach',
    role: 'Coach',
    organizationId: '11111111-1111-1111-1111-111111111111',
    phone: '555-0125',
    isActive: true
  },
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    email: 'staff@colorgarb.com',
    password: 'password123',
    name: 'ColorGarb Staff',
    role: 'ColorGarbStaff',
    phone: '555-1000',
    isActive: true
  },
  {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    email: 'director@springfield.edu',
    password: 'password123',
    name: 'Sarah College',
    role: 'Director',
    organizationId: '22222222-2222-2222-2222-222222222222',
    phone: '555-0456',
    isActive: true
  }
];

/**
 * Test orders for E2E testing
 */
export const testOrders: TestOrder[] = [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    orderNumber: 'CG-2024-001',
    organizationId: '11111111-1111-1111-1111-111111111111',
    description: 'Fall 2024 Marching Band Uniforms',
    currentStage: 'DesignProposal',
    originalShipDate: '2024-08-15',
    currentShipDate: '2024-08-15',
    totalAmount: 12500.00,
    paymentStatus: 'Pending',
    isActive: true,
    notes: 'Blue and gold color scheme with school logo'
  },
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    orderNumber: 'CG-2024-002',
    organizationId: '11111111-1111-1111-1111-111111111111',
    description: 'Winter Guard Performance Costumes',
    currentStage: 'Measurements',
    originalShipDate: '2024-12-01',
    currentShipDate: '2024-12-05',
    totalAmount: 8750.00,
    paymentStatus: 'Partial',
    isActive: true,
    notes: 'Sequined costumes for winter performance'
  },
  {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    orderNumber: 'CG-2024-003',
    organizationId: '11111111-1111-1111-1111-111111111111',
    description: 'Color Guard Practice Wear',
    currentStage: 'Production',
    originalShipDate: '2024-06-15',
    currentShipDate: '2024-06-20',
    totalAmount: 4200.00,
    paymentStatus: 'Paid',
    isActive: true,
    notes: 'Comfortable practice uniforms'
  },
  {
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    orderNumber: 'CG-2023-015',
    organizationId: '11111111-1111-1111-1111-111111111111',
    description: 'Completed Uniform Order',
    currentStage: 'Delivery',
    originalShipDate: '2023-08-15',
    currentShipDate: '2023-08-15',
    totalAmount: 15000.00,
    paymentStatus: 'Paid',
    isActive: false,
    notes: 'Successfully delivered last season'
  },
  {
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    orderNumber: 'CG-2024-010',
    organizationId: '22222222-2222-2222-2222-222222222222',
    description: 'Orchestra Concert Attire',
    currentStage: 'ProofApproval',
    originalShipDate: '2024-10-01',
    currentShipDate: '2024-10-01',
    totalAmount: 6800.00,
    paymentStatus: 'Pending',
    isActive: true,
    notes: 'Formal concert wear for fall season'
  }
];

/**
 * Manufacturing stages for orders
 */
export const orderStages = [
  'DesignProposal',
  'ProofApproval',
  'Measurements',
  'ProductionPlanning',
  'Cutting',
  'Sewing',
  'QualityControl',
  'Finishing',
  'FinalInspection',
  'Packaging',
  'ShippingPreparation',
  'ShipOrder',
  'Delivery'
] as const;

/**
 * Get test user by role
 */
export function getTestUserByRole(role: TestUser['role']): TestUser {
  const user = testUsers.find(u => u.role === role);
  if (!user) {
    throw new Error(`No test user found with role: ${role}`);
  }
  return user;
}

/**
 * Get test user by email
 */
export function getTestUserByEmail(email: string): TestUser {
  const user = testUsers.find(u => u.email === email);
  if (!user) {
    throw new Error(`No test user found with email: ${email}`);
  }
  return user;
}

/**
 * Get test organization by ID
 */
export function getTestOrganizationById(id: string): TestOrganization {
  const org = testOrganizations.find(o => o.id === id);
  if (!org) {
    throw new Error(`No test organization found with ID: ${id}`);
  }
  return org;
}

/**
 * Get orders for organization
 */
export function getOrdersForOrganization(organizationId: string): TestOrder[] {
  return testOrders.filter(order => order.organizationId === organizationId);
}

/**
 * Generate unique test data with timestamp suffix
 */
export function generateUniqueTestData(baseData: any): any {
  const timestamp = Date.now();
  return {
    ...baseData,
    id: `test-${timestamp}`,
    email: baseData.email ? `test-${timestamp}-${baseData.email}` : undefined,
    orderNumber: baseData.orderNumber ? `TEST-${timestamp}` : undefined
  };
}