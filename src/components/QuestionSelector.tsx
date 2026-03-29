'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Play,
  Square,
  Clock,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuestionCategory } from '@/lib/types';

interface QuestionSelectorProps {
  categories: QuestionCategory[];
  sessionId: string;
  onSubmit: (sessionId: string, selectedQuestions: string[]) => void;
  autoConfirmSeconds?: number;
  confirmed?: boolean;
}

const QuestionSelector = ({
  categories,
  sessionId,
  onSubmit,
  autoConfirmSeconds = 120,
  confirmed = false,
}: QuestionSelectorProps) => {
  const allQuestions = categories.flatMap((c) => c.questions);

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(allQuestions),
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(categories.map((c) => c.category)),
  );
  const [countdown, setCountdown] = useState(autoConfirmSeconds);
  const [userInteracted, setUserInteracted] = useState(false);
  const [submitted, setSubmitted] = useState(confirmed);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync confirmed prop from parent (backend updateBlock)
  useEffect(() => {
    if (confirmed && !submitted) setSubmitted(true);
  }, [confirmed, submitted]);

  // Countdown timer
  useEffect(() => {
    if (userInteracted || submitted) return;

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [userInteracted, submitted]);

  // Auto-submit when countdown hits 0
  useEffect(() => {
    if (countdown === 0 && !submitted && !userInteracted) {
      handleSubmit();
    }
  }, [countdown, submitted, userInteracted]);

  const cancelCountdown = useCallback(() => {
    if (!userInteracted) {
      setUserInteracted(true);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [userInteracted]);

  const toggleQuestion = (question: string) => {
    cancelCountdown();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(question)) {
        next.delete(question);
      } else {
        next.add(question);
      }
      return next;
    });
  };

  const toggleCategory = (category: QuestionCategory) => {
    cancelCountdown();
    const allSelected = category.questions.every((q) => selected.has(q));
    setSelected((prev) => {
      const next = new Set(prev);
      category.questions.forEach((q) => {
        if (allSelected) {
          next.delete(q);
        } else {
          next.add(q);
        }
      });
      return next;
    });
  };

  const toggleCategoryExpand = (categoryName: string) => {
    cancelCountdown();
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (submitted) return;
    setSubmitted(true);
    const selectedArr = allQuestions.filter((q) => selected.has(q));
    onSubmit(sessionId, selectedArr.length > 0 ? selectedArr : allQuestions);
  };

  const selectedCount = selected.size;
  const totalCount = allQuestions.length;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0.7 }}
        className="flex items-center gap-2 py-1.5 text-xs text-black/50 dark:text-white/50"
        data-testid="question-selector-confirmed"
      >
        <Check className="w-3.5 h-3.5 text-green-500" />
        <span>
          Selected {selectedCount} of {totalCount} questions across{' '}
          {categories.length} {categories.length === 1 ? 'category' : 'categories'}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="overflow-hidden"
      data-testid="question-selector"
    >
      <div className="rounded-lg border border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-light-200/60 dark:border-dark-200/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-black/70 dark:text-white/70 uppercase tracking-wide">
              Research Plan
            </span>
            <span className="text-[10px] text-black/40 dark:text-white/40 tabular-nums">
              {selectedCount}/{totalCount}
            </span>
          </div>
          {!userInteracted && countdown > 0 && (
            <button
              onClick={cancelCountdown}
              className="flex items-center gap-1 text-[10px] text-black/35 dark:text-white/30 hover:text-black/60 dark:hover:text-white/50 transition-colors"
              title="Cancel auto-start"
            >
              <Clock className="w-3 h-3" />
              <span className="tabular-nums">{formatTime(countdown)}</span>
            </button>
          )}
        </div>

        {/* Categories */}
        <div className="divide-y divide-light-200/40 dark:divide-dark-200/40">
          {categories.map((cat) => {
            const isExpanded = expandedCategories.has(cat.category);
            const catSelectedCount = cat.questions.filter((q) =>
              selected.has(q),
            ).length;
            const allCatSelected = catSelectedCount === cat.questions.length;
            const someCatSelected =
              catSelectedCount > 0 && catSelectedCount < cat.questions.length;

            return (
              <div key={cat.category} data-testid={`category-${cat.category}`}>
                {/* Category header */}
                <div className="flex items-center gap-1 px-3.5 py-2 group">
                  <button
                    onClick={() => toggleCategoryExpand(cat.category)}
                    className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                  >
                    <span className="text-black/30 dark:text-white/25 group-hover:text-black/50 dark:group-hover:text-white/40 transition-colors">
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </span>
                    <span className="text-[11px] font-medium text-black/60 dark:text-white/55 truncate">
                      {cat.category}
                    </span>
                    <span className="text-[10px] text-black/30 dark:text-white/25 tabular-nums flex-shrink-0">
                      {catSelectedCount}/{cat.questions.length}
                    </span>
                  </button>

                  {/* Category-level checkbox */}
                  <button
                    onClick={() => toggleCategory(cat)}
                    className={cn(
                      'w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-all duration-150',
                      allCatSelected
                        ? 'bg-sky-500 border-sky-500 text-white'
                        : someCatSelected
                          ? 'border-sky-400 bg-sky-500/20'
                          : 'border-light-200 dark:border-dark-200 hover:border-sky-400/50',
                    )}
                    title={allCatSelected ? 'Deselect all' : 'Select all'}
                  >
                    {allCatSelected && <Check className="w-2.5 h-2.5" />}
                    {someCatSelected && (
                      <Minus className="w-2.5 h-2.5 text-sky-500" />
                    )}
                  </button>
                </div>

                {/* Questions within category */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <div className="pb-1.5">
                        {cat.questions.map((question) => {
                          const isSelected = selected.has(question);
                          return (
                            <button
                              key={question}
                              onClick={() => toggleQuestion(question)}
                              className={cn(
                                'w-full flex items-start gap-2.5 px-3.5 pl-8 py-1.5 text-left transition-colors duration-100',
                                'hover:bg-light-secondary/60 dark:hover:bg-dark-secondary/60',
                              )}
                              data-testid="question-checkbox"
                            >
                              <span
                                className={cn(
                                  'w-3.5 h-3.5 rounded-sm flex-shrink-0 mt-0.5 flex items-center justify-center border transition-all duration-150',
                                  isSelected
                                    ? 'bg-sky-500 border-sky-500 text-white'
                                    : 'border-light-200 dark:border-dark-200',
                                )}
                              >
                                {isSelected && (
                                  <Check className="w-2.5 h-2.5" />
                                )}
                              </span>
                              <span
                                className={cn(
                                  'text-xs leading-relaxed transition-colors',
                                  isSelected
                                    ? 'text-black/70 dark:text-white/70'
                                    : 'text-black/35 dark:text-white/30 line-through decoration-black/15 dark:decoration-white/15',
                                )}
                              >
                                {question}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-light-200/60 dark:border-dark-200/60 bg-light-secondary/30 dark:bg-dark-secondary/30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                cancelCountdown();
                if (selectedCount === totalCount) {
                  setSelected(new Set());
                } else {
                  setSelected(new Set(allQuestions));
                }
              }}
              className="text-[10px] text-black/40 dark:text-white/35 hover:text-black/60 dark:hover:text-white/50 transition-colors"
            >
              {selectedCount === totalCount ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={selectedCount === 0}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
              selectedCount > 0
                ? 'bg-sky-500 text-white hover:bg-sky-600 active:scale-[0.97]'
                : 'bg-light-200 dark:bg-dark-200 text-black/30 dark:text-white/25 cursor-not-allowed',
            )}
            data-testid="start-research-btn"
          >
            <Play className="w-3 h-3" />
            <span>Research {selectedCount > 0 ? selectedCount : ''}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default QuestionSelector;
