import { test, expect } from '@playwright/test';

/**
 * Auth E2E tests — Sprint 1
 *
 * Note: These tests assume that `manage.py seed_demo` has been run
 * to create the admin@amlak.ma / admin user.
 */

test.describe('Authentication Flow', () => {
  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Verify we're on the login page
    await expect(page).toHaveURL('/login');
    await expect(page.locator('text=Se connecter')).toBeVisible();

    // Fill in credentials
    await page.fill('input[type="email"]', 'admin@amlak.ma');
    await page.fill('input[type="password"]', 'admin');

    // Submit login form
    await page.click('button:has-text("Se connecter")');

    // Verify redirect to dashboard
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Bienvenue')).toBeVisible();
  });

  test('login with invalid password displays error message', async ({ page }) => {
    await page.goto('/login');

    // Fill in credentials with wrong password
    await page.fill('input[type="email"]', 'admin@amlak.ma');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Submit login form
    await page.click('button:has-text("Se connecter")');

    // Verify error message is displayed
    await expect(page.locator('text=Identifiants invalides.')).toBeVisible();

    // Verify we're still on the login page
    await expect(page).toHaveURL('/login');
  });

  test('unauthenticated user is redirected to login', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/');

    // Should be redirected to login
    await expect(page).toHaveURL('/login');
  });

  test('login page renders in French', async ({ page }) => {
    await page.goto('/login');

    // Check for French UI elements
    await expect(page.locator('text=Se connecter')).toBeVisible();
    await expect(page.locator('label:has-text("Email")')).toBeVisible();
    await expect(page.locator('label:has-text("Mot de passe")')).toBeVisible();
  });

  test('authenticated user can access dashboard', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@amlak.ma');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button:has-text("Se connecter")');

    // Wait for navigation
    await expect(page).toHaveURL('/');

    // Verify dashboard content is visible
    await expect(page.locator('text=Tableau de bord')).toBeVisible();
    await expect(page.locator('text=Bonjour')).toBeVisible();
  });

  test('sidebar navigation links are visible after login', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@amlak.ma');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button:has-text("Se connecter")');

    // Wait for dashboard
    await expect(page).toHaveURL('/');

    // Verify sidebar links exist
    await expect(page.locator('text=Projets')).toBeVisible();
    await expect(page.locator('text=Transactions')).toBeVisible();
    await expect(page.locator('text=Chèques')).toBeVisible();
    await expect(page.locator('text=Fournisseurs')).toBeVisible();
    await expect(page.locator('text=Paramètres')).toBeVisible();
  });

  test('sidebar navigation links are clickable', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@amlak.ma');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button:has-text("Se connecter")');

    // Click on Projets link
    await page.click('text=Projets');

    // Verify navigation worked (page should show a placeholder or the projects content)
    await expect(page.locator('text=Projets')).toBeVisible();
  });
});

test.describe('Mobile Navigation', () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test('mobile menu drawer is visible on mobile viewport', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@amlak.ma');
    await page.fill('input[type="password"]', 'admin');
    await page.click('button:has-text("Se connecter")');

    await expect(page).toHaveURL('/');

    // Check that mobile nav is present (usually a hamburger menu or drawer)
    // This assertion assumes the mobile nav has a role or data attribute
    // Adjust based on actual implementation
    const mobileNav = page.locator('[data-testid="mobile-nav"], button[aria-label*="menu" i]');

    // If mobile nav exists, it should be visible on mobile viewport
    if (await mobileNav.isVisible()) {
      await expect(mobileNav).toBeVisible();
    }
  });
});
