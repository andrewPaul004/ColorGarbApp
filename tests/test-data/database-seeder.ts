/**
 * Database seeding utilities for E2E tests
 * Handles creation and cleanup of test data in the database
 *
 * @fileoverview Database seeding for reliable test data
 * @since 3.0.0
 */

import { testUsers, testOrganizations, testOrders, TestUser, TestOrganization, TestOrder } from './test-fixtures';

/**
 * Database seeding class for E2E tests
 */
export class DatabaseSeeder {
  private apiUrl: string;

  constructor(apiUrl: string = 'http://localhost:5132') {
    this.apiUrl = apiUrl;
  }

  /**
   * Seed all test data (organizations, users, orders)
   */
  async seedAllTestData(): Promise<void> {
    console.log('🌱 Starting database seeding...');

    try {
      // Seed in proper order due to foreign key dependencies
      await this.seedOrganizations();
      await this.seedUsers();
      await this.seedOrders();

      console.log('✅ Database seeding completed successfully');
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  /**
   * Clean up all test data
   */
  async cleanupTestData(): Promise<void> {
    console.log('🧹 Starting test data cleanup...');

    try {
      // Clean up in reverse order of creation
      await this.cleanupOrders();
      await this.cleanupUsers();
      await this.cleanupOrganizations();

      console.log('✅ Test data cleanup completed successfully');
    } catch (error) {
      console.error('❌ Test data cleanup failed:', error);
      // Don't throw error in cleanup to avoid blocking test runs
    }
  }

  /**
   * Seed test organizations
   */
  private async seedOrganizations(): Promise<void> {
    console.log('🏢 Seeding test organizations...');

    for (const org of testOrganizations) {
      try {
        await this.createOrganization(org);
        console.log(`✅ Created organization: ${org.name}`);
      } catch (error: any) {
        if (error.message?.includes('already exists') || error.message?.includes('409')) {
          console.log(`ℹ️ Organization already exists: ${org.name}`);
        } else {
          console.warn(`⚠️ Failed to create organization ${org.name}:`, error.message);
        }
      }
    }
  }

  /**
   * Seed test users
   */
  private async seedUsers(): Promise<void> {
    console.log('👥 Seeding test users...');

    for (const user of testUsers) {
      try {
        await this.createUser(user);
        console.log(`✅ Created user: ${user.email} (${user.role})`);
      } catch (error: any) {
        if (error.message?.includes('already exists') || error.message?.includes('409')) {
          console.log(`ℹ️ User already exists: ${user.email}`);
        } else {
          console.warn(`⚠️ Failed to create user ${user.email}:`, error.message);
        }
      }
    }
  }

  /**
   * Seed test orders
   */
  private async seedOrders(): Promise<void> {
    console.log('📋 Seeding test orders...');

    for (const order of testOrders) {
      try {
        await this.createOrder(order);
        console.log(`✅ Created order: ${order.orderNumber}`);
      } catch (error: any) {
        if (error.message?.includes('already exists') || error.message?.includes('409')) {
          console.log(`ℹ️ Order already exists: ${order.orderNumber}`);
        } else {
          console.warn(`⚠️ Failed to create order ${order.orderNumber}:`, error.message);
        }
      }
    }
  }

  /**
   * Create organization via API
   */
  private async createOrganization(org: TestOrganization): Promise<void> {
    const response = await fetch(`${this.apiUrl}/api/test/organizations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Auth': 'test-seed-token'
      },
      body: JSON.stringify(org)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create organization: ${response.status} - ${errorText}`);
    }
  }

  /**
   * Create user via API
   */
  private async createUser(user: TestUser): Promise<void> {
    const response = await fetch(`${this.apiUrl}/api/test/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Auth': 'test-seed-token'
      },
      body: JSON.stringify(user)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create user: ${response.status} - ${errorText}`);
    }
  }

  /**
   * Create order via API
   */
  private async createOrder(order: TestOrder): Promise<void> {
    const response = await fetch(`${this.apiUrl}/api/test/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Auth': 'test-seed-token'
      },
      body: JSON.stringify(order)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create order: ${response.status} - ${errorText}`);
    }
  }

  /**
   * Clean up test orders
   */
  private async cleanupOrders(): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/api/test/orders`, {
        method: 'DELETE',
        headers: {
          'X-Test-Auth': 'test-seed-token'
        }
      });

      if (response.ok) {
        console.log('✅ Cleaned up test orders');
      }
    } catch (error) {
      console.warn('⚠️ Failed to cleanup orders:', error);
    }
  }

  /**
   * Clean up test users
   */
  private async cleanupUsers(): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/api/test/users`, {
        method: 'DELETE',
        headers: {
          'X-Test-Auth': 'test-seed-token'
        }
      });

      if (response.ok) {
        console.log('✅ Cleaned up test users');
      }
    } catch (error) {
      console.warn('⚠️ Failed to cleanup users:', error);
    }
  }

  /**
   * Clean up test organizations
   */
  private async cleanupOrganizations(): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/api/test/organizations`, {
        method: 'DELETE',
        headers: {
          'X-Test-Auth': 'test-seed-token'
        }
      });

      if (response.ok) {
        console.log('✅ Cleaned up test organizations');
      }
    } catch (error) {
      console.warn('⚠️ Failed to cleanup organizations:', error);
    }
  }

  /**
   * Verify test data exists
   */
  async verifyTestData(): Promise<boolean> {
    console.log('🔍 Verifying test data...');

    try {
      // Check if test users exist
      const userResponse = await fetch(`${this.apiUrl}/api/test/users`, {
        headers: {
          'X-Test-Auth': 'test-seed-token'
        }
      });

      if (!userResponse.ok) {
        console.warn('⚠️ Test users verification failed');
        return false;
      }

      const users = await userResponse.json();
      const expectedUserCount = testUsers.length;

      if (users.length < expectedUserCount) {
        console.warn(`⚠️ Expected ${expectedUserCount} test users, found ${users.length}`);
        return false;
      }

      console.log(`✅ Verified ${users.length} test users exist`);
      return true;

    } catch (error) {
      console.warn('⚠️ Test data verification failed:', error);
      return false;
    }
  }

  /**
   * Reset authentication states for test users
   */
  async resetAuthStates(): Promise<void> {
    console.log('🔄 Resetting authentication states...');

    for (const user of testUsers) {
      try {
        // Reset any account lockouts or authentication issues
        await fetch(`${this.apiUrl}/api/test/users/${user.id}/reset-auth`, {
          method: 'POST',
          headers: {
            'X-Test-Auth': 'test-seed-token'
          }
        });
      } catch (error) {
        console.warn(`⚠️ Failed to reset auth state for ${user.email}:`, error);
      }
    }

    console.log('✅ Authentication states reset');
  }
}