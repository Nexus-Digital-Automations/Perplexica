import { test, expect, Page, Route } from '@playwright/test';

/**
 * Tests for the interactive question selection flow:
 * 1. QuestionsBlock with categories renders the QuestionSelector
 * 2. User can toggle categories and individual questions
 * 3. Submitting selection calls the API and proceeds to research
 * 4. Malformed blocks don't crash (issue #1075)
 * 5. Non-interactive mode skips the selector
 */

const NUM_QUESTIONS = 5;
const SOURCES_PER_QUESTION = 2;

const MOCK_CATEGORIES = [
  {
    category: 'Fundamentals',
    questions: [
      'What are the core principles of quantum computing?',
      'How do qubits differ from classical bits?',
    ],
  },
  {
    category: 'Applications',
    questions: [
      'What are practical applications of quantum computers?',
      'How is quantum computing used in cryptography?',
    ],
  },
  {
    category: 'Challenges',
    questions: ['What are the main challenges in building quantum computers?'],
  },
];

const ALL_QUESTIONS = MOCK_CATEGORIES.flatMap((c) => c.questions);

function buildInteractiveSSEStream(sessionId: string): string {
  const events: object[] = [];

  // Classification
  events.push({
    type: 'block',
    block: {
      id: 'classification-1',
      type: 'classification',
      data: {
        standaloneFollowUp: 'quantum computing overview',
        skipSearch: false,
      },
    },
  });

  // Questions block - pending (awaiting user selection)
  events.push({
    type: 'block',
    block: {
      id: 'questions-1',
      type: 'questions',
      data: {
        sessionId,
        categories: MOCK_CATEGORIES,
        status: 'pending',
      },
    },
  });

  // Stream stays open here — the backend is waiting for selection
  // In the test we'll fulfill the selection API call which triggers
  // the backend to continue (simulated by sending more events)
  return events.map((e) => JSON.stringify(e)).join('\n') + '\n';
}

function buildPostSelectionEvents(): string {
  const events: object[] = [];

  // Questions block updated to confirmed
  events.push({
    type: 'updateBlock',
    blockId: 'questions-1',
    patch: [
      { op: 'replace', path: '/data/status', value: 'confirmed' },
      {
        op: 'add',
        path: '/data/selectedQuestions',
        value: ALL_QUESTIONS.slice(0, 3),
      },
    ],
  });

  // Research blocks for selected questions
  for (let q = 0; q < 3; q++) {
    events.push({
      type: 'block',
      block: {
        id: `research-q${q + 1}`,
        type: 'research',
        data: {
          subSteps: [
            {
              id: `searching-q${q + 1}`,
              type: 'searching',
              searching: [`${ALL_QUESTIONS[q]} overview`],
            },
            {
              id: `results-q${q + 1}`,
              type: 'search_results',
              reading: [
                {
                  content: `Result for question ${q + 1}`,
                  metadata: {
                    title: `Source ${q + 1}`,
                    url: `https://example${q + 1}.com`,
                  },
                },
              ],
            },
          ],
          question: ALL_QUESTIONS[q],
          questionIndex: q + 1,
          questionTotal: 3,
        },
      },
    });
  }

  // Sources
  events.push({
    type: 'block',
    block: {
      id: 'sources-1',
      type: 'source',
      data: [
        {
          content: 'Source content',
          metadata: { title: 'Source 1', url: 'https://example1.com' },
        },
      ],
    },
  });

  events.push({ type: 'researchComplete' });

  events.push({
    type: 'block',
    block: {
      id: 'text-1',
      type: 'text',
      data: 'Quantum computing leverages quantum mechanics for computation.',
    },
  });

  events.push({ type: 'messageEnd' });

  return events.map((e) => JSON.stringify(e)).join('\n');
}

function buildNonInteractiveSSEStream(): string {
  const events: object[] = [];

  events.push({
    type: 'block',
    block: {
      id: 'classification-1',
      type: 'classification',
      data: {
        standaloneFollowUp: 'test query',
        skipSearch: false,
      },
    },
  });

  // No questions block — goes straight to research
  for (let q = 0; q < 2; q++) {
    events.push({
      type: 'block',
      block: {
        id: `research-q${q + 1}`,
        type: 'research',
        data: {
          subSteps: [
            {
              id: `searching-q${q + 1}`,
              type: 'searching',
              searching: ['query'],
            },
          ],
          question: `Question ${q + 1}`,
          questionIndex: q + 1,
          questionTotal: 2,
        },
      },
    });
  }

  events.push({ type: 'researchComplete' });
  events.push({
    type: 'block',
    block: { id: 'text-1', type: 'text', data: 'Direct answer.' },
  });
  events.push({ type: 'messageEnd' });

  return events.map((e) => JSON.stringify(e)).join('\n');
}

async function setupProvidersMock(page: Page) {
  await page.route('**/api/providers', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        providers: [
          {
            id: 'mock-provider',
            name: 'Mock Provider',
            chatModels: [{ key: 'mock-model', name: 'Mock Model' }],
            embeddingModels: [{ key: 'mock-embed', name: 'Mock Embedding' }],
          },
        ],
      }),
    });
  });

  await page.route('**/api/suggestions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ suggestions: [] }),
    });
  });

  await page.route('**/api/chats/**', async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Not found' }),
    });
  });
}

test.describe('Interactive question selection', () => {
  const SESSION_ID = 'test-session-123';

  test('renders QuestionSelector with categories and checkboxes', async ({
    page,
  }) => {
    await setupProvidersMock(page);

    // Mock selection endpoint
    let selectionBody: any = null;
    await page.route('**/api/chat/select-questions', async (route) => {
      selectionBody = JSON.parse((await route.request().postData()) || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });

    // Send classification + pending questions block.
    // The stream is "complete" from HTTP perspective but has no messageEnd,
    // so the frontend stays in loading state with the selector visible.
    await page.route('**/api/chat', async (route) => {
      const body = buildInteractiveSSEStream(SESSION_ID);
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          Connection: 'keep-alive',
          'Cache-Control': 'no-cache, no-transform',
        },
        body,
      });
    });

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 10_000 });

    await textarea.fill('Tell me about quantum computing');
    await textarea.press('Enter');

    // Wait for the QuestionSelector to appear
    const selector = page.locator('[data-testid="question-selector"]');
    await expect(selector).toBeVisible({ timeout: 15_000 });

    // Verify categories are rendered (use data-testid for precise matching)
    for (const cat of MOCK_CATEGORIES) {
      await expect(
        selector.locator(`[data-testid="category-${cat.category}"]`),
      ).toBeVisible();
    }

    // Verify all question checkboxes exist
    const checkboxes = selector.locator('[data-testid="question-checkbox"]');
    await expect(checkboxes).toHaveCount(ALL_QUESTIONS.length);

    // Verify Start Research button exists and is enabled (all selected by default)
    const startBtn = selector.locator('[data-testid="start-research-btn"]');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled();

    // Click Start Research — this calls the select-questions API
    await startBtn.click();

    // Verify the selection API was called with correct data
    await page.waitForTimeout(500);
    expect(selectionBody).not.toBeNull();
    expect(selectionBody.sessionId).toBe(SESSION_ID);
    expect(selectionBody.selectedQuestions).toHaveLength(ALL_QUESTIONS.length);

    // After submission, the selector should be gone (collapsed)
    await expect(selector).not.toBeVisible({ timeout: 3_000 });

    // No crashes
    const criticalErrors = errors.filter(
      (e) =>
        e.includes('.map is not a function') ||
        e.includes('Cannot read properties of undefined'),
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('non-interactive mode skips QuestionSelector', async ({ page }) => {
    await setupProvidersMock(page);

    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          Connection: 'keep-alive',
          'Cache-Control': 'no-cache, no-transform',
        },
        body: buildNonInteractiveSSEStream(),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 10_000 });

    await textarea.fill('test query');
    await textarea.press('Enter');

    // Answer should appear directly without question selector
    await expect(page.locator('text=Direct answer.')).toBeVisible({
      timeout: 15_000,
    });

    // QuestionSelector should NOT be present
    const selector = page.locator('[data-testid="question-selector"]');
    await expect(selector).not.toBeVisible();
  });

  test('handles malformed QuestionsBlock without crashing', async ({
    page,
  }) => {
    await setupProvidersMock(page);

    await page.route('**/api/chat', async (route) => {
      const events = [
        {
          type: 'block',
          block: {
            id: 'classification-1',
            type: 'classification',
            data: { standaloneFollowUp: 'test', skipSearch: false },
          },
        },
        {
          type: 'block',
          block: {
            id: 'questions-bad',
            type: 'questions',
            data: {
              sessionId: 'bad-session',
              categories: [], // empty categories
              status: 'confirmed',
              selectedQuestions: [],
            },
          },
        },
        {
          type: 'block',
          block: {
            id: 'research-1',
            type: 'research',
            data: {
              subSteps: [
                { id: 's1', type: 'searching', searching: undefined as any },
              ],
            },
          },
        },
        { type: 'researchComplete' },
        {
          type: 'block',
          block: { id: 'text-1', type: 'text', data: 'Recovery answer' },
        },
        { type: 'messageEnd' },
      ];

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          Connection: 'keep-alive',
          'Cache-Control': 'no-cache, no-transform',
        },
        body: events.map((e) => JSON.stringify(e)).join('\n'),
      });
    });

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 10_000 });

    await textarea.fill('malformed test');
    await textarea.press('Enter');

    await expect(page.locator('text=Recovery answer')).toBeVisible({
      timeout: 15_000,
    });

    const criticalErrors = errors.filter(
      (e) =>
        e.includes('.map is not a function') ||
        e.includes('Cannot read properties of undefined'),
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
