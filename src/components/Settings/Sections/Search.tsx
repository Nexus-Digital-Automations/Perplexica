import { UIConfigField } from '@/lib/config/types';
import { CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import SettingsField from '../SettingsField';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'checking' | 'ok' | 'error';

const SearxngURLField = ({
  field,
  initialValue,
}: {
  field: UIConfigField & { type: 'string' };
  initialValue: string;
}) => {
  const [value, setValue] = useState(initialValue ?? field.default ?? '');
  const [status, setStatus] = useState<Status>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const testSearxng = async (url: string) => {
    if (!url) {
      setStatus('idle');
      return;
    }
    setStatus('checking');
    try {
      const res = await fetch('/api/config/test-searxng', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus('ok');
        setStatusMsg(`Connected (${data.latencyMs}ms)`);
      } else {
        setStatus('error');
        setStatusMsg(data.message ?? 'Connection failed');
      }
    } catch {
      setStatus('error');
      setStatusMsg('Connection failed');
    }
  };

  useEffect(() => {
    if (initialValue) {
      testSearxng(initialValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (newValue: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'search.searxngURL', value: newValue }),
      });
      if (!res.ok) {
        throw new Error('Failed to save configuration');
      }
    } catch {
      toast.error('Failed to save configuration.');
    } finally {
      setTimeout(() => setSaving(false), 150);
    }
    await testSearxng(newValue);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-xs text-black/70 dark:text-white/60">
          {field.name}
        </label>
        {status !== 'idle' && status !== 'checking' && (
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0',
              status === 'ok'
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400',
            )}
          >
            {status === 'ok' ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            <span>{status === 'ok' ? statusMsg : 'Error'}</span>
          </div>
        )}
      </div>
      {field.description && (
        <p className="text-[11px] text-black/35 dark:text-white/30">
          {field.description}
        </p>
      )}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setStatus('idle');
            }}
            onBlur={(e) => handleSave(e.target.value)}
            className="w-full rounded-md border border-light-200/80 dark:border-dark-200/60 bg-light-secondary/50 dark:bg-dark-secondary/40 px-3 py-2 pr-8 text-[11px] lg:text-xs text-black/80 dark:text-white/80 placeholder:text-black/30 dark:placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/20 focus-visible:border-sky-500/40 dark:focus-visible:ring-sky-400/15 dark:focus-visible:border-sky-400/30 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder={field.placeholder}
            type="text"
            disabled={saving}
          />
          {(saving || status === 'checking') && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-black/30 dark:text-white/30" />
            </span>
          )}
        </div>
        <button
          onClick={() => testSearxng(value)}
          disabled={saving || status === 'checking' || !value}
          title="Re-test connection"
          className="flex items-center justify-center rounded-md border border-light-200/80 dark:border-dark-200/60 bg-light-secondary/50 dark:bg-dark-secondary/40 p-2 text-black/50 dark:text-white/40 hover:text-black/80 dark:hover:text-white/70 hover:bg-light-secondary dark:hover:bg-dark-secondary hover:border-light-200 dark:hover:border-dark-200 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RefreshCw
            className={cn(
              'h-4 w-4',
              status === 'checking' && 'animate-spin',
            )}
          />
        </button>
      </div>
    </div>
  );
};

const Search = ({
  fields,
  values,
}: {
  fields: UIConfigField[];
  values: Record<string, any>;
}) => {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-8 py-6">
      {fields.map((field) => {
        const value =
          (field.scope === 'client'
            ? localStorage.getItem(field.key)
            : values[field.key]) ?? field.default;

        if (field.key === 'searxngURL' && field.type === 'string') {
          return (
            <SearxngURLField
              key={field.key}
              field={field as UIConfigField & { type: 'string' }}
              initialValue={value}
            />
          );
        }

        return (
          <SettingsField
            key={field.key}
            field={field}
            value={value}
            dataAdd="search"
          />
        );
      })}
    </div>
  );
};

export default Search;
