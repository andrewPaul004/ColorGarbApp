import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Global teardown for Playwright tests
 * Cleans up test data, artifacts, and temporary files
 *
 * @param config Playwright configuration
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for ColorGarb E2E tests...');

  try {
    // Clean up authentication state files
    const authStatesDir = 'tests/auth-states';
    if (fs.existsSync(authStatesDir)) {
      console.log('🗑️ Cleaning up authentication states...');
      fs.rmSync(authStatesDir, { recursive: true, force: true });
      console.log('✅ Authentication states cleaned up');
    }

    // Clean up temporary test files
    const tempDir = 'tests/temp';
    if (fs.existsSync(tempDir)) {
      console.log('🗑️ Cleaning up temporary test files...');
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('✅ Temporary files cleaned up');
    }

    // Organize test artifacts if not in CI
    if (!process.env.CI) {
      await organizeTestArtifacts();
    }

    console.log('✅ Global teardown completed successfully');

  } catch (error) {
    console.error('❌ Global teardown encountered an error:', error);
    // Don't throw error to avoid failing the test run
  }
}

/**
 * Organize test artifacts into timestamped directories
 */
async function organizeTestArtifacts() {
  const artifactsDir = 'test-results/artifacts';
  const reportsDir = 'test-results/html-report';

  if (!fs.existsSync(artifactsDir) && !fs.existsSync(reportsDir)) {
    return;
  }

  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .substring(0, 19);

  const archiveDir = `test-results/archive/${timestamp}`;

  try {
    console.log('📁 Organizing test artifacts...');

    // Create archive directory
    fs.mkdirSync(archiveDir, { recursive: true });

    // Move artifacts
    if (fs.existsSync(artifactsDir)) {
      const artifactFiles = fs.readdirSync(artifactsDir);
      if (artifactFiles.length > 0) {
        fs.mkdirSync(path.join(archiveDir, 'artifacts'), { recursive: true });
        artifactFiles.forEach(file => {
          fs.renameSync(
            path.join(artifactsDir, file),
            path.join(archiveDir, 'artifacts', file)
          );
        });
      }
    }

    // Copy HTML report (don't move to keep latest available)
    if (fs.existsSync(reportsDir)) {
      fs.mkdirSync(path.join(archiveDir, 'html-report'), { recursive: true });
      copyRecursive(reportsDir, path.join(archiveDir, 'html-report'));
    }

    console.log(`✅ Test artifacts archived to: ${archiveDir}`);

  } catch (error) {
    console.warn('⚠️ Could not organize test artifacts:', error.message);
  }
}

/**
 * Recursively copy directory contents
 */
function copyRecursive(src: string, dest: string) {
  const stats = fs.statSync(src);

  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(file => {
      copyRecursive(path.join(src, file), path.join(dest, file));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

export default globalTeardown;