import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { 
  setupBrowser, 
  teardownBrowser, 
  navigateTo, 
  waitForSelector,
  TestContext 
} from '../helpers/setup';

describe('Visual Canvas Tests', () => {
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
    
    // Navigate to Visual Editor
    await ctx.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent?.includes('Visual Editor'));
      if (btn) btn.click();
    });
    
    await ctx.page.waitForTimeout(1000);
  });

  describe('Canvas Layout', () => {
    it('should display resource palette', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Resources');
      expect(pageContent).toContain('Drag to add');
    });

    it('should have palette items for all resource types', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('ModelAPI');
      expect(pageContent).toContain('MCPServer');
      expect(pageContent).toContain('Agent');
    });

    it('should display action buttons', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Apply to Cluster');
      expect(pageContent).toContain('Export YAML');
    });

    it('should display legend', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Legend');
      expect(pageContent).toContain('Running');
      expect(pageContent).toContain('Pending');
      expect(pageContent).toContain('Error');
    });
  });

  describe('React Flow Canvas', () => {
    it('should render React Flow container', async () => {
      const hasReactFlow = await waitForSelector(ctx.page, '.react-flow', 5000);
      expect(hasReactFlow).toBe(true);
    });

    it('should display nodes on canvas', async () => {
      // Wait for nodes to render
      await ctx.page.waitForTimeout(500);
      
      const pageContent = await ctx.page.content();
      // Should contain node data from mock resources
      expect(pageContent).toContain('openai-proxy');
    });

    it('should have canvas controls', async () => {
      const hasControls = await waitForSelector(ctx.page, '.react-flow__controls', 5000);
      expect(hasControls).toBe(true);
    });

    it('should have minimap', async () => {
      const hasMinimap = await waitForSelector(ctx.page, '.react-flow__minimap', 5000);
      expect(hasMinimap).toBe(true);
    });

    it('should have background pattern', async () => {
      const hasBackground = await waitForSelector(ctx.page, '.react-flow__background', 5000);
      expect(hasBackground).toBe(true);
    });

    it('should display node count in panel', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toMatch(/\d+ nodes/);
    });
  });

  describe('Node Content', () => {
    it('should display ModelAPI nodes with correct data', async () => {
      await ctx.page.waitForTimeout(500);
      const pageContent = await ctx.page.content();
      
      // ModelAPI nodes should show mode
      expect(pageContent).toContain('Proxy');
      expect(pageContent).toContain('Hosted');
    });

    it('should display MCPServer nodes with tools', async () => {
      const pageContent = await ctx.page.content();
      // MCP nodes should show tools
      expect(pageContent).toContain('search');
    });

    it('should display Agent nodes with connections', async () => {
      const pageContent = await ctx.page.content();
      // Agent nodes should reference ModelAPI and MCPs
      expect(pageContent).toContain('orchestrator-agent');
    });

    it('should show status badges on nodes', async () => {
      const pageContent = await ctx.page.content();
      expect(pageContent).toContain('Running');
    });
  });
});
