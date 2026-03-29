import React, { useState } from 'react';
import AddProvider from './AddProviderDialog';
import {
  ConfigModelProvider,
  ModelProviderUISection,
  UIConfigField,
} from '@/lib/config/types';
import ModelProvider from './ModelProvider';
import ModelSelect from './ModelSelect';

const Models = ({
  fields,
  values,
}: {
  fields: ModelProviderUISection[];
  values: ConfigModelProvider[];
}) => {
  const [providers, setProviders] = useState<ConfigModelProvider[]>(values);

  return (
    <div className="flex-1 space-y-6 overflow-y-auto py-6">
      <div className="flex flex-col px-8 gap-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/30 dark:text-white/25">
          Active models
        </p>
        <ModelSelect
          providers={values.filter((p) =>
            p.chatModels.some((m) => m.key != 'error'),
          )}
          type="chat"
        />
        <ModelSelect
          providers={values.filter((p) =>
            p.embeddingModels.some((m) => m.key != 'error'),
          )}
          type="embedding"
        />
      </div>
      <div className="mx-8 border-t border-light-200/50 dark:border-dark-200/30" />
      <div className="flex flex-row justify-between items-center px-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/30 dark:text-white/25">
          Connections
        </p>
        <AddProvider modelProviders={fields} setProviders={setProviders} />
      </div>
      <div className="flex flex-col px-8 gap-y-3">
        {providers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-6 rounded-xl border border-dashed border-light-200/80 dark:border-dark-200/50 bg-light-secondary/20 dark:bg-dark-secondary/10">
            <div className="p-3.5 rounded-xl bg-sky-500/[0.07] dark:bg-sky-400/[0.07] mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-7 h-7 text-sky-500/70 dark:text-sky-400/60"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-black/60 dark:text-white/55 mb-1.5">
              No connections yet
            </p>
            <p className="text-xs text-black/35 dark:text-white/30 text-center max-w-xs leading-relaxed">
              Add your first connection to start using AI models.
            </p>
          </div>
        ) : (
          providers.map((provider) => (
            <ModelProvider
              key={`provider-${provider.id}`}
              fields={
                (fields.find((f) => f.key === provider.type)?.fields ??
                  []) as UIConfigField[]
              }
              modelProvider={provider}
              setProviders={setProviders}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Models;
