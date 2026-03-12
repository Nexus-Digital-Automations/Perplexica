'use client';

import { useEffect, useState, useCallback } from 'react';
import FeedList from '@/components/Feeds/FeedList';
import FeedItemsList from '@/components/Feeds/FeedItemsList';
import AddFeedDialog from '@/components/Feeds/AddFeedDialog';

interface RssFeed {
  id: string;
  url: string;
  title: string;
  description: string;
  siteUrl: string;
  enabled: boolean;
  pollIntervalMinutes: number;
  lastFetchedAt: string | null;
  lastFetchError: string | null;
  createdAt: string;
  unreadCount: number;
}

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

export default function FeedsPage() {
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  const fetchFeeds = useCallback(async () => {
    try {
      const res = await fetch('/api/feeds');
      if (!res.ok) return;
      const data = await res.json();
      setFeeds(data.feeds ?? []);
      setTotalUnread(data.totalUnread ?? 0);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchFeeds();
    const interval = setInterval(fetchFeeds, 60_000);
    return () => clearInterval(interval);
  }, [fetchFeeds]);

  const handleFeedAdded = useCallback(
    (feed: RssFeed) => {
      setFeeds((prev) => [...prev, { ...feed, unreadCount: 0 }]);
      fetchFeeds();
    },
    [fetchFeeds],
  );

  const handleItemUpdate = useCallback(
    (id: string, changes: Partial<RssItem>) => {
      if (changes.isRead === true) {
        setFeeds((prev) =>
          prev.map((f) => {
            if (f.id === selectedFeedId || selectedFeedId === null) {
              return { ...f, unreadCount: Math.max(0, f.unreadCount - 1) };
            }
            return f;
          }),
        );
        setTotalUnread((prev) => Math.max(0, prev - 1));
      }
    },
    [selectedFeedId],
  );

  return (
    <div className="flex flex-row h-full min-h-screen">
      {/* Left panel */}
      <div className="w-60 shrink-0 border-r border-light-200 dark:border-dark-200 h-full overflow-y-auto">
        <FeedList
          feeds={feeds}
          selectedFeedId={selectedFeedId}
          onSelect={setSelectedFeedId}
          onAddFeed={() => setIsAddDialogOpen(true)}
          totalUnread={totalUnread}
        />
      </div>

      {/* Right panel */}
      <div className="flex-1 overflow-y-auto">
        <FeedItemsList
          feedId={selectedFeedId}
          onItemUpdate={handleItemUpdate}
        />
      </div>

      <AddFeedDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onFeedAdded={handleFeedAdded}
      />
    </div>
  );
}
