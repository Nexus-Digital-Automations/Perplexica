'use client';

import React from 'react';
import { CostBlock } from '@/lib/types';

function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

const CostBadge = ({ block }: { block: CostBlock }) => {
  return (
    <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-1 rounded-full w-fit">
      <span>💰</span>
      <span>{formatCost(block.costUsd)}</span>
    </div>
  );
};

export default CostBadge;
