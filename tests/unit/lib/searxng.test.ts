import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchSearxng, clearSearxngCache } from '@/lib/searxng';
import { getSearxngURL } from '@/lib/config/serverRegistry';

// Mock dependencies
vi.mock('@/lib/config/serverRegistry', () => ({
  getSearxngURL: vi.fn(),
}));

// Mock global fetch
global.fetch = vi.fn();

const mockGetSearxngURL = getSearxngURL as ReturnType<typeof vi.fn>;

describe('searxng', () => {
  let mockFetch: any;

  beforeEach(() => {
    clearSearxngCache();
    mockFetch = global.fetch as any;
    vi.clearAllMocks();

    // Default mock setup
    mockGetSearxngURL.mockReturnValue('https://searx.example.com');
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ results: [], suggestions: [] }),
    });
  });

  describe('searchSearxng', () => {
    it('should return empty results when no SearXNG URL is configured', async () => {
      mockGetSearxngURL.mockReturnValue(null);

      const result = await searchSearxng('test query');

      expect(result).toEqual({
        results: [],
        suggestions: [],
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should perform search with basic query', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            { title: 'Result 1', url: 'https://example.com/1' },
            { title: 'Result 2', url: 'https://example.com/2' },
          ],
          suggestions: ['suggestion 1', 'suggestion 2'],
        }),
      });

      const result = await searchSearxng('test query');

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Get the URL that was called
      const [url, options] = mockFetch.mock.calls[0];
      expect(url.toString()).toContain('https://searx.example.com/search');
      expect(url.toString()).toContain('format=json');
      expect(url.toString()).toContain('q=');
      
      // Verify options
      expect(options).toHaveProperty('signal');
      expect(options.signal).toBeInstanceOf(AbortSignal);

      expect(result).toEqual({
        results: [
          { title: 'Result 1', url: 'https://example.com/1' },
          { title: 'Result 2', url: 'https://example.com/2' },
        ],
        suggestions: ['suggestion 1', 'suggestion 2'],
      });
    });

    it('should include search options in URL', async () => {
      await searchSearxng('test query', {
        categories: ['news', 'images'],
        language: 'en',
        pageno: 2,
      });

      const [url] = mockFetch.mock.calls[0];
      const urlStr = url.toString();
      expect(urlStr).toContain('categories=news%2Cimages');
      expect(urlStr).toContain('language=en');
      expect(urlStr).toContain('pageno=2');
    });

    it('should handle array options correctly', async () => {
      await searchSearxng('test', { categories: ['news'] });

      const [url] = mockFetch.mock.calls[0];
      expect(url.toString()).toContain('categories=news');
    });

    it('should handle single string options', async () => {
      await searchSearxng('test', { language: 'fr' });

      const [url] = mockFetch.mock.calls[0];
      expect(url.toString()).toContain('language=fr');
    });

    it('should throw error on fetch failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(searchSearxng('test query')).rejects.toThrow(
        'SearXNG error: Not Found'
      );
    });

    it('should throw timeout error', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject({ name: 'AbortError' }), 10);
          })
      );

      await expect(searchSearxng('test query')).rejects.toThrow(
        'SearXNG search timed out'
      );
    });

    it('should handle other fetch errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(searchSearxng('test query')).rejects.toThrow('Network error');
    });

    it('should return results and suggestions from response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            { title: 'Test Result', url: 'https://test.com', content: 'Test content' },
          ],
          suggestions: ['suggestion 1', 'suggestion 2'],
        }),
      });

      const result = await searchSearxng('test query');

      expect(result).toEqual({
        results: [
          { title: 'Test Result', url: 'https://test.com', content: 'Test content' },
        ],
        suggestions: ['suggestion 1', 'suggestion 2'],
      });
    });
  });
});