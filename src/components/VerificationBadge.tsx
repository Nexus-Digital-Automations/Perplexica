'use client';

import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VerificationBlock } from '@/lib/types';

const VerificationBadge = ({ block }: { block: VerificationBlock }) => {
  const [expanded, setExpanded] = useState(false);
  const { status, totalCitations, passed, weak, failed, wasCorrected } =
    block.data;

  if (totalCitations === 0) return null;

  const allPassed = status === 'verified';

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition duration-200',
          allPassed
            ? 'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20'
            : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20',
        )}
      >
        {allPassed ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
        <span>
          {allPassed
            ? `All ${totalCitations} citations verified`
            : `${passed} of ${totalCitations} citations fully verified`}
        </span>
        {wasCorrected && (
          <span className="text-[10px] opacity-70 ml-1">(corrected)</span>
        )}
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {expanded && (
        <div className="mt-2 px-3 py-2 rounded-lg bg-light-secondary dark:bg-dark-secondary text-xs space-y-1">
          <div className="flex gap-4 text-black/70 dark:text-white/70">
            <span className="text-green-600 dark:text-green-400">
              {passed} passed
            </span>
            {weak > 0 && (
              <span className="text-yellow-600 dark:text-yellow-400">
                {weak} weak
              </span>
            )}
            {failed > 0 && (
              <span className="text-red-500 dark:text-red-400">
                {failed} failed
              </span>
            )}
          </div>
          {wasCorrected && (
            <p className="text-black/50 dark:text-white/50 text-[11px]">
              Some citations were automatically corrected for accuracy.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default VerificationBadge;
