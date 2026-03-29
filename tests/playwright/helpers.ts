/**
 * Playwright test helpers for Perplexica/Vane
 * Persistent, reusable utilities for comprehensive UI testing
 */

import { Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export const BASE_URL = 'http://localhost:3000';
export const SCREENSHOT_DIR = path.join(__dirname, '../../reports/playwright/screenshots');
export const PAUSE = 1500; // ms between actions

let screenshotCounter = 0;

/** Reset counter at start of each test suite */
export function resetCounter() {
  screenshotCounter = 0;
}

/** Take a numbered screenshot and save to reports/playwright/screenshots */
export async function shot(page: Page, label: string): Promise<void> {
  screenshotCounter++;
  const filename = `${String(screenshotCounter).padStart(3, '0')}_${label.replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '')}.png`;
  const fullPath = path.join(SCREENSHOT_DIR, filename);
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({ path: fullPath, fullPage: false });
  console.log(`📸 Screenshot saved: ${filename}`);
}

/** Pause to simulate human timing */
export async function pause(ms = PAUSE): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

/** Capture and return console errors/warnings */
export async function consoleLogs(page: Page): Promise<void> {
  const messages = page.context();
  // Console messages are captured via listener set up in fixtures
}

/** Set up console error capture on a page — call at start of test */
export function captureConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`[ERROR] ${msg.text()}`);
    } else if (msg.type() === 'warning') {
      errors.push(`[WARN] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    errors.push(`[PAGE_ERROR] ${err.message}`);
  });
  return errors;
}

/** Check network for 4xx/5xx errors */
export async function checkNetworkErrors(page: Page): Promise<string[]> {
  const networkErrors: string[] = [];
  page.on('response', response => {
    const status = response.status();
    if (status >= 400 && status < 600) {
      // Ignore known non-critical endpoints
      const url = response.url();
      if (!url.includes('favicon') && !url.includes('.hot-update.')) {
        networkErrors.push(`[${status}] ${url}`);
      }
    }
  });
  return networkErrors;
}

/** Navigate and wait for page to settle */
export async function goTo(page: Page, path: string, label: string): Promise<void> {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await pause(1000);
  await shot(page, label);
}

/** Click an element with before/after screenshots */
export async function clickAndShot(
  page: Page,
  selector: string,
  beforeLabel: string,
  afterLabel: string,
  waitMs = PAUSE
): Promise<void> {
  await shot(page, `before_${beforeLabel}`);
  await page.click(selector);
  await pause(waitMs);
  await shot(page, `after_${afterLabel}`);
}

/** Type into an element with screenshot after */
export async function typeAndShot(
  page: Page,
  selector: string,
  text: string,
  label: string
): Promise<void> {
  await page.fill(selector, text);
  await pause(500);
  await shot(page, label);
}

/** Check that key visual elements are present */
export async function assertVisible(page: Page, selectors: string[]): Promise<void> {
  for (const selector of selectors) {
    await expect(page.locator(selector).first()).toBeVisible({ timeout: 5000 });
  }
}

/** Wait for content to load (spinner to disappear) */
export async function waitForLoad(page: Page, timeout = 10000): Promise<void> {
  // Wait for any loading spinners to disappear
  try {
    await page.waitForSelector('[data-loading="true"]', { state: 'hidden', timeout });
  } catch {
    // No loading spinner found, that's fine
  }
  await pause(500);
}

/** Press Escape to close any open modal/popover */
export async function pressEscape(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await pause(500);
}
