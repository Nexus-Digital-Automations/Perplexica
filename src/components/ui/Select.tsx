import { cn } from '@/lib/utils';
import { Loader2, ChevronDown } from 'lucide-react';
import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: any; label: string; disabled?: boolean }[];
  loading?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, loading = false, disabled, ...restProps }, ref) => {
    return (
      <div
        className={cn(
          'relative inline-flex w-full items-center',
          disabled && 'opacity-50',
        )}
      >
        <select
          {...restProps}
          ref={ref}
          disabled={disabled || loading}
          className={cn(
            'bg-light-secondary/50 dark:bg-dark-secondary/40 px-3 py-2 flex items-center overflow-hidden border border-light-200/80 dark:border-dark-200/60 dark:text-white rounded-md appearance-none w-full pr-8 text-[11px] lg:text-xs transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/20 focus-visible:border-sky-500/40 dark:focus-visible:ring-sky-400/15 dark:focus-visible:border-sky-400/30',
            className,
          )}
        >
          {options.map(({ label, value, disabled: optionDisabled }) => {
            return (
              <option key={value} value={value} disabled={optionDisabled}>
                {label}
              </option>
            );
          })}
        </select>
        <span className="pointer-events-none absolute right-3 flex h-4 w-4 items-center justify-center text-black/35 dark:text-white/35">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </span>
      </div>
    );
  },
);

Select.displayName = 'Select';

export default Select;
