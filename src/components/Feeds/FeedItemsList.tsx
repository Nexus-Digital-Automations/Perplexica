'use client';

import { useEffect, useState, useCallback } from 'react';
import FeedItemCard from './FeedItemCard';

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

type Filter = 'all' | 'unread' | 'important';

interface FeedItemsListProps {
  feedId: string | null;
  onItemUpdate: (id: string, changes: Partial<RssItem>) => void;
}

const FeedItemsList = ({ feedId, onItemUpdate }: FeedItemsListProps) => {
  const [items, setItems] = useState<RssItem[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (feedId) params.set('feedId', feedId);
      if (filter !== 'all') params.set('filter', filter);

      const res = await fetch(`/api/feeds/items?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? data ?? []);
      }
    } catch {
      // ignore fetch errors
    } finally {
      setIsLoading(false);
    }
  }, [feedId, filter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleItemUpdate = (id: string, changes: Partial<RssItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
    onItemUpdate(id, changes);
  };

  const handleMarkAllRead = async () => {
    const unreadItems = items.filter((item) => !item.isRead);
    if (unreadItems.length === 0) return;

    setIsMarkingAllRead(true);
    try {
      await Promise.all(
        unreadItems.map((item) =>
          fetch(`/api/feeds/items/${item.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isRead: true }),
          }),
        ),
      );
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
      unreadItems.forEach((item) => onItemUpdate(item.id, { isRead: true }));
    } catch {
      // ignore
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const visibleItems = items.filter((item) => !item.isDismissed);
  const unreadCount = items.filter((item) => !item.isRead).length;

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-light-200 dark:border-dark-200 shrink-0">
        <div className="flex items-center gap-1">
          {(['all', 'unread', 'important'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize transition duration-150 ${
                filter === f
                  ? 'bg-light-200 dark:bg-dark-200 text-black dark:text-white font-medium'
                  : 'text-black/60 dark:text-white/60 hover:bg-light-200 hover:dark:bg-dark-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={isMarkingAllRead}
            className="text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition duration-150 disabled:opacity-50"
          >
            {isMarkingAllRead ? 'Marking…' : 'Mark all read'}
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <p className="text-center text-black/50 dark:text-white/50 py-12 text-sm">
            Loading…
          </p>
        ) : visibleItems.length === 0 ? (
          <p className="text-center text-black/50 dark:text-white/50 py-12">
            No items
          </p>
        ) : (
          visibleItems.map((item) => (
            <FeedItemCard key={item.id} item={item} onUpdate={handleItemUpdate} />
          ))
        )}
      </div>
    </div>
  );
};

export default FeedItemsList;
