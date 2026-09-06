import { defineConfig } from '@playwright/test';
import { launchOptions } from './scripts/browser';
export default defineConfig({
  testDir: './tests/browser',
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env.MATAN_BASE_URL || 'http://127.0.0.1:5173/s2/',
    viewport: { width: 1440, height: 1050 },
    launchOptions,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'bun run dev',
    url: 'http://127.0.0.1:5173/s2/',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
