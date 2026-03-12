'use client';

interface FeedUnreadBadgeProps {
  count: number;
  className?: string;
}

const FeedUnreadBadge = ({ count, className = '' }: FeedUnreadBadgeProps) => {
  if (count <= 0) return null;

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold text-white bg-cyan-500 rounded-full ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
};

export default FeedUnreadBadge;
