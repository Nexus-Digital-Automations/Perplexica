'use client';

import { Plus } from 'lucide-react';
import FeedUnreadBadge from './FeedUnreadBadge';

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

interface FeedListProps {
  feeds: RssFeed[];
  selectedFeedId: string | null;
  onSelect: (id: string | null) => void;
  onAddFeed: () => void;
  totalUnread: number;
}

const FeedList = ({
  feeds,
  selectedFeedId,
  onSelect,
  onAddFeed,
  totalUnread,
}: FeedListProps) => {
  return (
    <div className="flex flex-col w-[240px] shrink-0 h-full border-r border-light-200 dark:border-dark-200 bg-light-secondary dark:bg-dark-secondary overflow-y-auto">
      <div className="flex-1 overflow-y-auto py-2">
        {/* All Items row */}
        <button
          onClick={() => onSelect(null)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg mx-1 text-sm transition duration-150 ${
            selectedFeedId === null
              ? 'bg-light-200 dark:bg-dark-200 text-black dark:text-white font-medium'
              : 'text-black/70 dark:text-white/70 hover:bg-light-200 hover:dark:bg-dark-200'
          }`}
          style={{ width: 'calc(100% - 8px)' }}
        >
          <span>All Items</span>
          <FeedUnreadBadge count={totalUnread} />
        </button>

        {/* Individual feeds */}
        {feeds.map((feed) => (
          <button
            key={feed.id}
            onClick={() => onSelect(feed.id)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg mx-1 text-sm transition duration-150 ${
              selectedFeedId === feed.id
                ? 'bg-light-200 dark:bg-dark-200 text-black dark:text-white font-medium'
                : 'text-black/70 dark:text-white/70 hover:bg-light-200 hover:dark:bg-dark-200'
            }`}
            style={{ width: 'calc(100% - 8px)' }}
          >
            <span className="truncate flex-1 text-left">{feed.title}</span>
            <FeedUnreadBadge count={feed.unreadCount} className="ml-1.5 shrink-0" />
          </button>
        ))}
      </div>

      {/* Add Feed button */}
      <div className="p-3 border-t border-light-200 dark:border-dark-200">
        <button
          onClick={onAddFeed}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm text-black/70 dark:text-white/70 hover:bg-light-200 hover:dark:bg-dark-200 transition duration-150"
        >
          <Plus size={15} />
          <span>Add Feed</span>
        </button>
      </div>
    </div>
  );
};

export default FeedList;
