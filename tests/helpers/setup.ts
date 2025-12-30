import puppeteer, { Browser, Page } from 'puppeteer';

const BASE_URL = process.env.TEST_URL || 'http://localhost:5173';

export interface TestContext {
  browser: Browser;
  page: Page;
}

export async function setupBrowser(): Promise<TestContext> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
    ],
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  return { browser, page };
}

export async function teardownBrowser(context: TestContext): Promise<void> {
  if (context.page) {
    await context.page.close();
  }
  if (context.browser) {
    await context.browser.close();
  }
}

export async function navigateTo(page: Page, path: string = '/'): Promise<void> {
  await page.goto(`${BASE_URL}${path}`, {
    waitUntil: 'networkidle0',
    timeout: 30000,
  });
}

export async function waitForSelector(page: Page, selector: string, timeout = 10000): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

export async function clickElement(page: Page, selector: string): Promise<void> {
  await page.waitForSelector(selector, { timeout: 5000 });
  await page.click(selector);
}

export async function getTextContent(page: Page, selector: string): Promise<string | null> {
  try {
    await page.waitForSelector(selector, { timeout: 5000 });
    return await page.$eval(selector, (el) => el.textContent);
  } catch {
    return null;
  }
}

export async function getElementCount(page: Page, selector: string): Promise<number> {
  try {
    await page.waitForSelector(selector, { timeout: 5000 });
    return await page.$$eval(selector, (els) => els.length);
  } catch {
    return 0;
  }
}

export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: `tests/screenshots/${name}.png`,
    fullPage: true,
  });
}

export { BASE_URL };
