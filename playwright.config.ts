import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  globalSetup: './src/global-setup.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  // Retries hide flakiness locally; in CI one retry + trace gives evidence without blocking the pipeline.
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    // JUnit XML is what CI dashboards and test-management tools read.
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ...(isCI ? [['github'] as const] : []),
  ],
  use: {
    baseURL: env.baseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'api', testDir: './tests/api' },
    { name: 'ui', testDir: './tests', testIgnore: /api\//, use: { ...devices['Desktop Chrome'] } },
  ],
});
