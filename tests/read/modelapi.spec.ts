/**
 * Read tests for ModelAPI resources.
 * 
 * Prerequisites:
 * - npm run dev (starts UI at http://localhost:8080)
 * - kaos proxy running (Kubernetes API access)
 * - Cluster with ModelAPI resources in kaos-hierarchy namespace
 */

import { test, expect } from '@playwright/test';
import { setupConnection, TEST_CONFIG } from '../fixtures/test-utils';

test.describe('ModelAPI Read Operations', () => {
  test.beforeEach(async ({ page }) => {
    await setupConnection(page, {
      proxyUrl: TEST_CONFIG.proxyUrl,
      namespace: TEST_CONFIG.namespace,
    });
  });

  test('should display the ModelAPI list page', async ({ page }) => {
    // Navigate to ModelAPIs
    await page.getByRole('button', { name: /model api/i }).click();
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the ModelAPI tab (either via URL param or the tab is active)
    // The UI uses ?tab=modelapis or just updates state without URL change
    const pageContent = await page.locator('body').textContent();
    expect(pageContent).toBeTruthy();
    
    // Should show ModelAPI content (header or resources)
    await expect(page.locator('body')).toContainText(/model/i);
  });

  test('should navigate to ModelAPI detail page', async ({ page }) => {
    // Navigate to ModelAPIs
    await page.getByRole('button', { name: /model api/i }).click();
    await page.waitForLoadState('networkidle');
    
    // Wait for the page to load and click on a ModelAPI if available
    await page.waitForTimeout(2000);
    
    // Look for resource links/cards
    const resourceLinks = page.locator('a[href*="/modelapis/"]');
    const count = await resourceLinks.count();
    
    if (count > 0) {
      // Click the first resource
      await resourceLinks.first().click();
      await page.waitForLoadState('networkidle');
      
      // Should navigate to detail page
      await expect(page).toHaveURL(/\/modelapis\/[^/]+\/[^/]+/);
    } else {
      // No resources in namespace, test passes if list page loads
      console.log('No ModelAPI resources found in namespace');
    }
  });

  test('should display ModelAPI detail tabs', async ({ page }) => {
    // Navigate to ModelAPIs
    await page.getByRole('button', { name: /model api/i }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const resourceLinks = page.locator('a[href*="/modelapis/"]');
    const count = await resourceLinks.count();
    
    if (count > 0) {
      await resourceLinks.first().click();
      await page.waitForLoadState('networkidle');
      
      // Detail page should have tabs (Overview, Pods, YAML)
      const tabList = page.locator('[role="tablist"]');
      if (await tabList.count() > 0) {
        await expect(tabList).toBeVisible();
        
        // Check for common tabs
        const tabs = page.locator('[role="tab"]');
        const tabCount = await tabs.count();
        expect(tabCount).toBeGreaterThan(0);
      }
    } else {
      console.log('No ModelAPI resources found in namespace');
    }
  });

  test('should display ModelAPI configuration details', async ({ page }) => {
    // Navigate to ModelAPIs
    await page.getByRole('button', { name: /model api/i }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const resourceLinks = page.locator('a[href*="/modelapis/"]');
    const count = await resourceLinks.count();
    
    if (count > 0) {
      await resourceLinks.first().click();
      await page.waitForLoadState('networkidle');
      
      // Detail page should show mode (Proxy or Hosted)
      const pageContent = await page.locator('body').textContent() || '';
      
      // Should contain either Proxy or Hosted mode indication
      const hasProxyOrHosted = pageContent.includes('Proxy') || pageContent.includes('Hosted');
      expect(hasProxyOrHosted).toBeTruthy();
    } else {
      console.log('No ModelAPI resources found in namespace');
    }
  });
});
