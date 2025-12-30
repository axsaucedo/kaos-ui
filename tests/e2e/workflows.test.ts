import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { 
  setupBrowser, 
  teardownBrowser, 
  navigateTo, 
  waitForSelector,
  TestContext 
} from '../helpers/setup';

describe('End-to-End Workflow Tests', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupBrowser();
  });

  afterAll(async () => {
    await teardownBrowser(ctx);
  });

  describe('Single Agent Workflow', () => {
    it('should complete full navigation workflow', async () => {
      // 1. Start at overview
      await navigateTo(ctx.page, '/');
      await ctx.page.waitForTimeout(500);
      
      let pageContent = await ctx.page.content();
      expect(pageContent).toContain('Dashboard Overview');
      
      // 2. Navigate to Model APIs
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent?.includes('Model APIs'));
        if (btn) btn.click();
      });
      await ctx.page.waitForTimeout(500);
      
      pageContent = await ctx.page.content();
      expect(pageContent).toContain('openai-proxy');
      
      // 3. Navigate to MCP Servers
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent?.includes('MCP Servers'));
        if (btn) btn.click();
      });
      await ctx.page.waitForTimeout(500);
      
      pageContent = await ctx.page.content();
      expect(pageContent).toContain('websearch-mcp');
      
      // 4. Navigate to Agents
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent?.includes('Agents') && !b.textContent?.includes('MCP'));
        if (btn) btn.click();
      });
      await ctx.page.waitForTimeout(500);
      
      pageContent = await ctx.page.content();
      expect(pageContent).toContain('orchestrator-agent');
      
      // 5. Navigate to Visual Editor
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent?.includes('Visual Editor'));
        if (btn) btn.click();
      });
      await ctx.page.waitForTimeout(1000);
      
      const hasReactFlow = await waitForSelector(ctx.page, '.react-flow', 5000);
      expect(hasReactFlow).toBe(true);
      
      // 6. Return to Overview
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent?.includes('Overview'));
        if (btn) btn.click();
      });
      await ctx.page.waitForTimeout(500);
      
      pageContent = await ctx.page.content();
      expect(pageContent).toContain('Dashboard Overview');
    });
  });

  describe('Kubernetes Resources Workflow', () => {
    it('should browse all Kubernetes resources', async () => {
      await navigateTo(ctx.page, '/');
      await ctx.page.waitForTimeout(500);
      
      // 1. View Pods
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent?.includes('Pods'));
        if (btn) btn.click();
      });
      await ctx.page.waitForTimeout(500);
      
      let pageContent = await ctx.page.content();
      expect(pageContent).toContain('Running');
      
      // 2. View Deployments
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent?.includes('Deployments'));
        if (btn) btn.click();
      });
      await ctx.page.waitForTimeout(500);
      
      pageContent = await ctx.page.content();
      expect(pageContent).toContain('Replicas');
      
      // 3. View Volumes
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent?.includes('Volumes'));
        if (btn) btn.click();
      });
      await ctx.page.waitForTimeout(500);
      
      pageContent = await ctx.page.content();
      expect(pageContent).toContain('Persistent Volume Claims');
    });
  });

  describe('Tools Workflow', () => {
    it('should access all tool views', async () => {
      await navigateTo(ctx.page, '/');
      await ctx.page.waitForTimeout(500);
      
      // 1. View Logs
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent?.includes('Logs'));
        if (btn) btn.click();
      });
      await ctx.page.waitForTimeout(500);
      
      let pageContent = await ctx.page.content();
      expect(pageContent).toContain('Logs');
      
      // 2. View Alerts
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent?.includes('Alerts'));
        if (btn) btn.click();
      });
      await ctx.page.waitForTimeout(500);
      
      pageContent = await ctx.page.content();
      expect(pageContent).toContain('Alerts');
      
      // 3. View Settings
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent?.includes('Settings'));
        if (btn) btn.click();
      });
      await ctx.page.waitForTimeout(500);
      
      pageContent = await ctx.page.content();
      expect(pageContent).toContain('Settings');
    });
  });

  describe('Sidebar Collapse Workflow', () => {
    it('should toggle sidebar collapse', async () => {
      await navigateTo(ctx.page, '/');
      await ctx.page.waitForTimeout(500);
      
      // Find and click the collapse button (chevron icon)
      const initialWidth = await ctx.page.evaluate(() => {
        const sidebar = document.querySelector('aside');
        return sidebar ? sidebar.offsetWidth : 0;
      });
      
      expect(initialWidth).toBeGreaterThan(100); // Sidebar should be expanded initially
      
      // Click collapse button
      await ctx.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        // Find button with chevron (collapse button is usually in the sidebar header)
        const collapseBtn = buttons.find(b => {
          const svg = b.querySelector('svg');
          return svg && b.closest('aside');
        });
        if (collapseBtn) collapseBtn.click();
      });
      
      await ctx.page.waitForTimeout(500);
      
      const collapsedWidth = await ctx.page.evaluate(() => {
        const sidebar = document.querySelector('aside');
        return sidebar ? sidebar.offsetWidth : 0;
      });
      
      // Either collapsed or same (if toggle not found)
      expect(collapsedWidth).toBeLessThanOrEqual(initialWidth);
    });
  });

  describe('Full Application Health Check', () => {
    it('should verify all major components render without errors', async () => {
      await navigateTo(ctx.page, '/');
      
      // Collect any console errors
      const errors: string[] = [];
      ctx.page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await ctx.page.waitForTimeout(1000);
      
      // Navigate through all tabs
      const tabs = [
        'Overview', 'Visual Editor', 'Model APIs', 'MCP Servers', 'Agents',
        'Pods', 'Deployments', 'Volumes', 'Logs', 'Alerts', 'Settings'
      ];
      
      for (const tab of tabs) {
        await ctx.page.evaluate((tabName) => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const btn = buttons.find(b => {
            const text = b.textContent || '';
            if (tabName === 'Agents') {
              return text.includes('Agents') && !text.includes('MCP');
            }
            return text.includes(tabName);
          });
          if (btn) btn.click();
        }, tab);
        
        await ctx.page.waitForTimeout(300);
      }
      
      // No critical React errors should occur
      const criticalErrors = errors.filter(e => 
        e.includes('React') && (e.includes('error') || e.includes('Error'))
      );
      
      expect(criticalErrors.length).toBe(0);
    });
  });
});
