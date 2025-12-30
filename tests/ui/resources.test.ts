import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { 
  setupBrowser, 
  teardownBrowser, 
  navigateTo, 
  waitForSelector,
  getElementCount,
  TestContext 
} from '../helpers/setup';

describe('Resource List Tests', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupBrowser();
  });

  afterAll(async () => {
    await teardownBrowser(ctx);
  });

  describe('Model APIs List', () => {
    beforeEach(async () => {
      await navigateTo(ctx.page, '/');
      await ctx.page.waitForTimeout(500);
      
      // Navigate to Model APIs
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent?.includes('Model APIs'));
        if (btn) btn.click();
      });
      
      await ctx.page.waitForTimeout(500);
    });

    it('should display Model APIs list with mock data', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('openai-proxy');
      expect(pageContent).toContain('llama-hosted');
    });

    it('should display mode badges (Proxy/Hosted)', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Proxy');
      expect(pageContent).toContain('Hosted');
    });

    it('should display status badges', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Running');
    });

    it('should have Create button', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Create');
    });

    it('should have search functionality', async () => {
      const hasSearch = await waitForSelector(ctx.page, 'input[placeholder*="Search"]', 5000);
      expect(hasSearch).toBe(true);
    });
  });

  describe('MCP Servers List', () => {
    beforeEach(async () => {
      await navigateTo(ctx.page, '/');
      await ctx.page.waitForTimeout(500);
      
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent?.includes('MCP Servers'));
        if (btn) btn.click();
      });
      
      await ctx.page.waitForTimeout(500);
    });

    it('should display MCP Servers list with mock data', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('websearch-mcp');
      expect(pageContent).toContain('filesystem-mcp');
    });

    it('should display MCP server types', async () => {
      const pageContent = await ctx.page.content();
      // Should contain at least one of the types
      const hasType = pageContent.includes('python-custom') || 
                      pageContent.includes('npx') || 
                      pageContent.includes('uvx');
      expect(hasType).toBe(true);
    });

    it('should display tools when available', async () => {
      const pageContent = await ctx.page.content();
      // Websearch MCP should have search tool
      expect(pageContent).toContain('search');
    });
  });

  describe('Agents List', () => {
    beforeEach(async () => {
      await navigateTo(ctx.page, '/');
      await ctx.page.waitForTimeout(500);
      
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent?.includes('Agents') && !b.textContent?.includes('MCP'));
        if (btn) btn.click();
      });
      
      await ctx.page.waitForTimeout(500);
    });

    it('should display Agents list with mock data', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('orchestrator-agent');
      expect(pageContent).toContain('coder-agent');
    });

    it('should display Model API references', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('openai-proxy');
    });

    it('should display MCP server references', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('websearch-mcp');
    });

    it('should display network status', async () => {
      const pageContent = await ctx.page.content();
      const hasNetworkStatus = pageContent.includes('Exposed') || pageContent.includes('Private');
      expect(hasNetworkStatus).toBe(true);
    });
  });

  describe('Pods List', () => {
    beforeEach(async () => {
      await navigateTo(ctx.page, '/');
      await ctx.page.waitForTimeout(500);
      
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent?.includes('Pods'));
        if (btn) btn.click();
      });
      
      await ctx.page.waitForTimeout(500);
    });

    it('should display Pods grid with mock data', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('openai-proxy');
    });

    it('should display pod status', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Running');
    });

    it('should display pod IP information', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Pod IP');
    });
  });

  describe('Deployments List', () => {
    beforeEach(async () => {
      await navigateTo(ctx.page, '/');
      await ctx.page.waitForTimeout(500);
      
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent?.includes('Deployments'));
        if (btn) btn.click();
      });
      
      await ctx.page.waitForTimeout(500);
    });

    it('should display Deployments with mock data', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('openai-proxy');
    });

    it('should display replica counts', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Replicas');
    });

    it('should display health status', async () => {
      const pageContent = await ctx.page.content();
      const hasStatus = pageContent.includes('Healthy') || pageContent.includes('Degraded');
      expect(hasStatus).toBe(true);
    });
  });

  describe('Volumes List', () => {
    beforeEach(async () => {
      await navigateTo(ctx.page, '/');
      await ctx.page.waitForTimeout(500);
      
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent?.includes('Volumes'));
        if (btn) btn.click();
      });
      
      await ctx.page.waitForTimeout(500);
    });

    it('should display Volumes with mock data', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('model-cache');
    });

    it('should display storage capacity', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('100Gi');
    });

    it('should display access modes', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('ReadWriteOnce');
    });

    it('should display PVC status', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Bound');
    });
  });
});
