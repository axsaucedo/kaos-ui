import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { 
  setupBrowser, 
  teardownBrowser, 
  navigateTo, 
  waitForSelector,
  getTextContent,
  getElementCount,
  TestContext 
} from '../helpers/setup';

describe('Dashboard UI Smoke Tests', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupBrowser();
  });

  afterAll(async () => {
    await teardownBrowser(ctx);
  });

  beforeEach(async () => {
    await navigateTo(ctx.page, '/');
  });

  describe('Initial Page Load', () => {
    it('should load the dashboard without errors', async () => {
      const hasContent = await waitForSelector(ctx.page, '[class*="Dashboard"]', 5000) ||
                         await waitForSelector(ctx.page, 'h1', 5000);
      expect(hasContent).toBe(true);
    });

    it('should display the sidebar', async () => {
      const hasSidebar = await waitForSelector(ctx.page, 'aside', 5000) ||
                         await waitForSelector(ctx.page, '[class*="sidebar"]', 5000);
      expect(hasSidebar).toBe(true);
    });

    it('should display the header', async () => {
      const hasHeader = await waitForSelector(ctx.page, 'header', 5000);
      expect(hasHeader).toBe(true);
    });

    it('should display the main content area', async () => {
      const hasMain = await waitForSelector(ctx.page, 'main', 5000);
      expect(hasMain).toBe(true);
    });

    it('should show the Overview tab as active by default', async () => {
      const title = await getTextContent(ctx.page, 'h1');
      expect(title).toContain('Dashboard');
    });
  });

  describe('Dashboard Overview Content', () => {
    it('should display resource stat cards', async () => {
      // Wait for cards to render
      await ctx.page.waitForTimeout(1000);
      
      // Check for Model APIs card
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Model APIs');
      expect(pageContent).toContain('MCP Servers');
      expect(pageContent).toContain('Agents');
      expect(pageContent).toContain('Pods');
    });

    it('should display system health percentage', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toMatch(/\d+%/);
    });

    it('should display recent activity section', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Recent Activity');
    });

    it('should display resource summary section', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Resource Summary');
    });
  });

  describe('Sidebar Navigation', () => {
    it('should have all main navigation items', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Overview');
      expect(pageContent).toContain('Visual Editor');
      expect(pageContent).toContain('Model APIs');
      expect(pageContent).toContain('MCP Servers');
      expect(pageContent).toContain('Agents');
    });

    it('should have Kubernetes navigation items', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Pods');
      expect(pageContent).toContain('Deployments');
      expect(pageContent).toContain('Volumes');
    });

    it('should have Tools navigation items', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Logs');
      expect(pageContent).toContain('Alerts');
      expect(pageContent).toContain('Settings');
    });

    it('should display resource counts in sidebar', async () => {
      // Wait for sidebar badges to render
      await ctx.page.waitForTimeout(500);
      
      // Check if badges exist (they show counts like "2", "3")
      const badges = await getElementCount(ctx.page, '[class*="badge"]');
      expect(badges).toBeGreaterThan(0);
    });
  });

  describe('Header Functionality', () => {
    it('should display search input', async () => {
      const hasSearch = await waitForSelector(ctx.page, 'input[placeholder*="Search"]', 5000);
      expect(hasSearch).toBe(true);
    });

    it('should display user info', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Admin');
    });
  });
});
