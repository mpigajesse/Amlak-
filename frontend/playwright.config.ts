import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html'], ['list']],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    locale: 'fr-MA',
    timezoneId: 'Africa/Casablanca',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'pnpm dev --host',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: 'cd ../backend && uv run python manage.py runserver 0.0.0.0:8000',
      url: 'http://localhost:8000/api/v1/auth/me/',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      env: {
        DATABASE_URL: 'postgres://amlak:amlak@localhost:5432/amlak',
        REDIS_URL: 'redis://localhost:6379/0',
        DJANGO_SECRET_KEY: 'e2e-secret-key',
        DJANGO_DEBUG: 'True',
        DJANGO_ALLOWED_HOSTS: 'localhost,127.0.0.1,backend',
        JWT_ACCESS_TOKEN_LIFETIME_MIN: '30',
        JWT_REFRESH_TOKEN_LIFETIME_DAYS: '7',
        CORS_ALLOWED_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173',
        FRONTEND_URL: 'http://localhost:5173',
      },
    },
  ],
});
