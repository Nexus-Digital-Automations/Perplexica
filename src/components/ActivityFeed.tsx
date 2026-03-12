'use client';

/* eslint-disable @next/next/no-img-element */
import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Search,
  BookOpen,
  PenLine,
  Check,
  ChevronRight,
  ChevronDown,
  Disc3,
  FileSearch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Block, ClassificationBlock, ResearchBlock } from '@/lib/types';

interface ActivityFeedProps {
  blocks: Block[];
  loading: boolean;
  researchEnded: boolean;
  isLast: boolean;
}

interface Entry {
  id: string;
  icon: React.ReactNode;
  label: string;
  detail?: React.ReactNode;
  status: 'active' | 'done';
}

const ActivityFeed = ({
  blocks,
  loading,
  researchEnded,
  isLast,
}: ActivityFeedProps) => {
  const startTimeRef = useRef(Date.now());
  const [isExpanded, setIsExpanded] = useState(isLast && loading);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!loading && isLast && elapsedMs === 0) {
      setElapsedMs(Date.now() - startTimeRef.current);
      setIsExpanded(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const classificationBlock = blocks.find(
    (b): b is ClassificationBlock => b.type === 'classification',
  );
  const researchBlock = blocks.find(
    (b): b is ResearchBlock => b.type === 'research',
  );
  const subSteps = researchBlock?.data.subSteps ?? [];
  const hasTextBlock = blocks.some((b) => b.type === 'text');

  // --- Summary stats ---
  const totalQueries = subSteps
    .filter((s) => s.type === 'searching')
    .reduce(
      (acc, s) => acc + (s.type === 'searching' ? s.searching.length : 0),
      0,
    );
  const uploadQueries = subSteps
    .filter((s) => s.type === 'upload_searching')
    .reduce(
      (acc, s) =>
        acc + (s.type === 'upload_searching' ? s.queries.length : 0),
      0,
    );
  const totalSources = subSteps
    .filter((s) => s.type === 'search_results')
    .reduce(
      (acc, s) => acc + (s.type === 'search_results' ? s.reading.length : 0),
      0,
    );
  const totalRead = subSteps
    .filter((s) => s.type === 'reading')
    .reduce(
      (acc, s) => acc + (s.type === 'reading' ? s.reading.length : 0),
      0,
    );
  const uploadDocs = subSteps
    .filter((s) => s.type === 'upload_search_results')
    .reduce(
      (acc, s) =>
        acc + (s.type === 'upload_search_results' ? s.results.length : 0),
      0,
    );

  const skipSearch = classificationBlock?.data.skipSearch ?? false;

  const buildSummary = (): string => {
    const parts: string[] = [];
    const q = totalQueries + uploadQueries;
    const src = totalSources;
    const read = totalRead + uploadDocs;

    if (skipSearch) {
      parts.push('No search needed');
    } else {
      if (q > 0) parts.push(`Searched ${q} ${q === 1 ? 'query' : 'queries'}`);
      if (src > 0) parts.push(`${src} sources`);
      if (read > 0) parts.push(`${read} read`);
    }

    if (elapsedMs > 0) parts.push(`${(elapsedMs / 1000).toFixed(1)}s`);

    return parts.length > 0 ? parts.join(' · ') : 'Activity log';
  };

  // --- Build entries ---
  const entries: Entry[] = [];

  // 1. Analyzing
  const reasoningStep = subSteps.find((s) => s.type === 'reasoning');
  const reasoningText =
    reasoningStep?.type === 'reasoning' ? reasoningStep.reasoning : '';
  const excerpt =
    reasoningText.length > 150
      ? reasoningText.slice(0, 150) + '…'
      : reasoningText;

  const analyzingActive = !classificationBlock && loading;
  entries.push({
    id: 'analyzing',
    icon: <Brain className="w-3.5 h-3.5" />,
    label: classificationBlock ? 'Analyzed' : 'Analyzing...',
    detail: excerpt ? (
      <p className="text-xs text-black/50 dark:text-white/50 italic mt-0.5 pl-1.5 border-l border-light-200 dark:border-dark-200 line-clamp-2">
        {excerpt}
      </p>
    ) : undefined,
    status: analyzingActive ? 'active' : 'done',
  });

  // 2. Query rewrite
  if (classificationBlock?.data.standaloneFollowUp) {
    entries.push({
      id: 'query',
      icon: <Search className="w-3.5 h-3.5" />,
      label: `"${classificationBlock.data.standaloneFollowUp}"`,
      status: 'done',
    });
  }

  // 3–5. Research substeps
  subSteps.forEach((step, index) => {
    if (step.type === 'reasoning') return;

    const isLastSubStep = index === subSteps.length - 1;
    const isActive = isLastSubStep && loading && !researchEnded;
    const status: 'active' | 'done' = isActive ? 'active' : 'done';

    if (step.type === 'searching') {
      const n = step.searching.length;
      entries.push({
        id: step.id,
        icon: <Search className="w-3.5 h-3.5" />,
        label: isActive
          ? `Searching ${n} ${n === 1 ? 'query' : 'queries'}...`
          : `Searched ${n} ${n === 1 ? 'query' : 'queries'}`,
        detail:
          step.searching.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-1">
              {step.searching.map((q, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-light-100 dark:bg-dark-100 text-black/60 dark:text-white/60 border border-light-200 dark:border-dark-200"
                >
                  {q}
                </span>
              ))}
            </div>
          ) : undefined,
        status,
      });
    } else if (step.type === 'search_results') {
      const n = step.reading.length;
      entries.push({
        id: step.id,
        icon: <BookOpen className="w-3.5 h-3.5" />,
        label: isActive
          ? `Found ${n} ${n === 1 ? 'result' : 'results'}...`
          : `Found ${n} ${n === 1 ? 'result' : 'results'}`,
        detail:
          step.reading.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-1">
              {step.reading.slice(0, 4).map((r, i) => {
                const url = r.metadata?.url || '';
                let domain = '';
                try {
                  domain = url ? new URL(url).hostname : '';
                } catch {}
                return (
                  <a
                    key={i}
                    href={url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-light-100 dark:bg-dark-100 text-black/60 dark:text-white/60 border border-light-200 dark:border-dark-200 hover:text-black dark:hover:text-white transition-colors"
                  >
                    {domain && (
                      <img
                        src={`https://s2.googleusercontent.com/s2/favicons?domain=${domain}&sz=128`}
                        alt=""
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <span className="max-w-[120px] truncate">
                      {r.metadata?.title || domain || 'Source'}
                    </span>
                  </a>
                );
              })}
            </div>
          ) : undefined,
        status,
      });
    } else if (step.type === 'reading') {
      const n = step.reading.length;
      entries.push({
        id: step.id,
        icon: <BookOpen className="w-3.5 h-3.5" />,
        label: isActive
          ? `Reading ${n} ${n === 1 ? 'source' : 'sources'}...`
          : `Read ${n} ${n === 1 ? 'source' : 'sources'}`,
        detail:
          step.reading.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-1">
              {step.reading.slice(0, 4).map((r, i) => {
                const url = r.metadata?.url || '';
                let domain = '';
                try {
                  domain = url ? new URL(url).hostname : '';
                } catch {}
                return (
                  <a
                    key={i}
                    href={url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-light-100 dark:bg-dark-100 text-black/60 dark:text-white/60 border border-light-200 dark:border-dark-200 hover:text-black dark:hover:text-white transition-colors"
                  >
                    {domain && (
                      <img
                        src={`https://s2.googleusercontent.com/s2/favicons?domain=${domain}&sz=128`}
                        alt=""
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <span className="max-w-[120px] truncate">
                      {r.metadata?.title || domain || 'Source'}
                    </span>
                  </a>
                );
              })}
            </div>
          ) : undefined,
        status,
      });
    } else if (step.type === 'upload_searching') {
      const n = step.queries.length;
      entries.push({
        id: step.id,
        icon: <FileSearch className="w-3.5 h-3.5" />,
        label: isActive
          ? `Scanning ${n} ${n === 1 ? 'document' : 'documents'}...`
          : `Scanned documents`,
        detail:
          step.queries.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-1">
              {step.queries.map((q, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-light-100 dark:bg-dark-100 text-black/60 dark:text-white/60 border border-light-200 dark:border-dark-200"
                >
                  {q}
                </span>
              ))}
            </div>
          ) : undefined,
        status,
      });
    } else if (step.type === 'upload_search_results') {
      const n = step.results.length;
      entries.push({
        id: step.id,
        icon: <BookOpen className="w-3.5 h-3.5" />,
        label: isActive
          ? `Reading ${n} ${n === 1 ? 'document' : 'documents'}...`
          : `Read ${n} ${n === 1 ? 'document' : 'documents'}`,
        status,
      });
    }
  });

  // 6. Writing answer
  if (researchEnded || hasTextBlock) {
    entries.push({
      id: 'writing',
      icon: <PenLine className="w-3.5 h-3.5" />,
      label: !loading ? 'Answer written' : 'Writing answer...',
      status: !loading ? 'done' : 'active',
    });
  }

  if (entries.length === 0) return null;

  // Collapsed view
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="flex items-center gap-1.5 text-sm text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80 transition-colors py-0.5"
      >
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{buildSummary()}</span>
      </button>
    );
  }

  // Expanded view
  return (
    <div className="rounded-lg bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 overflow-hidden">
      {!loading && (
        <button
          onClick={() => setIsExpanded(false)}
          className="w-full flex items-center gap-1.5 px-3 pt-2.5 pb-1 text-xs text-black/40 dark:text-white/40 hover:text-black/60 dark:hover:text-white/60 transition-colors text-left"
        >
          <ChevronDown className="w-3 h-3" />
          <span>Activity log</span>
        </button>
      )}
      <div className="p-3 space-y-2">
        {entries.map((entry) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-start gap-2.5"
          >
            {/* Status indicator */}
            <div className="flex-shrink-0 mt-0.5">
              {entry.status === 'active' ? (
                <Disc3 className="w-3.5 h-3.5 text-black/60 dark:text-white/60 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />
              )}
            </div>

            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5 text-black/50 dark:text-white/50">
              {entry.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <span
                className={cn(
                  'text-sm',
                  entry.status === 'active'
                    ? 'text-black dark:text-white'
                    : 'text-black/70 dark:text-white/70',
                  entry.id === 'query' && 'italic block truncate',
                )}
              >
                {entry.label}
              </span>
              {entry.detail}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;
