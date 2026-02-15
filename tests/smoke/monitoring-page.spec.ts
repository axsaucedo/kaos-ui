/**
 * Smoke test: Verify the monitoring page renders correctly.
 *
 * When port 8011 is NOT forwarded (default in CI), the page should show
 * the "Monitoring Not Available" instructions.
 */

import { test, expect } from '@playwright/test';

test.describe('Monitoring Page', () => {
  test('should render the monitoring page with header', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to monitoring tab via sidebar
    const monitoringLink = page.locator('text=KAOS Observability');
    if (await monitoringLink.isVisible()) {
      await monitoringLink.click();
    }

    // The page header should be visible
    await expect(page.locator('text=KAOS Monitoring')).toBeVisible();
    await expect(page.locator('text=Observability dashboard')).toBeVisible();
  });

  test('should show instructions when monitoring port is not forwarded', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to monitoring tab
    const monitoringLink = page.locator('text=KAOS Observability');
    if (await monitoringLink.isVisible()) {
      await monitoringLink.click();
    }

    // Wait for port check to complete (should fail since port 8011 is not forwarded)
    await page.waitForTimeout(4000);

    // Should show the "not available" alert with CLI instructions
    await expect(page.locator('text=Monitoring Not Available')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=kaos ui --monitoring-enabled signoz')).toBeVisible();
  });

  test('should have a refresh button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const monitoringLink = page.locator('text=KAOS Observability');
    if (await monitoringLink.isVisible()) {
      await monitoringLink.click();
    }

    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeVisible();
  });
});
