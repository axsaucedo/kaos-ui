import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { 
  setupBrowser, 
  teardownBrowser, 
  navigateTo, 
  waitForSelector,
  clickElement,
  getTextContent,
  TestContext 
} from '../helpers/setup';

describe('Navigation Tests', () => {
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
  });

  describe('Tab Navigation', () => {
    it('should navigate to Model APIs tab', async () => {
      // Click on Model APIs in sidebar
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const modelAPIBtn = buttons.find(btn => btn.textContent?.includes('Model APIs'));
        if (modelAPIBtn) modelAPIBtn.click();
      });
      
      await ctx.page.waitForTimeout(500);
      
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Model APIs');
      expect(pageContent).toContain('LiteLLM proxy');
    });

    it('should navigate to MCP Servers tab', async () => {
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const mcpBtn = buttons.find(btn => btn.textContent?.includes('MCP Servers'));
        if (mcpBtn) mcpBtn.click();
      });
      
      await ctx.page.waitForTimeout(500);
      
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('MCP Servers');
      expect(pageContent).toContain('Model Context Protocol');
    });

    it('should navigate to Agents tab', async () => {
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const agentsBtn = buttons.find(btn => btn.textContent?.includes('Agents') && !btn.textContent?.includes('MCP'));
        if (agentsBtn) agentsBtn.click();
      });
      
      await ctx.page.waitForTimeout(500);
      
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Agents');
      expect(pageContent).toContain('ADK-based agents');
    });

    it('should navigate to Pods tab', async () => {
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const podsBtn = buttons.find(btn => btn.textContent?.includes('Pods'));
        if (podsBtn) podsBtn.click();
      });
      
      await ctx.page.waitForTimeout(500);
      
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Pods');
      expect(pageContent).toContain('Kubernetes pods');
    });

    it('should navigate to Deployments tab', async () => {
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const deploymentsBtn = buttons.find(btn => btn.textContent?.includes('Deployments'));
        if (deploymentsBtn) deploymentsBtn.click();
      });
      
      await ctx.page.waitForTimeout(500);
      
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Deployments');
      expect(pageContent).toContain('Kubernetes deployments');
    });

    it('should navigate to Volumes tab', async () => {
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const volumesBtn = buttons.find(btn => btn.textContent?.includes('Volumes'));
        if (volumesBtn) volumesBtn.click();
      });
      
      await ctx.page.waitForTimeout(500);
      
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Persistent Volume Claims');
    });

    it('should navigate to Logs tab', async () => {
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const logsBtn = buttons.find(btn => btn.textContent?.includes('Logs'));
        if (logsBtn) logsBtn.click();
      });
      
      await ctx.page.waitForTimeout(500);
      
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Logs');
    });

    it('should navigate to Settings tab', async () => {
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const settingsBtn = buttons.find(btn => btn.textContent?.includes('Settings'));
        if (settingsBtn) settingsBtn.click();
      });
      
      await ctx.page.waitForTimeout(500);
      
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Settings');
    });

    it('should navigate to Visual Editor tab', async () => {
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const visualBtn = buttons.find(btn => btn.textContent?.includes('Visual Editor'));
        if (visualBtn) visualBtn.click();
      });
      
      await ctx.page.waitForTimeout(1000);
      
      const pageContent = await ctx.page.content();
      // Visual editor should have the React Flow canvas
      expect(pageContent).toContain('Resources');
    });

    it('should navigate back to Overview', async () => {
      // First go to another tab
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const logsBtn = buttons.find(btn => btn.textContent?.includes('Logs'));
        if (logsBtn) logsBtn.click();
      });
      
      await ctx.page.waitForTimeout(300);
      
      // Then back to Overview
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const overviewBtn = buttons.find(btn => btn.textContent?.includes('Overview'));
        if (overviewBtn) overviewBtn.click();
      });
      
      await ctx.page.waitForTimeout(500);
      
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Dashboard Overview');
    });
  });
});
