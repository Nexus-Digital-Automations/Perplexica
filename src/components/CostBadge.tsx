'use client';

import React from 'react';
import { CostBlock } from '@/lib/types';

function formatCost(usd: number): string {
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function shortModelName(modelId: string): string {
  // Keep first 3 dash-separated segments: "claude-opus-4" or "gpt-4o"
  return modelId.split('-').slice(0, 3).join('-');
}

const CostBadge = ({ block }: { block: CostBlock }) => {
  const showTotal =
    block.totalSpentUsd !== undefined &&
    block.totalSpentUsd > block.costUsd + 0.000001;

  const tooltip = [
    `Model: ${block.modelId}`,
    showTotal ? `Session total: ${formatCost(block.totalSpentUsd!)}` : null,
    block.budgetUsd != null
      ? `Budget: ${formatCost(block.budgetUsd)}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <div
      title={tooltip}
      className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-1 rounded-full w-fit cursor-default"
    >
      <span>💰</span>
      <span>{formatCost(block.costUsd)}</span>
      <span className="text-green-500/70 dark:text-green-400/60">
        {shortModelName(block.modelId)}
      </span>
    </div>
  );
};

export default CostBadge;
