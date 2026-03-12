'use client';

import { useEffect, useState } from 'react';
import { UIConfigField } from '@/lib/config/types';
import SettingsField from '../SettingsField';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RssFeed {
  id: string;
  url: string;
  title: string;
  enabled: boolean;
  pollIntervalMinutes: number;
  lastFetchError: string | null;
  unreadCount: number;
}

const FeedsSettings = ({
  fields,
  values,
}: {
  fields: UIConfigField[];
  values: Record<string, any>;
}) => {
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const fetchFeeds = async () => {
    try {
      const res = await fetch('/api/feeds');
      if (!res.ok) return;
      const data = await res.json();
      setFeeds(data.feeds ?? []);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchFeeds();
  }, []);

  const handleAddFeed = async () => {
    const url = newUrl.trim();
    if (!url) return;
    setAdding(true);
    setAddError('');
    try {
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error ?? 'Failed to add feed');
        return;
      }
      setNewUrl('');
      await fetchFeeds();
    } catch {
      setAddError('Network error');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (feed: RssFeed) => {
    try {
      await fetch(`/api/feeds/${feed.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !feed.enabled }),
      });
      setFeeds((prev) =>
        prev.map((f) =>
          f.id === feed.id ? { ...f, enabled: !f.enabled } : f,
        ),
      );
    } catch {
      // silent
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/feeds/${id}`, { method: 'DELETE' });
      setFeeds((prev) => prev.filter((f) => f.id !== id));
    } catch {
      // silent
    }
  };

  return (
    <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
      {/* Config fields */}
      {fields.map((field) => (
        <SettingsField
          key={field.key}
          field={field}
          value={values?.[field.key] ?? field.default}
          dataAdd="feeds"
        />
      ))}

      {/* Feed list */}
      <div className="space-y-3">
        <h5 className="text-sm font-medium text-black dark:text-white">
          Registered Feeds
        </h5>

        {feeds.length === 0 && (
          <p className="text-xs text-black/50 dark:text-white/50">
            No feeds registered yet.
          </p>
        )}

        {feeds.map((feed) => (
          <div
            key={feed.id}
            className="flex flex-row items-center justify-between gap-3 rounded-lg border border-light-200 dark:border-dark-200 px-3 py-2"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-black dark:text-white truncate">
                {feed.title || feed.url}
              </p>
              {feed.lastFetchError && (
                <p className="text-xs text-red-500 truncate">
                  {feed.lastFetchError}
                </p>
              )}
            </div>
            <div className="flex flex-row items-center gap-2 shrink-0">
              {/* Enabled toggle */}
              <button
                onClick={() => handleToggle(feed)}
                className={cn(
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none',
                  feed.enabled
                    ? 'bg-cyan-500'
                    : 'bg-light-200 dark:bg-dark-200',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200',
                    feed.enabled ? 'translate-x-4' : 'translate-x-0',
                  )}
                />
              </button>
              {/* Delete */}
              <button
                onClick={() => handleDelete(feed.id)}
                className="p-1 rounded hover:bg-light-200 hover:dark:bg-dark-200 text-black/50 dark:text-white/50 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {/* Add feed inline */}
        <div className="flex flex-row gap-2 pt-1">
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://example.com/feed.xml"
            className="flex-1 text-sm rounded-lg border border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary px-3 py-2 text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddFeed();
            }}
          />
          <button
            onClick={handleAddFeed}
            disabled={adding || !newUrl.trim()}
            className="px-3 py-2 text-sm rounded-lg bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white transition"
          >
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>
        {addError && (
          <p className="text-xs text-red-500">{addError}</p>
        )}
      </div>
    </div>
  );
};

export default FeedsSettings;
