/**
 * Environment health check utilities for E2E tests
 * Validates that all required services and data are available before test execution
 *
 * @fileoverview Comprehensive environment validation for reliable testing
 * @since 3.0.0
 */

export interface HealthCheckResult {
  status: 'pass' | 'warning' | 'fail';
  message: string;
  duration: number;
  details?: any;
}

export interface EnvironmentStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    frontend: HealthCheckResult;
    backend: HealthCheckResult;
    database: HealthCheckResult;
    testData: HealthCheckResult;
    environment: HealthCheckResult;
  };
  duration: number;
}

/**
 * Comprehensive environment health checker
 */
export class EnvironmentHealthChecker {
  private frontendUrl: string;
  private backendUrl: string;
  private timeout: number;

  constructor(
    frontendUrl: string = 'http://localhost:5173',
    backendUrl: string = 'http://localhost:5132',
    timeout: number = 10000
  ) {
    this.frontendUrl = frontendUrl;
    this.backendUrl = backendUrl;
    this.timeout = timeout;
  }

  /**
   * Perform comprehensive environment health check
   */
  async checkEnvironment(): Promise<EnvironmentStatus> {
    const startTime = Date.now();
    console.log('🔍 Starting environment health checks...');

    const checks = {
      frontend: await this.checkFrontend(),
      backend: await this.checkBackend(),
      database: await this.checkDatabase(),
      testData: await this.checkTestData(),
      environment: await this.checkEnvironmentConfig(),
    };

    const duration = Date.now() - startTime;

    // Determine overall status
    const failedChecks = Object.values(checks).filter(check => check.status === 'fail');
    const warningChecks = Object.values(checks).filter(check => check.status === 'warning');

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (failedChecks.length > 0) {
      overall = 'unhealthy';
    } else if (warningChecks.length > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    // Log results
    this.logHealthCheckResults(checks, overall, duration);

    return {
      overall,
      checks,
      duration
    };
  }

  /**
   * Check frontend server availability
   */
  private async checkFrontend(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(this.frontendUrl, {
        signal: controller.signal,
        method: 'GET'
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      if (response.ok) {
        return {
          status: 'pass',
          message: `Frontend server responding at ${this.frontendUrl}`,
          duration
        };
      } else {
        return {
          status: 'fail',
          message: `Frontend server returned ${response.status} at ${this.frontendUrl}`,
          duration
        };
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      return {
        status: 'fail',
        message: `Frontend server not accessible at ${this.frontendUrl}: ${error.message}`,
        duration,
        details: {
          error: error.message,
          suggestion: 'Run "npm run dev:web" to start the frontend server'
        }
      };
    }
  }

  /**
   * Check backend server availability
   */
  private async checkBackend(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.backendUrl}/api/health`, {
        signal: controller.signal,
        method: 'GET'
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      if (response.ok) {
        const healthData = await response.json();
        return {
          status: 'pass',
          message: `Backend server responding at ${this.backendUrl}/api/health`,
          duration,
          details: healthData
        };
      } else {
        return {
          status: 'fail',
          message: `Backend health check failed with status ${response.status}`,
          duration
        };
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      return {
        status: 'fail',
        message: `Backend server not accessible at ${this.backendUrl}: ${error.message}`,
        duration,
        details: {
          error: error.message,
          suggestion: 'Run "npm run dev:api" to start the backend server'
        }
      };
    }
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.backendUrl}/api/health/detailed`, {
        signal: controller.signal,
        method: 'GET'
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      if (response.ok) {
        const healthData = await response.json();

        // Check if database is specifically healthy
        if (healthData.database && healthData.database.status === 'Healthy') {
          return {
            status: 'pass',
            message: 'Database connectivity verified',
            duration,
            details: healthData.database
          };
        } else {
          return {
            status: 'fail',
            message: 'Database health check failed',
            duration,
            details: healthData.database
          };
        }
      } else {
        return {
          status: 'fail',
          message: `Database health endpoint returned ${response.status}`,
          duration
        };
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      return {
        status: 'fail',
        message: `Database health check failed: ${error.message}`,
        duration,
        details: {
          error: error.message,
          suggestion: 'Check database connection string and ensure database server is running'
        }
      };
    }
  }

  /**
   * Check test data availability
   */
  private async checkTestData(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.backendUrl}/api/test/users`, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'X-Test-Auth': 'test-seed-token'
        }
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      if (response.ok) {
        const users = await response.json();
        const requiredUsers = [
          'director@lincolnhigh.edu',
          'finance@lincolnhigh.edu',
          'staff@colorgarb.com'
        ];

        const missingUsers = requiredUsers.filter(email =>
          !users.find((u: any) => u.email === email)
        );

        if (missingUsers.length === 0) {
          return {
            status: 'pass',
            message: `Test data verified (${users.length} users found)`,
            duration,
            details: { userCount: users.length, requiredUsers }
          };
        } else {
          return {
            status: 'warning',
            message: `Missing test users: ${missingUsers.join(', ')}`,
            duration,
            details: {
              missingUsers,
              foundUsers: users.map((u: any) => u.email),
              suggestion: 'Test data will be seeded automatically'
            }
          };
        }
      } else {
        return {
          status: 'warning',
          message: 'Test data endpoints not available',
          duration,
          details: {
            suggestion: 'Test endpoints may not be implemented yet'
          }
        };
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      return {
        status: 'warning',
        message: `Test data check failed: ${error.message}`,
        duration,
        details: {
          error: error.message,
          suggestion: 'Test data will be seeded during setup'
        }
      };
    }
  }

  /**
   * Check environment configuration
   */
  private async checkEnvironmentConfig(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Check required environment variables
      const requiredEnvVars = ['NODE_ENV'];
      const recommendedEnvVars = ['API_URL', 'BASE_URL'];

      const missingRequired = requiredEnvVars.filter(name => !process.env[name]);
      const missingRecommended = recommendedEnvVars.filter(name => !process.env[name]);

      const duration = Date.now() - startTime;

      if (missingRequired.length > 0) {
        return {
          status: 'fail',
          message: `Missing required environment variables: ${missingRequired.join(', ')}`,
          duration,
          details: {
            missingRequired,
            missingRecommended,
            suggestion: 'Set required environment variables'
          }
        };
      } else if (missingRecommended.length > 0) {
        return {
          status: 'warning',
          message: `Missing recommended environment variables: ${missingRecommended.join(', ')}`,
          duration,
          details: {
            missingRecommended,
            suggestion: 'Consider setting recommended environment variables for better control'
          }
        };
      } else {
        return {
          status: 'pass',
          message: 'Environment configuration verified',
          duration,
          details: {
            nodeEnv: process.env.NODE_ENV,
            apiUrl: process.env.API_URL || 'default',
            baseUrl: process.env.BASE_URL || 'default'
          }
        };
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      return {
        status: 'fail',
        message: `Environment configuration check failed: ${error.message}`,
        duration
      };
    }
  }

  /**
   * Log health check results in a formatted way
   */
  private logHealthCheckResults(
    checks: EnvironmentStatus['checks'],
    overall: EnvironmentStatus['overall'],
    duration: number
  ): void {
    console.log(`\n🏥 Environment Health Check Results (${duration}ms):`);

    Object.entries(checks).forEach(([name, result]) => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      console.log(`${icon} ${name.padEnd(12)}: ${result.message} (${result.duration}ms)`);

      if (result.details?.suggestion) {
        console.log(`   💡 ${result.details.suggestion}`);
      }
    });

    const overallIcon = overall === 'healthy' ? '✅' : overall === 'degraded' ? '⚠️' : '❌';
    console.log(`\n${overallIcon} Overall Status: ${overall.toUpperCase()}\n`);
  }

  /**
   * Wait for services to be ready with retry logic
   */
  async waitForServicesReady(maxAttempts: number = 5, delayMs: number = 2000): Promise<boolean> {
    console.log('⏳ Waiting for services to be ready...');

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔄 Attempt ${attempt}/${maxAttempts}`);

      const status = await this.checkEnvironment();

      if (status.overall === 'healthy') {
        console.log('✅ All services are ready!');
        return true;
      }

      if (attempt < maxAttempts) {
        console.log(`⏸️ Waiting ${delayMs}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    console.log('❌ Services did not become ready within the timeout period');
    return false;
  }

  /**
   * Get environment diagnostic information
   */
  async getDiagnosticInfo(): Promise<any> {
    return {
      platform: process.platform,
      nodeVersion: process.version,
      workingDirectory: process.cwd(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        API_URL: process.env.API_URL,
        BASE_URL: process.env.BASE_URL,
      },
      urls: {
        frontend: this.frontendUrl,
        backend: this.backendUrl,
      },
      timestamp: new Date().toISOString()
    };
  }
}