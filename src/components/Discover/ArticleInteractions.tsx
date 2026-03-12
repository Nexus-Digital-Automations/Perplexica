'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ArticleInteractionsProps {
  articleUrl: string;
  articleTitle: string;
  articleThumbnail?: string;
  topicKey: string;
  initialInteractions?: { like: boolean; dislike: boolean; save: boolean };
  onSaveChange?: (saved: boolean) => void;
}

const ArticleInteractions = ({
  articleUrl,
  articleTitle,
  articleThumbnail,
  topicKey,
  initialInteractions,
  onSaveChange,
}: ArticleInteractionsProps) => {
  const [liked, setLiked] = useState(initialInteractions?.like ?? false);
  const [disliked, setDisliked] = useState(
    initialInteractions?.dislike ?? false,
  );
  const [saved, setSaved] = useState(initialInteractions?.save ?? false);

  const toggle = async (
    action: 'like' | 'dislike' | 'save',
    currentState: boolean,
    setter: (v: boolean) => void,
    conflictAction?: 'like' | 'dislike',
    conflictSetter?: (v: boolean) => void,
  ) => {
    const next = !currentState;
    setter(next);

    // Clear conflicting action (like ↔ dislike)
    if (next && conflictAction && conflictSetter) {
      conflictSetter(false);
      await fetch('/api/discover/interactions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleUrl, action: conflictAction }),
      });
    }

    await fetch('/api/discover/interactions', {
      method: next ? 'POST' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleUrl, articleTitle, articleThumbnail, topicKey, action }),
    });

    if (action === 'save') {
      onSaveChange?.(next);
    }
  };

  return (
    <div
      className="flex items-center gap-1"
      onClick={(e) => e.preventDefault()}
    >
      <button
        type="button"
        title="Like"
        onClick={(e) => {
          e.stopPropagation();
          toggle('like', liked, setLiked, 'dislike', setDisliked);
        }}
        className={cn(
          'p-1.5 rounded-full transition-colors duration-150',
          liked
            ? 'text-green-500 bg-green-500/10'
            : 'text-black/30 dark:text-white/30 hover:text-green-500 hover:bg-green-500/10',
        )}
      >
        <ThumbsUp size={13} fill={liked ? 'currentColor' : 'none'} />
      </button>

      <button
        type="button"
        title="Dislike"
        onClick={(e) => {
          e.stopPropagation();
          toggle('dislike', disliked, setDisliked, 'like', setLiked);
        }}
        className={cn(
          'p-1.5 rounded-full transition-colors duration-150',
          disliked
            ? 'text-red-500 bg-red-500/10'
            : 'text-black/30 dark:text-white/30 hover:text-red-500 hover:bg-red-500/10',
        )}
      >
        <ThumbsDown size={13} fill={disliked ? 'currentColor' : 'none'} />
      </button>

      <button
        type="button"
        title="Save"
        onClick={(e) => {
          e.stopPropagation();
          toggle('save', saved, setSaved);
        }}
        className={cn(
          'p-1.5 rounded-full transition-colors duration-150',
          saved
            ? 'text-cyan-500 bg-cyan-500/10'
            : 'text-black/30 dark:text-white/30 hover:text-cyan-500 hover:bg-cyan-500/10',
        )}
      >
        <Bookmark size={13} fill={saved ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
};

export default ArticleInteractions;
