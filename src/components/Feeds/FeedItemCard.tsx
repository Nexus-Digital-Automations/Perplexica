'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';

interface RssItem {
  id: string;
  feedId: string;
  guid: string;
  url: string;
  title: string;
  snippet: string;
  author: string;
  publishedAt: string;
  fetchedAt: string;
  isRead: boolean;
  importanceScore: number;
  isImportant: boolean;
  isDismissed: boolean;
  feedTitle: string;
}

interface FeedItemCardProps {
  item: RssItem;
  onUpdate: (id: string, changes: Partial<RssItem>) => void;
}

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const FeedItemCard = ({ item, onUpdate }: FeedItemCardProps) => {
  const router = useRouter();
  const [isResearching, setIsResearching] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const handleTitleClick = async () => {
    if (!item.isRead) {
      onUpdate(item.id, { isRead: true });
      await fetch(`/api/feeds/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });
    }
    try {
      const res = await fetch(`/api/feeds/items/${item.id}/research`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.redirectUrl) {
          router.push(data.redirectUrl);
          return;
        }
      }
    } catch {
      // fall through to direct URL
    }
    window.open(item.url, '_blank', 'noopener,noreferrer');
  };

  const handleToggleImportant = async () => {
    const next = !item.isImportant;
    onUpdate(item.id, { isImportant: next });
    await fetch(`/api/feeds/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isImportant: next }),
    });
  };

  const handleResearch = async () => {
    setIsResearching(true);
    try {
      if (!item.isRead) {
        onUpdate(item.id, { isRead: true });
        await fetch(`/api/feeds/items/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true }),
        });
      }
      const res = await fetch(`/api/feeds/items/${item.id}/research`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.redirectUrl) {
          router.push(data.redirectUrl);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsResearching(false);
    }
  };

  const handleDismiss = async () => {
    setIsDismissing(true);
    try {
      onUpdate(item.id, { isDismissed: true, isRead: true });
      await fetch(`/api/feeds/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDismissed: true, isRead: true }),
      });
    } catch {
      // ignore
    } finally {
      setIsDismissing(false);
    }
  };

  return (
    <div className="rounded-xl bg-light-secondary dark:bg-dark-secondary p-4 border border-light-200 dark:border-dark-200">
      <div className="flex items-start justify-between gap-2">
        <button
          onClick={handleTitleClick}
          className={`flex-1 text-left text-sm hover:underline ${
            item.isRead
              ? 'font-normal text-black/70 dark:text-white/70'
              : 'font-semibold text-black dark:text-white'
          }`}
        >
          {item.title}
        </button>
        <button
          onClick={handleToggleImportant}
          className="flex-shrink-0 p-1 rounded hover:bg-light-200 hover:dark:bg-dark-200 transition duration-150"
          title={item.isImportant ? 'Unstar' : 'Star'}
        >
          <Star
            size={16}
            className={
              item.isImportant
                ? 'fill-current text-cyan-500'
                : 'text-black/40 dark:text-white/40'
            }
          />
        </button>
      </div>

      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-black/50 dark:text-white/50">
        <span className="font-medium text-black/60 dark:text-white/60">
          {item.feedTitle}
        </span>
        {item.author && (
          <>
            <span>·</span>
            <span>{item.author}</span>
          </>
        )}
        <span>·</span>
        <span>{relativeTime(item.publishedAt)}</span>
      </div>

      {item.snippet && (
        <p className="mt-2 text-xs text-black/60 dark:text-white/60 line-clamp-2">
          {item.snippet}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={handleResearch}
          disabled={isResearching}
          className="text-xs px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 transition duration-150 disabled:opacity-50"
        >
          {isResearching ? 'Opening…' : 'Research'}
        </button>
        <button
          onClick={handleDismiss}
          disabled={isDismissing}
          className="text-xs px-2.5 py-1 rounded-lg text-black/50 dark:text-white/50 hover:bg-light-200 hover:dark:bg-dark-200 transition duration-150 disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default FeedItemCard;
