'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Check, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CitationDetail, Chunk } from '@/lib/types';

type CitationPanelProps = {
  open: boolean;
  onClose: () => void;
  activeCitationIndex: number | null;
  citations: CitationDetail[];
  sources: Chunk[];
};

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function StatusIcon({ status }: { status: 'pass' | 'weak' | 'fail' }) {
  if (status === 'pass') {
    return <Check size={12} className="text-green-500" />;
  }
  if (status === 'weak') {
    return <AlertTriangle size={12} className="text-yellow-500" />;
  }
  return <XCircle size={12} className="text-red-400" />;
}

function statusLabel(status: 'pass' | 'weak' | 'fail'): string {
  if (status === 'pass') return 'Verified';
  if (status === 'weak') return 'Weak match';
  return 'Unverified';
}

const CitationPanel = ({
  open,
  onClose,
  activeCitationIndex,
  citations,
  sources,
}: CitationPanelProps) => {
  const activeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [open, activeCitationIndex]);

  // Deduplicate citations by index (keep first occurrence), sort weakest first
  const uniqueCitations = citations
    .reduce<CitationDetail[]>((acc, c) => {
      if (!acc.some((x) => x.citationIndex === c.citationIndex)) acc.push(c);
      return acc;
    }, [])
    .sort((a, b) => a.similarity - b.similarity);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black z-40 lg:hidden"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed right-0 top-0 bottom-0 z-50 w-80 lg:w-96 bg-light-primary dark:bg-dark-primary border-l border-light-200 dark:border-dark-200 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-light-200 dark:border-dark-200">
              <h3 className="text-sm font-semibold text-black dark:text-white">
                Citations
              </h3>
              <button
                onClick={onClose}
                className="p-1 rounded-md hover:bg-light-200 dark:hover:bg-dark-200 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {uniqueCitations.length === 0 && (
                <p className="text-xs text-black/50 dark:text-white/50">
                  No citation details available.
                </p>
              )}

              {uniqueCitations.map((c) => {
                const source = sources[c.citationIndex - 1];
                const isActive = c.citationIndex === activeCitationIndex;
                const url = source?.metadata?.url || '';
                const title = source?.metadata?.title || 'Unknown source';
                const domain = extractDomain(url);

                return (
                  <div
                    key={`${c.citationIndex}-${c.sentence.slice(0, 20)}`}
                    ref={isActive ? activeRef : undefined}
                    className={cn(
                      'rounded-lg border p-3 transition-colors',
                      isActive
                        ? 'border-blue-500 bg-blue-500/5'
                        : 'border-light-200 dark:border-dark-200',
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-light-secondary dark:bg-dark-secondary px-1.5 py-0.5 rounded text-[10px] font-bold text-black/70 dark:text-white/70">
                        {c.citationIndex}
                      </span>
                      <StatusIcon status={c.status} />
                      <span className="text-[10px] text-black/50 dark:text-white/50">
                        {statusLabel(c.status)}
                        {c.similarity > 0 && ` (${Math.round(c.similarity * 100)}%)`}
                      </span>
                      {c.similarity > 0 && (
                        <div className="flex-1 h-1 rounded-full bg-light-200 dark:bg-dark-200 overflow-hidden max-w-[60px]">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              c.status === 'pass' ? 'bg-green-500' : c.status === 'weak' ? 'bg-yellow-500' : 'bg-red-400',
                            )}
                            style={{ width: `${Math.round(c.similarity * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {c.matchedSnippet && (
                      <blockquote className="text-xs text-black/70 dark:text-white/60 border-l-2 border-light-200 dark:border-dark-200 pl-2 mb-2 italic leading-relaxed line-clamp-4">
                        {c.matchedSnippet}
                      </blockquote>
                    )}

                    <p className="text-[10px] text-black/40 dark:text-white/40 mb-2 line-clamp-2">
                      Claim: {c.sentence}
                    </p>

                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-400 transition-colors"
                      >
                        <span className="truncate max-w-[200px]">
                          {title !== url ? title : domain}
                        </span>
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default CitationPanel;
