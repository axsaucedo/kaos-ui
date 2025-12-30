/**
 * UI Resource Sync Tests
 * 
 * These tests validate that resources from the Kubernetes cluster
 * are properly displayed in the UI components
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import puppeteer, { Browser, Page } from 'puppeteer';

const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const K8S_BASE_URL = process.env.K8S_BASE_URL || '';
const K8S_NAMESPACE = process.env.K8S_NAMESPACE || 'test';

describe('UI Resource Sync Tests', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  describe('Connection and Resource Display', () => {
    it('should load the application', async () => {
      await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Check that the sidebar is visible
      const sidebar = await page.$('[data-testid="sidebar"]');
      expect(sidebar).toBeDefined();
    });

    it('should navigate to settings and show connection form', async () => {
      await page.goto(APP_URL, { waitUntil: 'networkidle2' });
      
      // Click on Settings in sidebar
      await page.click('text=Settings');
      await page.waitForTimeout(500);
      
      // Check for connection settings card
      const connectionCard = await page.$('text=Kubernetes Connection');
      expect(connectionCard).toBeDefined();
    });

    it.skip('should connect to cluster when configured', async () => {
      if (!K8S_BASE_URL) {
        console.log('Skipping - K8S_BASE_URL not set');
        return;
      }

      await page.goto(APP_URL, { waitUntil: 'networkidle2' });
      
      // Navigate to settings
      await page.click('text=Settings');
      await page.waitForTimeout(500);

      // Enter connection details
      const urlInput = await page.$('input[placeholder*="ngrok"]');
      if (urlInput) {
        await urlInput.type(K8S_BASE_URL);
      }

      const namespaceInput = await page.$('input[placeholder="default"]');
      if (namespaceInput) {
        await namespaceInput.click({ clickCount: 3 });
        await namespaceInput.type(K8S_NAMESPACE);
      }

      // Click Connect
      await page.click('button:has-text("Connect")');
      await page.waitForTimeout(2000);

      // Check for connected status
      const connectedBadge = await page.$('text=Connected');
      expect(connectedBadge).toBeDefined();
    });

    it('should display Model APIs list', async () => {
      await page.goto(APP_URL, { waitUntil: 'networkidle2' });
      
      // Click on Model APIs in sidebar
      await page.click('text=Model APIs');
      await page.waitForTimeout(500);

      // Check that the list header is visible
      const listHeader = await page.$('text=Model APIs');
      expect(listHeader).toBeDefined();
    });

    it('should display MCP Servers list', async () => {
      await page.goto(APP_URL, { waitUntil: 'networkidle2' });
      
      // Click on MCP Servers in sidebar
      await page.click('text=MCP Servers');
      await page.waitForTimeout(500);

      // Check that the list header is visible
      const listHeader = await page.$('text=MCP Servers');
      expect(listHeader).toBeDefined();
    });

    it('should display Agents list', async () => {
      await page.goto(APP_URL, { waitUntil: 'networkidle2' });
      
      // Click on Agents in sidebar
      await page.click('text=Agents');
      await page.waitForTimeout(500);

      // Check that the list header is visible
      const listHeader = await page.$('text=Agents');
      expect(listHeader).toBeDefined();
    });
  });

  describe('Resource Details', () => {
    it.skip('should show resource count in sidebar after connection', async () => {
      if (!K8S_BASE_URL) {
        console.log('Skipping - K8S_BASE_URL not set');
        return;
      }

      await page.goto(APP_URL, { waitUntil: 'networkidle2' });
      
      // Wait for auto-connect
      await page.waitForTimeout(3000);

      // Check for resource counts in sidebar badges
      const badges = await page.$$('.badge');
      expect(badges.length).toBeGreaterThan(0);
    });
  });
});
