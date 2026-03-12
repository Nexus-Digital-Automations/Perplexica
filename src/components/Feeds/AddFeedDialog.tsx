'use client';

import { useState } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
import { X } from 'lucide-react';

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

interface AddFeedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onFeedAdded: (feed: RssFeed) => void;
}

const AddFeedDialog = ({ isOpen, onClose, onFeedAdded }: AddFeedDialogProps) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (isLoading) return;
    setUrl('');
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? data.message ?? 'Failed to add feed.');
        return;
      }

      onFeedAdded(data.feed ?? data);
      setUrl('');
      setError(null);
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
        <DialogPanel className="w-full max-w-md rounded-xl border border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-black dark:text-white">
              Add RSS Feed
            </h2>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="p-1 rounded-lg text-black/50 dark:text-white/50 hover:bg-light-200 hover:dark:bg-dark-200 transition duration-150 disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="feed-url"
                className="block text-sm text-black/70 dark:text-white/70 mb-1.5"
              >
                Feed URL
              </label>
              <input
                id="feed-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/feed.xml"
                disabled={isLoading}
                className="w-full px-3 py-2 rounded-lg text-sm bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 text-black dark:text-white placeholder-black/30 dark:placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg text-sm text-black/60 dark:text-white/60 hover:bg-light-200 hover:dark:bg-dark-200 transition duration-150 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !url.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-cyan-500 text-white hover:bg-cyan-600 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading && (
                  <svg
                    className="animate-spin h-3.5 w-3.5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
                {isLoading ? 'Adding…' : 'Add Feed'}
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default AddFeedDialog;
