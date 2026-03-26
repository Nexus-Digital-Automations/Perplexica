import { test, expect } from '@playwright/test';
import { shot, pause, captureConsole, goTo, resetCounter, clickAndShot, assertVisible } from './helpers';

/**
 * Comprehensive Playwright test suite for Perplexica/Vane
 * Tests every page, button, popover, modal, and feature.
 * Uses a single browser with persistent tab.
 * Takes screenshots before/after actions.
 * Captures all console logs.
 */

// Run tests independently — each gets a fresh page context
test.describe.configure({ mode: 'default' });

test.describe('Comprehensive UI tests', () => {
  test.beforeEach(async ({ page }) => {
    resetCounter();
    // Hide Next.js dev overlay that blocks clicks
    await page.addInitScript(() => {
      const hide = () => {
        const portal = document.querySelector('nextjs-portal');
        if (portal) (portal as HTMLElement).style.display = 'none';
      };
      const start = () => {
        const observer = new MutationObserver(hide);
        observer.observe(document.body, { childList: true, subtree: true });
        hide();
      };
      if (document.body) start();
      else document.addEventListener('DOMContentLoaded', start);
    });
  });

  test('Home page loads correctly', async ({ page }) => {
    const errors = captureConsole(page);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await pause(1000);
    await shot(page, 'home_page');

    // Heading
    await expect(page.locator('h2:has-text("Research begins here.")')).toBeVisible();

    // Textarea
    const textarea = page.locator('textarea[placeholder="Ask anything..."]');
    await expect(textarea).toBeVisible();

    // Send button disabled when empty
    const sendBtn = page.locator('button:has(svg.bg-background)');
    await expect(sendBtn).toBeDisabled();

    // Sidebar navigation (use first() since mobile + desktop both exist)
    await expect(page.locator('text=Home').first()).toBeVisible();
    await expect(page.locator('text=Library').first()).toBeVisible();

    // Action buttons row
    await expect(page.getByRole('button', { name: 'Research' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Response' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Citations' })).toBeVisible();

    // No errors
    const critical = errors.filter(e =>
      e.includes('[PAGE_ERROR]') && !e.includes('MutationObserver') && !e.includes('observe')
    );
    expect(critical).toHaveLength(0);
  });

  test('Research popover opens with correct fields', async ({ page }) => {
    const errors = captureConsole(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await pause(500);

    await page.getByRole('button', { name: 'Research' }).click();
    await pause(500);
    await shot(page, 'research_popover');

    await expect(page.getByText('Questions', { exact: true })).toBeVisible();
    await expect(page.getByText('Sources / question')).toBeVisible();
    await expect(page.getByText('Parallel', { exact: true })).toBeVisible();
    await expect(page.getByText('Review questions')).toBeVisible();

    const critical = errors.filter(e => e.includes('[PAGE_ERROR]'));
    expect(critical).toHaveLength(0);
  });

  test('Response popover opens with correct fields', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await pause(500);

    await page.getByRole('button', { name: 'Response' }).click();
    await pause(500);
    await shot(page, 'response_popover');

    await expect(page.locator('text=Length')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Brief' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Standard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Detailed' })).toBeVisible();
    await expect(page.locator('text=Creativity')).toBeVisible();
    await expect(page.locator('text=Budget ($/search)')).toBeVisible();
  });

  test('Citations popover opens with correct fields', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await pause(500);

    await page.getByRole('button', { name: 'Citations' }).click();
    await pause(500);
    await shot(page, 'citations_popover');

    await expect(page.getByText('Verification', { exact: true })).toBeVisible();
    await expect(page.getByText('Threshold', { exact: true })).toBeVisible();
    await expect(page.getByText('Verbatim threshold')).toBeVisible();
    await expect(page.getByText('Weak threshold')).toBeVisible();
    await expect(page.getByText('Correction retries')).toBeVisible();
    await expect(page.getByText('Correction creativity')).toBeVisible();
    await expect(page.getByText('Correction timeout')).toBeVisible();
  });

  test('Sources popover shows Web and Academic toggles', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await pause(500);

    // Sources is the 4th button in the action row (after Research, Response, Citations)
    const sourcesBtn = page.locator('button').filter({ has: page.locator('svg.lucide-globe') }).first();
    if (await sourcesBtn.isVisible()) {
      await sourcesBtn.click();
    } else {
      // Fallback: click the HeadlessUI popover button for sources
      await page.locator('[id^="headlessui-popover-button"]').nth(3).click();
    }
    await pause(500);
    await shot(page, 'sources_popover');

    await expect(page.locator('text=Web')).toBeVisible();
    await expect(page.locator('text=Academic')).toBeVisible();
  });

  test('Model selector shows available models', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await pause(500);

    // The model selector has a distinctive CPU/grid icon — find and click via evaluate
    await page.evaluate(() => {
      // Model selector is the button with lucide-cpu icon, or the one between Sources and Attach
      const btns = document.querySelectorAll('[id^="headlessui-popover-button"]');
      // The 5th popover button (0-indexed: Research, Response, Citations, Sources, ModelSelector)
      if (btns[4]) (btns[4] as HTMLElement).click();
    });
    await pause(1000);
    await shot(page, 'model_selector');

    // Check if the model search input appeared
    const searchInput = page.getByPlaceholder('Search models...');
    const isVisible = await searchInput.isVisible().catch(() => false);
    expect(isVisible).toBe(true);
  });

  test('Send button enables when text is entered', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await pause(500);

    const textarea = page.locator('textarea[placeholder="Ask anything..."]');
    await textarea.fill('test query');
    await pause(300);
    await shot(page, 'send_button_enabled');

    // Send button should now be enabled (sky-500 background)
    const sendBtn = page.locator('button.bg-sky-500');
    await expect(sendBtn).toBeEnabled();
  });

  test('Library page shows chat list', async ({ page }) => {
    const errors = captureConsole(page);

    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await pause(1500);
    await shot(page, 'library_page');

    // Heading
    await expect(page.locator('h1:has-text("Library")')).toBeVisible();

    // Subtitle
    await expect(page.locator('text=Past chats, sources, and uploads.')).toBeVisible();

    // Chat count badge
    await expect(page.locator('text=/\\d+ chats?/')).toBeVisible();

    // At least one chat item should exist (from previous tests)
    const chatLinks = page.locator('a[href^="/c/"]');
    const count = await chatLinks.count();
    expect(count).toBeGreaterThan(0);

    const critical = errors.filter(e => e.includes('[PAGE_ERROR]'));
    expect(critical).toHaveLength(0);
  });

  test('Library chat items have correct structure', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await pause(1500);

    // First chat item
    const firstChat = page.locator('a[href^="/c/"]').first();
    await expect(firstChat).toBeVisible();

    // Timestamp should be present
    await expect(page.locator('text=/\\d+ (seconds?|minutes?|hours?|days?) Ago/').first()).toBeVisible();

    // Source badges
    await expect(page.locator('text=/Web|Academic/').first()).toBeVisible();

    // Delete button
    const deleteBtn = page.locator('button:has(svg.lucide-trash-2), button:has(svg.lucide-trash)').first();
    await expect(deleteBtn).toBeVisible();
  });

  test('Settings modal opens from sidebar', async ({ page }) => {
    const errors = captureConsole(page);

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await pause(500);

    // Click settings gear — use evaluate to bypass any overlays
    await page.evaluate(() => {
      const gear = document.querySelector('svg.lucide-settings') as HTMLElement;
      if (gear) {
        const parent = gear.closest('div[class*="cursor-pointer"]') as HTMLElement;
        if (parent) parent.click();
        else gear.parentElement?.click();
      }
    });
    await pause(3000);
    await shot(page, 'settings_modal');

    // Modal should be open with dialog — wait for animation
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeAttached({ timeout: 10000 });
    // HeadlessUI Dialog may report hidden during animation; check the panel content instead
    await expect(page.locator('text=Settings').first()).toBeVisible({ timeout: 10000 });

    // Settings sections visible
    await expect(page.getByRole('button', { name: 'Preferences' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Personalization' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Models' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();

    // Version and GitHub link
    await expect(page.locator('text=/v\\d+\\.\\d+\\.\\d+/')).toBeVisible();
    await expect(page.locator('text=GitHub')).toBeVisible();

    const critical = errors.filter(e => e.includes('[PAGE_ERROR]'));
    expect(critical).toHaveLength(0);
  });

  test('Settings Preferences section shows Theme', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await pause(500);

    await page.evaluate(() => { const g = document.querySelector('svg.lucide-settings') as HTMLElement; g?.closest('div')?.click(); });
    await pause(1000);

    await page.getByRole('button', { name: 'Preferences' }).click();
    await pause(500);
    await shot(page, 'settings_preferences');

    await expect(page.locator('h2:has-text("Preferences")')).toBeVisible();
    await expect(page.locator('text=Theme')).toBeVisible();
    await expect(page.locator('text=Choose between light and dark layouts')).toBeVisible();
  });

  test('Settings Personalization section shows System Instructions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await pause(500);

    await page.evaluate(() => { const g = document.querySelector('svg.lucide-settings') as HTMLElement; g?.closest('div')?.click(); });
    await pause(1000);

    await page.getByRole('button', { name: 'Personalization' }).click();
    await pause(500);
    await shot(page, 'settings_personalization');

    await expect(page.locator('h2:has-text("Personalization")')).toBeVisible();
    await expect(page.locator('text=System Instructions')).toBeVisible();
  });

  test('Settings Models section shows active models and connections', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await pause(500);

    await page.evaluate(() => { const g = document.querySelector('svg.lucide-settings') as HTMLElement; g?.closest('div')?.click(); });
    await pause(1000);

    await page.getByRole('button', { name: 'Models' }).click();
    await pause(500);
    await shot(page, 'settings_models');

    await expect(page.locator('h2:has-text("Models")')).toBeVisible();
    await expect(page.locator('text=Select Chat Model')).toBeVisible();
    await expect(page.locator('text=Select Embedding Model')).toBeVisible();
    await expect(page.getByText('Connections', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Connection' })).toBeVisible();
  });

  test('Settings Search section shows SearXNG URL with connection status', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await pause(500);

    await page.evaluate(() => { const g = document.querySelector('svg.lucide-settings') as HTMLElement; g?.closest('div')?.click(); });
    await pause(1000);

    await page.getByRole('button', { name: 'Search' }).click();
    await pause(2000); // Wait for connection test
    await shot(page, 'settings_search');

    await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible();
    await expect(page.locator('text=SearXNG URL')).toBeVisible();
    await expect(page.locator('input[placeholder="http://localhost:4000"]')).toBeVisible();
  });

  test('Settings modal closes with Back button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await pause(500);

    await page.evaluate(() => { const g = document.querySelector('svg.lucide-settings') as HTMLElement; g?.closest('div')?.click(); });
    await pause(1000);
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByRole('button', { name: 'Back' }).click();
    await pause(500);
    await shot(page, 'settings_closed');

    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('Keyboard shortcut "/" focuses textarea', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await pause(500);

    // Click somewhere else first to unfocus
    await page.locator('h2:has-text("Research begins here.")').click();
    await pause(300);

    // Press "/" to focus
    await page.keyboard.press('/');
    await pause(300);

    const textarea = page.locator('textarea[placeholder="Ask anything..."]');
    await expect(textarea).toBeFocused();
  });

  test('Navigating to Library via sidebar works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await pause(500);

    await page.locator('a[href="/library"]').first().click();
    await page.waitForLoadState('networkidle');
    await pause(1000);
    await shot(page, 'library_via_sidebar');

    expect(page.url()).toContain('/library');
    await expect(page.locator('h1:has-text("Library")')).toBeVisible();
  });

  test('Navigating to Home via sidebar works', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await pause(500);

    await page.locator('a[href="/"]').first().click();
    await page.waitForLoadState('networkidle');
    await pause(1000);
    await shot(page, 'home_via_sidebar');

    await expect(page.locator('h2:has-text("Research begins here.")')).toBeVisible();
  });

  test('New Chat button returns to home', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await pause(500);

    // Plus button at top of sidebar
    await page.locator('a[href="/"]').first().click();
    await page.waitForLoadState('networkidle');
    await pause(1000);

    expect(page.url()).toBe('http://localhost:3000/');
  });

  test('No console errors on any page', async ({ page }) => {
    const errors = captureConsole(page);

    // Home
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await pause(1000);

    // Library
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await pause(1000);

    const criticalErrors = errors.filter(e =>
      (e.includes('[PAGE_ERROR]') && !e.includes('MutationObserver') && !e.includes('observe')) ||
      (e.includes('[ERROR]') && !e.includes('favicon') && !e.includes('HMR') && !e.includes('MutationObserver'))
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
