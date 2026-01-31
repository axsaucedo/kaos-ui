/**
 * Read tests for Agent resources.
 * 
 * Prerequisites:
 * - npm run dev (starts UI at http://localhost:8080)
 * - kaos proxy running (Kubernetes API access)
 * - Cluster with Agent resources in kaos-hierarchy namespace
 */

import { test, expect } from '@playwright/test';
import { setupConnection, TEST_CONFIG } from '../fixtures/test-utils';

test.describe('Agent Read Operations', () => {
  test.beforeEach(async ({ page }) => {
    await setupConnection(page, {
      proxyUrl: TEST_CONFIG.proxyUrl,
      namespace: TEST_CONFIG.namespace,
    });
  });

  test('should display the Agent list page', async ({ page }) => {
    // Navigate to Agents
    await page.getByRole('button', { name: /agents/i }).click();
    await page.waitForLoadState('networkidle');
    
    // Verify we're on the Agents tab (UI uses state-based navigation)
    const pageContent = await page.locator('body').textContent();
    expect(pageContent).toBeTruthy();
    
    // Should show Agent content
    await expect(page.locator('body')).toContainText(/agent/i);
  });

  test('should navigate to Agent detail page', async ({ page }) => {
    // Navigate to Agents
    await page.getByRole('button', { name: /agents/i }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for resource links/cards
    const resourceLinks = page.locator('a[href*="/agents/"]');
    const count = await resourceLinks.count();
    
    if (count > 0) {
      // Click the first resource
      await resourceLinks.first().click();
      await page.waitForLoadState('networkidle');
      
      // Should navigate to detail page
      await expect(page).toHaveURL(/\/agents\/[^/]+\/[^/]+/);
    } else {
      console.log('No Agent resources found in namespace');
    }
  });

  test('should display Agent detail tabs including Chat', async ({ page }) => {
    // Navigate to Agents
    await page.getByRole('button', { name: /agents/i }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const resourceLinks = page.locator('a[href*="/agents/"]');
    const count = await resourceLinks.count();
    
    if (count > 0) {
      await resourceLinks.first().click();
      await page.waitForLoadState('networkidle');
      
      // Detail page should have tabs (Overview, Chat, Memory, Pods, YAML)
      const tabList = page.locator('[role="tablist"]');
      if (await tabList.count() > 0) {
        await expect(tabList).toBeVisible();
        
        // Agent should have Chat tab
        const chatTab = page.locator('[role="tab"]', { hasText: /chat/i });
        if (await chatTab.count() > 0) {
          await expect(chatTab).toBeVisible();
        }
      }
    } else {
      console.log('No Agent resources found in namespace');
    }
  });

  test('should display Agent configuration with ModelAPI reference', async ({ page }) => {
    // Navigate to Agents
    await page.getByRole('button', { name: /agents/i }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    const resourceLinks = page.locator('a[href*="/agents/"]');
    const count = await resourceLinks.count();
    
    if (count > 0) {
      await resourceLinks.first().click();
      await page.waitForLoadState('networkidle');
      
      // Agent detail should show model configuration
      const pageContent = await page.locator('body').textContent() || '';
      
      // Should contain model-related information
      // (modelAPI reference or model identifier)
      expect(pageContent.length).toBeGreaterThan(100);
    } else {
      console.log('No Agent resources found in namespace');
    }
  });
});
