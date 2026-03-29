import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchAndExtract } from '@/lib/utils/fetchPageContent';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const makeHtmlResponse = (body: string) => ({
  ok: true,
  headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
  text: async () =>
    `<html><head><title>Test</title></head><body>${body}</body></html>`,
});

describe('fetchAndExtract', () => {
  it('returns enriched content from a fetched page', async () => {
    const bodyText =
      '<p>The Eiffel Tower was completed in 1889 for the World\'s Fair in Paris. ' +
      'It stands 330 meters tall and is the most visited paid monument in the world. ' +
      'Gustave Eiffel\'s company designed and built the tower over two years.</p>';

    mockFetch.mockResolvedValueOnce(makeHtmlResponse(bodyText));

    const result = await fetchAndExtract(
      'https://example.com/eiffel',
      'Eiffel Tower 1889',
      3,
      'short fallback',
    );

    expect(result.length).toBeGreaterThan(50);
    expect(result).toContain('Eiffel Tower');
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('returns fallback when fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchAndExtract(
      'https://example.com/fail',
      'test query',
      3,
      'original snippet',
    );

    expect(result).toBe('original snippet');
  });

  it('returns fallback for non-HTML content type', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/pdf' }),
      text: async () => 'binary data',
    });

    const result = await fetchAndExtract(
      'https://example.com/doc.pdf',
      'test',
      3,
      'fallback',
    );

    expect(result).toBe('fallback');
  });

  it('returns fallback for non-OK response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<html>error</html>',
    });

    const result = await fetchAndExtract(
      'https://example.com/404',
      'test',
      3,
      'fallback',
    );

    expect(result).toBe('fallback');
  });

  it('returns fallback for very short HTML', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<html><body>hi</body></html>',
    });

    const result = await fetchAndExtract(
      'https://example.com/tiny',
      'test',
      3,
      'fallback',
    );

    expect(result).toBe('fallback');
  });

  it('selects most relevant chunks from multi-paragraph page', async () => {
    const paragraphs = [
      '<p>Quantum computing uses qubits instead of classical bits. Qubits can exist in superposition states.</p>',
      '<p>The weather in Paris is generally mild with warm summers and cool winters. Rainfall averages 650mm annually.</p>',
      '<p>Quantum entanglement allows qubits to be correlated. This enables quantum speedups for certain algorithms.</p>',
      '<p>French cuisine is famous worldwide. The country produces over 400 types of cheese.</p>',
      '<p>Error correction in quantum computing remains a major challenge. Logical qubits require many physical qubits.</p>',
    ];

    mockFetch.mockResolvedValueOnce(
      makeHtmlResponse(paragraphs.join('\n')),
    );

    const result = await fetchAndExtract(
      'https://example.com/qc',
      'quantum computing qubits',
      2,
      'fallback',
    );

    // Should contain quantum-related content, not weather/cheese
    expect(result.toLowerCase()).toContain('quantum');
    expect(result.toLowerCase()).toContain('qubit');
  });
});
