import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { 
  setupBrowser, 
  teardownBrowser, 
  navigateTo, 
  waitForSelector,
  TestContext 
} from '../helpers/setup';

describe('Logs Viewer Tests', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupBrowser();
  });

  afterAll(async () => {
    await teardownBrowser(ctx);
  });

  beforeEach(async () => {
    await navigateTo(ctx.page, '/');
    await ctx.page.waitForTimeout(500);
    
    // Navigate to Logs
    await ctx.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent?.includes('Logs'));
      if (btn) btn.click();
    });
    
    await ctx.page.waitForTimeout(500);
  });

  describe('Logs UI', () => {
    it('should display logs viewer', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Logs');
    });

    it('should have search input', async () => {
      const hasSearch = await waitForSelector(ctx.page, 'input[placeholder*="Search"]', 5000);
      expect(hasSearch).toBe(true);
    });

    it('should have level filter', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('All Levels');
    });

    it('should have clear button', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Clear');
    });

    it('should display log entries', async () => {
      const pageContent = await ctx.page.content();
      // Should contain mock log messages
      const hasLogContent = pageContent.includes('started successfully') ||
                            pageContent.includes('connected to network') ||
                            pageContent.includes('pending resources');
      expect(hasLogContent).toBe(true);
    });

    it('should display log levels (info, warn, error)', async () => {
      const pageContent = await ctx.page.content();
      const hasLevels = pageContent.includes('info') ||
                        pageContent.includes('warn') ||
                        pageContent.includes('error');
      expect(hasLevels).toBe(true);
    });
  });
});
