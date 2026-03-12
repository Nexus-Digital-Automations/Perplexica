'use client';

import { Bookmark, Globe2Icon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import SmallNewsCard from '@/components/Discover/SmallNewsCard';
import MajorNewsCard from '@/components/Discover/MajorNewsCard';
import TopicSelector from '@/components/Discover/TopicSelector';
import { getAllLeaves } from '@/lib/discover/taxonomy';

export interface Discover {
  title: string;
  content: string;
  url: string;
  thumbnail: string;
}

interface SavedArticle {
  id: number;
  articleUrl: string;
  articleTitle: string | null;
  articleThumbnail: string | null;
  topicKey: string | null;
  createdAt: string | null;
}

type InteractionMap = Record<
  string,
  { like: boolean; dislike: boolean; save: boolean }
>;

const DEFAULT_LEAF = getAllLeaves()[0];

const Page = () => {
  const [discover, setDiscover] = useState<Discover[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [topicKey, setTopicKey] = useState<string>(DEFAULT_LEAF?.key ?? 'tech');
  const [topicDisplay, setTopicDisplay] = useState<string>(
    DEFAULT_LEAF?.display ?? 'Machine Learning',
  );
  const [savedMode, setSavedMode] = useState(false);
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [interactions, setInteractions] = useState<InteractionMap>({});

  const fetchInteractions = useCallback(async (urls: string[]) => {
    if (urls.length === 0) return;
    try {
      const params = new URLSearchParams();
      urls.forEach((u) => params.append('url', u));
      // We build interaction state client-side from the saved/like/dislike endpoints
      // For initial hydration, fetch all saved articles and stored interactions
      const [savedRes] = await Promise.all([
        fetch('/api/discover/saved'),
      ]);
      if (savedRes.ok) {
        const { articles } = await savedRes.json();
        const map: InteractionMap = {};
        for (const url of urls) {
          map[url] = { like: false, dislike: false, save: false };
        }
        for (const art of articles as SavedArticle[]) {
          if (map[art.articleUrl]) {
            map[art.articleUrl].save = true;
          }
        }
        setInteractions((prev) => ({ ...prev, ...map }));
      }
    } catch {
      // ignore hydration errors
    }
  }, []);

  const fetchArticles = useCallback(
    async (key: string) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/discover?topic=${encodeURIComponent(key)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message);
        }

        const filtered: Discover[] = (data.blogs as Discover[]).filter(
          (blog) => blog.thumbnail,
        );
        setDiscover(filtered);
        await fetchInteractions(filtered.map((b) => b.url));
      } catch (err: any) {
        console.error('Error fetching data:', err.message);
        toast.error('Error fetching data');
      } finally {
        setLoading(false);
      }
    },
    [fetchInteractions],
  );

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/discover/saved');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSavedArticles(data.articles ?? []);
    } catch (err: any) {
      console.error('Error fetching saved:', err.message);
      toast.error('Error fetching saved articles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (savedMode) {
      fetchSaved();
    } else {
      fetchArticles(topicKey);
    }
  }, [topicKey, savedMode, fetchArticles, fetchSaved]);

  const handleTopicChange = (key: string, display: string) => {
    setTopicKey(key);
    setTopicDisplay(display);
    setSavedMode(false);
  };

  const handleSaveChange = (url: string, saved: boolean) => {
    setInteractions((prev) => ({
      ...prev,
      [url]: { ...(prev[url] ?? { like: false, dislike: false, save: false }), save: saved },
    }));
    if (savedMode && !saved) {
      setSavedArticles((prev) => prev.filter((a) => a.articleUrl !== url));
    }
  };

  // Convert saved articles to Discover items for rendering
  const savedAsDiscover: Discover[] = savedArticles
    .filter((a) => a.articleTitle && a.articleThumbnail)
    .map((a) => ({
      title: a.articleTitle ?? '',
      content: '',
      url: a.articleUrl,
      thumbnail: a.articleThumbnail ?? '',
    }));

  const displayItems = savedMode ? savedAsDiscover : discover;

  const renderCards = (items: Discover[], mobile: boolean) => {
    if (mobile) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item, i) => (
            <SmallNewsCard
              key={`mobile-${i}`}
              item={item}
              topicKey={topicKey}
              interactions={interactions[item.url]}
              onSaveChange={(s) => handleSaveChange(item.url, s)}
            />
          ))}
        </div>
      );
    }

    // Desktop alternating layout
    const sections: React.ReactNode[] = [];
    let index = 0;

    while (index < items.length) {
      if (sections.length > 0) {
        sections.push(
          <hr
            key={`sep-${index}`}
            className="border-t border-light-200/20 dark:border-dark-200/20 my-3 w-full"
          />,
        );
      }

      if (index < items.length) {
        sections.push(
          <MajorNewsCard
            key={`major-${index}`}
            item={items[index]}
            isLeft={false}
            topicKey={topicKey}
            interactions={interactions[items[index].url]}
            onSaveChange={(s) => handleSaveChange(items[index].url, s)}
          />,
        );
        index++;
      }

      if (index < items.length) {
        sections.push(
          <hr
            key={`sep-${index}-after`}
            className="border-t border-light-200/20 dark:border-dark-200/20 my-3 w-full"
          />,
        );
      }

      if (index < items.length) {
        const smallCards = items.slice(index, index + 3);
        sections.push(
          <div
            key={`small-group-${index}`}
            className="grid lg:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-4"
          >
            {smallCards.map((item, i) => (
              <SmallNewsCard
                key={`small-${index + i}`}
                item={item}
                topicKey={topicKey}
                interactions={interactions[item.url]}
                onSaveChange={(s) => handleSaveChange(item.url, s)}
              />
            ))}
          </div>,
        );
        index += 3;
      }

      if (index < items.length) {
        sections.push(
          <hr
            key={`sep-${index}-after-small`}
            className="border-t border-light-200/20 dark:border-dark-200/20 my-3 w-full"
          />,
        );
      }

      if (index < items.length - 1) {
        const twoMajorCards = items.slice(index, index + 2);
        twoMajorCards.forEach((item, i) => {
          sections.push(
            <MajorNewsCard
              key={`double-${index + i}`}
              item={item}
              isLeft={i === 0}
              topicKey={topicKey}
              interactions={interactions[item.url]}
              onSaveChange={(s) => handleSaveChange(item.url, s)}
            />,
          );
          if (i === 0) {
            sections.push(
              <hr
                key={`sep-double-${index + i}`}
                className="border-t border-light-200/20 dark:border-dark-200/20 my-3 w-full"
              />,
            );
          }
        });
        index += 2;
      } else if (index < items.length) {
        sections.push(
          <MajorNewsCard
            key={`final-major-${index}`}
            item={items[index]}
            isLeft={true}
            topicKey={topicKey}
            interactions={interactions[items[index].url]}
            onSaveChange={(s) => handleSaveChange(items[index].url, s)}
          />,
        );
        index++;
      }

      if (index < items.length) {
        sections.push(
          <hr
            key={`sep-${index}-after-major`}
            className="border-t border-light-200/20 dark:border-dark-200/20 my-3 w-full"
          />,
        );
      }

      if (index < items.length) {
        const smallCards = items.slice(index, index + 3);
        sections.push(
          <div
            key={`small-group-2-${index}`}
            className="grid lg:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-4"
          >
            {smallCards.map((item, i) => (
              <SmallNewsCard
                key={`small-2-${index + i}`}
                item={item}
                topicKey={topicKey}
                interactions={interactions[item.url]}
                onSaveChange={(s) => handleSaveChange(item.url, s)}
              />
            ))}
          </div>,
        );
        index += 3;
      }
    }

    return sections;
  };

  const isEmpty = !loading && (displayItems === null || displayItems.length === 0);

  return (
    <>
      <div>
        <div className="flex flex-col pt-10 border-b border-light-200/20 dark:border-dark-200/20 pb-6 px-2">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center justify-center">
              <Globe2Icon size={45} className="mb-2.5" />
              <h1
                className="text-5xl font-normal p-2"
                style={{ fontFamily: 'PP Editorial, serif' }}
              >
                Discover
              </h1>
            </div>
            <div className="flex flex-row items-center gap-2">
              <TopicSelector
                selectedKey={topicKey}
                onSelect={handleTopicChange}
              />
              <button
                type="button"
                title="Saved articles"
                onClick={() => setSavedMode((m) => !m)}
                className={cn(
                  'border-[0.1px] rounded-full p-2 transition duration-200 cursor-pointer',
                  savedMode
                    ? 'text-cyan-700 dark:text-cyan-300 bg-cyan-300/20 border-cyan-700/60 dark:border-cyan-300/40'
                    : 'border-black/30 dark:border-white/30 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:border-black/40 dark:hover:border-white/40 hover:bg-black/5 dark:hover:bg-white/5',
                )}
              >
                <Bookmark size={15} fill={savedMode ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>
          {savedMode && (
            <p className="text-xs text-black/40 dark:text-white/40 mt-2 text-center lg:text-right">
              Saved articles
            </p>
          )}
          {!savedMode && topicDisplay && (
            <p className="text-xs text-black/40 dark:text-white/40 mt-2 text-center lg:text-right">
              {topicDisplay}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex flex-row items-center justify-center min-h-screen">
            <svg
              aria-hidden="true"
              className="w-8 h-8 text-light-200 fill-light-secondary dark:text-[#202020] animate-spin dark:fill-[#ffffff3b]"
              viewBox="0 0 100 101"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M100 50.5908C100.003 78.2051 78.1951 100.003 50.5908 100C22.9765 99.9972 0.997224 78.018 1 50.4037C1.00281 22.7993 22.8108 0.997224 50.4251 1C78.0395 1.00281 100.018 22.8108 100 50.4251ZM9.08164 50.594C9.06312 73.3997 27.7909 92.1272 50.5966 92.1457C73.4023 92.1642 92.1298 73.4365 92.1483 50.6308C92.1669 27.8251 73.4392 9.0973 50.6335 9.07878C27.8278 9.06026 9.10003 27.787 9.08164 50.594Z"
                fill="currentColor"
              />
              <path
                d="M93.9676 39.0409C96.393 38.4037 97.8624 35.9116 96.9801 33.5533C95.1945 28.8227 92.871 24.3692 90.0681 20.348C85.6237 14.1775 79.4473 9.36872 72.0454 6.45794C64.6435 3.54717 56.3134 2.65431 48.3133 3.89319C45.869 4.27179 44.3768 6.77534 45.014 9.20079C45.6512 11.6262 48.1343 13.0956 50.5786 12.717C56.5073 11.8281 62.5542 12.5399 68.0406 14.7911C73.527 17.0422 78.2187 20.7487 81.5841 25.4923C83.7976 28.5886 85.4467 32.059 86.4416 35.7474C87.1273 38.1189 89.5423 39.6781 91.9676 39.0409Z"
                fill="currentFill"
              />
            </svg>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center px-4">
            <Globe2Icon size={40} className="text-black/20 dark:text-white/20" />
            <p className="text-black/50 dark:text-white/50 text-lg">
              {savedMode ? 'No saved articles yet' : 'No articles available'}
            </p>
            {!savedMode && (
              <p className="text-black/30 dark:text-white/30 text-sm">
                Configure a SearxNG URL in Settings to enable content discovery.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4 pb-28 pt-5 lg:pb-8 w-full">
            <div className="block lg:hidden">
              {renderCards(displayItems ?? [], true)}
            </div>
            <div className="hidden lg:block">
              {renderCards(displayItems ?? [], false)}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Page;
