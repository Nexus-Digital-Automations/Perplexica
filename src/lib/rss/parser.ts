import RSSParser from 'rss-parser';
import TurndownService from 'turndown';

export interface NormalizedItem {
  guid: string;
  url: string;
  title: string;
  snippet: string;
  author: string;
  publishedAt: Date;
}

export interface FeedMeta {
  title: string;
  description: string;
  siteUrl: string;
}

export interface ParsedFeed {
  feedMeta: FeedMeta;
  items: NormalizedItem[];
}

const turndown = new TurndownService();

function stripHtml(html: string): string {
  try {
    return turndown.turndown(html);
  } catch {
    return html.replace(/<[^>]+>/g, '');
  }
}

function buildSnippet(item: {
  contentSnippet?: string;
  content?: string;
}): string {
  if (item.contentSnippet) {
    return item.contentSnippet.slice(0, 500);
  }
  if (item.content) {
    return stripHtml(item.content).slice(0, 500);
  }
  return '';
}

const parser = new RSSParser({
  timeout: 10000,
  customFields: {
    item: [
      ['dc:creator', 'dcCreator'],
      ['author', 'itemAuthor'],
    ],
  },
});

export async function parseFeed(url: string): Promise<ParsedFeed> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  let feed: Awaited<ReturnType<typeof parser.parseURL>>;
  try {
    feed = await parser.parseURL(url);
  } finally {
    clearTimeout(timer);
  }

  const feedMeta: FeedMeta = {
    title: feed.title ?? '',
    description: feed.description ?? '',
    siteUrl: feed.link ?? '',
  };

  const items: NormalizedItem[] = (feed.items ?? []).map((item) => {
    const guid =
      item.guid ??
      item.link ??
      crypto.randomUUID();

    const pubDate = item.pubDate ?? item.isoDate;
    const publishedAt = pubDate ? new Date(pubDate) : new Date();

    const author =
      (item as any).dcCreator ??
      (item as any).itemAuthor ??
      item.creator ??
      '';

    return {
      guid,
      url: item.link ?? '',
      title: item.title ?? '',
      snippet: buildSnippet(item),
      author,
      publishedAt,
    };
  });

  return { feedMeta, items };
}
