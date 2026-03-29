import {
  SelectUIConfigField,
  StringUIConfigField,
  SwitchUIConfigField,
  TextareaUIConfigField,
  UIConfigField,
} from '@/lib/config/types';
import { useState } from 'react';
import Select from '../ui/Select';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { Loader2 } from 'lucide-react';
import { Switch } from '@headlessui/react';

const emitClientConfigChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('client-config-changed'));
  }
};

const FieldLabel = ({
  children,
  label,
  description,
}: {
  children: React.ReactNode;
  label: string;
  description?: string;
}) => (
  <div className="space-y-1.5">
    <div className="space-y-0.5">
      <label className="text-xs text-black/70 dark:text-white/60">{label}</label>
      {description && (
        <p className="text-[11px] text-black/35 dark:text-white/30">
          {description}
        </p>
      )}
    </div>
    {children}
  </div>
);

const SettingsSelect = ({
  field,
  value,
  setValue,
  dataAdd,
}: {
  field: SelectUIConfigField;
  value?: any;
  setValue: (value: any) => void;
  dataAdd: string;
}) => {
  const [loading, setLoading] = useState(false);
  const { setTheme } = useTheme();

  const handleSave = async (newValue: any) => {
    setLoading(true);
    setValue(newValue);
    try {
      if (field.scope === 'client') {
        localStorage.setItem(field.key, newValue);
        if (field.key === 'theme') {
          setTheme(newValue);
        }
        emitClientConfigChanged();
      } else {
        const res = await fetch('/api/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: `${dataAdd}.${field.key}`,
            value: newValue,
          }),
        });

        if (!res.ok) {
          console.error('Failed to save config:', await res.text());
          throw new Error('Failed to save configuration');
        }
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration.');
    } finally {
      setTimeout(() => setLoading(false), 150);
    }
  };

  return (
    <FieldLabel label={field.name} description={field.description}>
      <Select
        value={value}
        onChange={(event) => handleSave(event.target.value)}
        options={field.options.map((option) => ({
          value: option.value,
          label: option.name,
        }))}
        className="!text-[11px] lg:!text-xs"
        loading={loading}
        disabled={loading}
      />
    </FieldLabel>
  );
};

const SettingsInput = ({
  field,
  value,
  setValue,
  dataAdd,
}: {
  field: StringUIConfigField;
  value?: any;
  setValue: (value: any) => void;
  dataAdd: string;
}) => {
  const [loading, setLoading] = useState(false);

  const handleSave = async (newValue: any) => {
    setLoading(true);
    setValue(newValue);
    try {
      if (field.scope === 'client') {
        localStorage.setItem(field.key, newValue);
        emitClientConfigChanged();
      } else {
        const res = await fetch('/api/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: `${dataAdd}.${field.key}`,
            value: newValue,
          }),
        });

        if (!res.ok) {
          console.error('Failed to save config:', await res.text());
          throw new Error('Failed to save configuration');
        }
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration.');
    } finally {
      setTimeout(() => setLoading(false), 150);
    }
  };

  return (
    <FieldLabel label={field.name} description={field.description}>
      <div className="relative">
        <input
          value={value ?? field.default ?? ''}
          onChange={(event) => setValue(event.target.value)}
          onBlur={(event) => handleSave(event.target.value)}
          className="w-full rounded-md border border-light-200/80 dark:border-dark-200/60 bg-light-secondary/50 dark:bg-dark-secondary/40 px-3 py-2 pr-8 text-[11px] lg:text-xs text-black/80 dark:text-white/80 placeholder:text-black/30 dark:placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/20 focus-visible:border-sky-500/40 dark:focus-visible:ring-sky-400/15 dark:focus-visible:border-sky-400/30 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={field.placeholder}
          type="text"
          disabled={loading}
        />
        {loading && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30">
            <Loader2 className="h-4 w-4 animate-spin" />
          </span>
        )}
      </div>
    </FieldLabel>
  );
};

const SettingsTextarea = ({
  field,
  value,
  setValue,
  dataAdd,
}: {
  field: TextareaUIConfigField;
  value?: any;
  setValue: (value: any) => void;
  dataAdd: string;
}) => {
  const [loading, setLoading] = useState(false);

  const handleSave = async (newValue: any) => {
    setLoading(true);
    setValue(newValue);
    try {
      if (field.scope === 'client') {
        localStorage.setItem(field.key, newValue);
        emitClientConfigChanged();
      } else {
        const res = await fetch('/api/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: `${dataAdd}.${field.key}`,
            value: newValue,
          }),
        });

        if (!res.ok) {
          console.error('Failed to save config:', await res.text());
          throw new Error('Failed to save configuration');
        }
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration.');
    } finally {
      setTimeout(() => setLoading(false), 150);
    }
  };

  return (
    <FieldLabel label={field.name} description={field.description}>
      <div className="relative">
        <textarea
          value={value ?? field.default ?? ''}
          onChange={(event) => setValue(event.target.value)}
          onBlur={(event) => handleSave(event.target.value)}
          className="w-full rounded-md border border-light-200/80 dark:border-dark-200/60 bg-light-secondary/50 dark:bg-dark-secondary/40 px-3 py-2.5 pr-10 text-[11px] lg:text-xs text-black/80 dark:text-white/80 placeholder:text-black/30 dark:placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/20 focus-visible:border-sky-500/40 dark:focus-visible:ring-sky-400/15 dark:focus-visible:border-sky-400/30 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[120px] max-h-[400px] leading-relaxed"
          placeholder={field.placeholder}
          rows={6}
          disabled={loading}
        />
        {loading && (
          <span className="pointer-events-none absolute right-3 top-3 text-black/30 dark:text-white/30">
            <Loader2 className="h-4 w-4 animate-spin" />
          </span>
        )}
      </div>
    </FieldLabel>
  );
};

const SettingsSwitch = ({
  field,
  value,
  setValue,
  dataAdd,
}: {
  field: SwitchUIConfigField;
  value?: any;
  setValue: (value: any) => void;
  dataAdd: string;
}) => {
  const [loading, setLoading] = useState(false);

  const handleSave = async (newValue: boolean) => {
    setLoading(true);
    setValue(newValue);
    try {
      if (field.scope === 'client') {
        localStorage.setItem(field.key, String(newValue));
        emitClientConfigChanged();
      } else {
        const res = await fetch('/api/config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: `${dataAdd}.${field.key}`,
            value: newValue,
          }),
        });

        if (!res.ok) {
          console.error('Failed to save config:', await res.text());
          throw new Error('Failed to save configuration');
        }
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration.');
    } finally {
      setTimeout(() => setLoading(false), 150);
    }
  };

  const isChecked = value === true || value === 'true';

  return (
    <div className="flex flex-row items-center gap-4 w-full justify-between">
      <div className="space-y-0.5 flex-1 min-w-0">
        <label className="text-xs text-black/70 dark:text-white/60">
          {field.name}
        </label>
        {field.description && (
          <p className="text-[11px] text-black/35 dark:text-white/30">
            {field.description}
          </p>
        )}
      </div>
      <Switch
        checked={isChecked}
        onChange={handleSave}
        disabled={loading}
        className="group/switch relative flex h-[26px] w-[46px] shrink-0 cursor-pointer rounded-full bg-light-200/80 dark:bg-white/10 p-[3px] transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30 disabled:opacity-50 disabled:cursor-not-allowed data-[checked]:bg-sky-500 dark:data-[checked]:bg-sky-500"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none inline-block size-5 translate-x-0 rounded-full bg-white shadow-md shadow-black/10 ring-0 transition-all duration-300 ease-out group-data-[checked]/switch:translate-x-5"
        />
      </Switch>
    </div>
  );
};

const SettingsField = ({
  field,
  value,
  dataAdd,
}: {
  field: UIConfigField;
  value: any;
  dataAdd: string;
}) => {
  const [val, setVal] = useState(value);

  switch (field.type) {
    case 'select':
      return (
        <SettingsSelect
          field={field}
          value={val}
          setValue={setVal}
          dataAdd={dataAdd}
        />
      );
    case 'string':
      return (
        <SettingsInput
          field={field}
          value={val}
          setValue={setVal}
          dataAdd={dataAdd}
        />
      );
    case 'textarea':
      return (
        <SettingsTextarea
          field={field}
          value={val}
          setValue={setVal}
          dataAdd={dataAdd}
        />
      );
    case 'switch':
      return (
        <SettingsSwitch
          field={field}
          value={val}
          setValue={setVal}
          dataAdd={dataAdd}
        />
      );
    default:
      return <div>Unsupported field type: {field.type}</div>;
  }
};

export default SettingsField;
