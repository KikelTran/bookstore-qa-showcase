import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  globalSetup: './src/global-setup.ts',
  // Every test creates its own data, so all tests (and tests inside one file) can run at the same time.
  fullyParallel: true,
  forbidOnly: isCI,
  // Retries hide flakiness locally; in CI one retry + trace gives evidence without blocking the pipeline.
  retries: isCI ? 1 : 0,
  // Local: Playwright default (half the CPU cores). CI: 2 workers on a 2-vCPU runner.
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
    // CI: trace every test so the published report shows each run step by step. Local: keep traces of failures only.
    trace: isCI ? 'on' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // One project per suite: run one with --project, or all together.
    { name: 'api', testDir: './tests/api' },
    { name: 'functional', testDir: './tests/functional', use: { ...devices['Desktop Chrome'] } },
    { name: 'e2e', testDir: './tests/e2e', use: { ...devices['Desktop Chrome'] } },
  ],
});
