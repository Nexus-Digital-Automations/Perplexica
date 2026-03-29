'use client';

/* eslint-disable @next/next/no-img-element */
import { useRef, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Block,
  ClassificationBlock,
  QuestionsBlock,
  ResearchBlock,
  ResearchBlockSubStep,
} from '@/lib/types';
import { useChat } from '@/lib/hooks/useChat';
import QuestionSelector from './QuestionSelector';

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

const buildSubStepEntries = (
  subSteps: ResearchBlockSubStep[],
  loading: boolean,
  researchEnded: boolean,
): Entry[] => {
  const entries: Entry[] = [];

  subSteps.forEach((step, index) => {
    if (step.type === 'reasoning') return;

    const isLastSubStep = index === subSteps.length - 1;
    const isActive = isLastSubStep && loading && !researchEnded;
    const status: 'active' | 'done' = isActive ? 'active' : 'done';

    if (step.type === 'searching' && Array.isArray(step.searching)) {
      const n = step.searching.length;
      entries.push({
        id: step.id,
        icon: <Search className="w-3.5 h-3.5" />,
        label: isActive
          ? `Searching ${n} ${n === 1 ? 'query' : 'queries'}...`
          : `Searched ${n} ${n === 1 ? 'query' : 'queries'}`,
        detail:
          n > 0 ? (
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
    } else if (
      step.type === 'search_results' &&
      Array.isArray(step.reading)
    ) {
      const n = step.reading.length;
      entries.push({
        id: step.id,
        icon: <BookOpen className="w-3.5 h-3.5" />,
        label: isActive
          ? `Found ${n} ${n === 1 ? 'result' : 'results'}...`
          : `Found ${n} ${n === 1 ? 'result' : 'results'}`,
        detail:
          n > 0 ? (
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
    } else if (step.type === 'reading' && Array.isArray(step.reading)) {
      const n = step.reading.length;
      entries.push({
        id: step.id,
        icon: <BookOpen className="w-3.5 h-3.5" />,
        label: isActive
          ? `Reading ${n} ${n === 1 ? 'source' : 'sources'}...`
          : `Read ${n} ${n === 1 ? 'source' : 'sources'}`,
        detail:
          n > 0 ? (
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
    } else if (
      step.type === 'upload_searching' &&
      Array.isArray(step.queries)
    ) {
      const n = step.queries.length;
      entries.push({
        id: step.id,
        icon: <FileSearch className="w-3.5 h-3.5" />,
        label: isActive
          ? `Scanning ${n} ${n === 1 ? 'document' : 'documents'}...`
          : `Scanned documents`,
        detail:
          n > 0 ? (
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
    } else if (
      step.type === 'upload_search_results' &&
      Array.isArray(step.results)
    ) {
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

  return entries;
};

const QuestionDropdown = ({
  block,
  index,
  total,
  loading,
  researchEnded,
  isLastBlock,
}: {
  block: ResearchBlock;
  index: number;
  total: number;
  loading: boolean;
  researchEnded: boolean;
  isLastBlock: boolean;
}) => {
  const isActive = isLastBlock && loading && !researchEnded;
  const [isOpen, setIsOpen] = useState(isActive);

  useEffect(() => {
    if (isActive) setIsOpen(true);
    else if (researchEnded) setIsOpen(false);
  }, [isActive, researchEnded]);

  const entries = buildSubStepEntries(
    block.data.subSteps,
    loading && isLastBlock,
    researchEnded,
  );

  const questionLabel = block.data.question
    ? block.data.question.length > 80
      ? block.data.question.slice(0, 77) + '…'
      : block.data.question
    : `Research question ${index + 1}`;

  const sourceCount = block.data.subSteps
    .filter((s) => s.type === 'search_results' && Array.isArray((s as any).reading))
    .reduce(
      (acc, s) =>
        acc + ((s as any).reading?.length ?? 0),
      0,
    );

  return (
    <div data-testid={`question-dropdown-${index}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-start gap-2 py-1.5 text-left group"
        data-testid={`question-toggle-${index}`}
      >
        <div className="flex-shrink-0 mt-0.5">
          {isActive ? (
            <Disc3 className="w-3.5 h-3.5 text-black/60 dark:text-white/60 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />
          )}
        </div>
        <div className="flex-shrink-0 mt-0.5 text-black/50 dark:text-white/50">
          <MessageSquare className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'text-sm font-medium',
                isActive
                  ? 'text-black dark:text-white'
                  : 'text-black/70 dark:text-white/70',
              )}
            >
              Q{index + 1}/{total}
            </span>
            <span
              className={cn(
                'text-sm truncate',
                isActive
                  ? 'text-black dark:text-white'
                  : 'text-black/60 dark:text-white/60',
              )}
            >
              {questionLabel}
            </span>
          </div>
          {!isOpen && sourceCount > 0 && (
            <span className="text-[10px] text-black/40 dark:text-white/40">
              {sourceCount} {sourceCount === 1 ? 'source' : 'sources'}
            </span>
          )}
        </div>
        <div className="flex-shrink-0 mt-0.5 text-black/40 dark:text-white/40 group-hover:text-black/60 dark:group-hover:text-white/60 transition-colors">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && entries.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="pl-9 pb-1.5 space-y-1.5" data-testid={`question-steps-${index}`}>
              {entries.map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.1 }}
                  className="flex items-start gap-2"
                >
                  <div className="flex-shrink-0 mt-0.5 text-black/40 dark:text-white/40">
                    {entry.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span
                      className={cn(
                        'text-xs',
                        entry.status === 'active'
                          ? 'text-black/80 dark:text-white/80'
                          : 'text-black/50 dark:text-white/50',
                      )}
                    >
                      {entry.label}
                    </span>
                    {entry.detail}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ActivityFeed = ({
  blocks,
  loading,
  researchEnded,
  isLast,
}: ActivityFeedProps) => {
  const startTimeRef = useRef(Date.now());
  const [isExpanded, setIsExpanded] = useState(isLast && loading);
  const [elapsedMs, setElapsedMs] = useState(0);

  const { pendingQuestions, submitQuestionSelection, researchProgress } = useChat();

  // Keep expanded when questions are pending selection
  useEffect(() => {
    if (pendingQuestions && isLast) {
      setIsExpanded(true);
    }
  }, [pendingQuestions, isLast]);

  const classificationBlock = blocks.find(
    (b): b is ClassificationBlock => b.type === 'classification',
  );
  const questionsBlock = blocks.find(
    (b): b is QuestionsBlock => b.type === 'questions',
  );
  const researchBlocks = blocks.filter(
    (b): b is ResearchBlock => b.type === 'research',
  );
  const hasMultipleQuestions = researchBlocks.length > 1;
  const allSubSteps = researchBlocks.flatMap((rb) => rb.data.subSteps);
  const hasTextBlock = blocks.some((b) => b.type === 'text');
  const hasQuestionsPending =
    questionsBlock?.data.status === 'pending' && !!pendingQuestions;

  // Collapse when done — but not while questions are pending selection
  useEffect(() => {
    if (!loading && isLast && elapsedMs === 0 && !hasQuestionsPending) {
      setElapsedMs(Date.now() - startTimeRef.current);
      setIsExpanded(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasQuestionsPending]);

  // --- Summary stats (across ALL research blocks) ---
  const { totalQueries, uploadQueries, totalSources, totalRead, uploadDocs } =
    useMemo(
      () => ({
        totalQueries: allSubSteps
          .filter((s) => s.type === 'searching' && Array.isArray((s as any).searching))
          .reduce(
            (acc, s) => acc + ((s as any).searching?.length ?? 0),
            0,
          ),
        uploadQueries: allSubSteps
          .filter((s) => s.type === 'upload_searching' && Array.isArray((s as any).queries))
          .reduce(
            (acc, s) => acc + ((s as any).queries?.length ?? 0),
            0,
          ),
        totalSources: allSubSteps
          .filter((s) => s.type === 'search_results' && Array.isArray((s as any).reading))
          .reduce(
            (acc, s) => acc + ((s as any).reading?.length ?? 0),
            0,
          ),
        totalRead: allSubSteps
          .filter((s) => s.type === 'reading' && Array.isArray((s as any).reading))
          .reduce(
            (acc, s) => acc + ((s as any).reading?.length ?? 0),
            0,
          ),
        uploadDocs: allSubSteps
          .filter((s) => s.type === 'upload_search_results' && Array.isArray((s as any).results))
          .reduce(
            (acc, s) => acc + ((s as any).results?.length ?? 0),
            0,
          ),
      }),
      [allSubSteps],
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
      if (hasMultipleQuestions) {
        parts.push(`${researchBlocks.length} questions`);
      }
      if (q > 0) parts.push(`${q} ${q === 1 ? 'query' : 'queries'}`);
      if (src > 0) parts.push(`${src} sources`);
      if (read > 0) parts.push(`${read} read`);
    }

    if (elapsedMs > 0) parts.push(`${(elapsedMs / 1000).toFixed(1)}s`);

    return parts.length > 0 ? parts.join(' · ') : 'Activity log';
  };

  // --- Build top-level entries ---
  const topEntries: Entry[] = [];

  // 1. Analyzing
  const reasoningStep = allSubSteps.find((s) => s.type === 'reasoning');
  const reasoningText =
    reasoningStep?.type === 'reasoning' ? reasoningStep.reasoning : '';
  const excerpt =
    reasoningText.length > 150
      ? reasoningText.slice(0, 150) + '…'
      : reasoningText;

  const analyzingActive = !classificationBlock && loading;
  topEntries.push({
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
    topEntries.push({
      id: 'query',
      icon: <Search className="w-3.5 h-3.5" />,
      label: `"${classificationBlock.data.standaloneFollowUp}"`,
      status: 'done',
    });
  }

  // For single-question mode, inline the substeps
  const singleQuestionEntries: Entry[] = [];
  if (!hasMultipleQuestions && researchBlocks.length === 1) {
    singleQuestionEntries.push(
      ...buildSubStepEntries(
        researchBlocks[0].data.subSteps,
        loading,
        researchEnded,
      ),
    );
  }

  // Writing entry
  const writingEntry: Entry | null =
    researchEnded || hasTextBlock
      ? {
          id: 'writing',
          icon: <PenLine className="w-3.5 h-3.5" />,
          label: !loading ? 'Answer written' : 'Writing answer...',
          status: !loading ? 'done' : 'active',
        }
      : null;

  const hasContent =
    topEntries.length > 0 ||
    singleQuestionEntries.length > 0 ||
    hasMultipleQuestions ||
    questionsBlock ||
    writingEntry;

  if (!hasContent) return null;

  // Collapsed view
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="flex items-center gap-1.5 text-sm text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80 transition-colors py-0.5"
        data-testid="activity-feed-collapsed"
      >
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{buildSummary()}</span>
      </button>
    );
  }

  // Expanded view
  return (
    <div
      className="rounded-lg bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 overflow-hidden"
      data-testid="activity-feed-expanded"
    >
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
        {/* Top-level entries (analyzing, query rewrite) */}
        {topEntries.map((entry) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-start gap-2.5"
          >
            <div className="flex-shrink-0 mt-0.5">
              {entry.status === 'active' ? (
                <Disc3 className="w-3.5 h-3.5 text-black/60 dark:text-white/60 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />
              )}
            </div>
            <div className="flex-shrink-0 mt-0.5 text-black/50 dark:text-white/50">
              {entry.icon}
            </div>
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

        {/* Interactive question selection (pending) or confirmed summary */}
        {questionsBlock && questionsBlock.data.categories.length > 0 && (
          <QuestionSelector
            categories={questionsBlock.data.categories}
            sessionId={questionsBlock.data.sessionId}
            onSubmit={submitQuestionSelection}
            confirmed={questionsBlock.data.status === 'confirmed'}
          />
        )}

        {/* Research progress bar (multi-question only) */}
        {hasMultipleQuestions && researchProgress && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className={researchEnded ? 'text-black/50 dark:text-white/50' : 'text-black/60 dark:text-white/60'}>
                {researchEnded
                  ? `All ${researchProgress.questionTotal} questions researched`
                  : `Researching ${researchProgress.questionsCompleted} of ${researchProgress.questionTotal} questions...`}
              </span>
              <span className={researchEnded ? 'text-green-500 dark:text-green-400' : 'text-black/40 dark:text-white/40'}>
                {Math.round((researchProgress.questionsCompleted / researchProgress.questionTotal) * 100)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-light-200 dark:bg-dark-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  researchEnded
                    ? 'bg-green-500 dark:bg-green-400'
                    : 'bg-sky-500 dark:bg-sky-400'
                }`}
                style={{
                  width: `${(researchProgress.questionsCompleted / researchProgress.questionTotal) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Multi-question: per-question dropdowns */}
        {hasMultipleQuestions &&
          researchBlocks.map((rb, i) => (
            <QuestionDropdown
              key={rb.id}
              block={rb}
              index={i}
              total={researchBlocks.length}
              loading={loading}
              researchEnded={researchEnded}
              isLastBlock={i === researchBlocks.length - 1}
            />
          ))}

        {/* Single-question: inline substeps */}
        {!hasMultipleQuestions &&
          singleQuestionEntries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-start gap-2.5"
            >
              <div className="flex-shrink-0 mt-0.5">
                {entry.status === 'active' ? (
                  <Disc3 className="w-3.5 h-3.5 text-black/60 dark:text-white/60 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />
                )}
              </div>
              <div className="flex-shrink-0 mt-0.5 text-black/50 dark:text-white/50">
                {entry.icon}
              </div>
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    'text-sm',
                    entry.status === 'active'
                      ? 'text-black dark:text-white'
                      : 'text-black/70 dark:text-white/70',
                  )}
                >
                  {entry.label}
                </span>
                {entry.detail}
              </div>
            </motion.div>
          ))}

        {/* Writing answer */}
        {writingEntry && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-start gap-2.5"
          >
            <div className="flex-shrink-0 mt-0.5">
              {writingEntry.status === 'active' ? (
                <Disc3 className="w-3.5 h-3.5 text-black/60 dark:text-white/60 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />
              )}
            </div>
            <div className="flex-shrink-0 mt-0.5 text-black/50 dark:text-white/50">
              {writingEntry.icon}
            </div>
            <div className="flex-1 min-w-0">
              <span
                className={cn(
                  'text-sm',
                  writingEntry.status === 'active'
                    ? 'text-black dark:text-white'
                    : 'text-black/70 dark:text-white/70',
                )}
              >
                {writingEntry.label}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
