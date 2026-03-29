import { UIConfigField, ConfigModelProvider } from '@/lib/config/types';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Plug2,
  Plus,
  Pencil,
  RefreshCw,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import AddModel from './AddModelDialog';
import UpdateProvider from './UpdateProviderDialog';
import DeleteProvider from './DeleteProviderDialog';

const ModelProvider = ({
  modelProvider,
  setProviders,
  fields,
}: {
  modelProvider: ConfigModelProvider;
  fields: UIConfigField[];
  setProviders: React.Dispatch<React.SetStateAction<ConfigModelProvider[]>>;
}) => {
  const [open, setOpen] = useState(true);
  const [isReloading, setIsReloading] = useState(false);

  const handleReload = async () => {
    setIsReloading(true);
    try {
      const res = await fetch(`/api/providers/${modelProvider.id}/reload`, {
        method: 'POST',
      });
      if (!res.ok) {
        const { message } = await res.json();
        throw new Error(message || 'Reload failed');
      }
      const { provider } = await res.json();
      setProviders((prev) =>
        prev.map((p) =>
          p.id === modelProvider.id ? { ...p, ...provider } : p,
        ) as ConfigModelProvider[],
      );
      toast.success('Provider reloaded.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reload provider.');
    } finally {
      setIsReloading(false);
    }
  };

  const handleModelDelete = async (
    type: 'chat' | 'embedding',
    modelKey: string,
  ) => {
    try {
      const res = await fetch(`/api/providers/${modelProvider.id}/models`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: modelKey, type: type }),
      });

      if (!res.ok) {
        throw new Error('Failed to delete model: ' + (await res.text()));
      }

      setProviders(
        (prev) =>
          prev.map((provider) => {
            if (provider.id === modelProvider.id) {
              return {
                ...provider,
                ...(type === 'chat'
                  ? {
                      chatModels: provider.chatModels.filter(
                        (m) => m.key !== modelKey,
                      ),
                    }
                  : {
                      embeddingModels: provider.embeddingModels.filter(
                        (m) => m.key !== modelKey,
                      ),
                    }),
              };
            }
            return provider;
          }) as ConfigModelProvider[],
      );

      toast.success('Model deleted successfully.');
    } catch (err) {
      console.error('Failed to delete model', err);
      toast.error('Failed to delete model.');
    }
  };

  const modelCount =
    modelProvider.chatModels.filter((m) => m.key !== 'error').length +
    modelProvider.embeddingModels.filter((m) => m.key !== 'error').length;
  const hasError =
    modelProvider.chatModels.some((m) => m.key === 'error') ||
    modelProvider.embeddingModels.some((m) => m.key === 'error');

  return (
    <div
      key={modelProvider.id}
      className="border border-light-200/70 dark:border-dark-200/50 rounded-xl overflow-hidden bg-light-primary/60 dark:bg-dark-primary/60 transition-all duration-200 hover:border-light-200 hover:dark:border-dark-200/70"
    >
      {/* Provider header */}
      <div className="px-5 py-4 flex flex-row justify-between w-full items-center border-b border-light-200/50 dark:border-dark-200/30 bg-light-secondary/30 dark:bg-dark-secondary/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-500/[0.07] dark:bg-sky-400/[0.07]">
            <Plug2 size={14} className="text-sky-500 dark:text-sky-400" />
          </div>
          <div className="flex flex-col">
            <p className="text-[13px] lg:text-sm text-black/85 dark:text-white/85 font-medium tracking-tight">
              {modelProvider.name}
            </p>
            {modelCount > 0 && (
              <p className="text-[10px] lg:text-[11px] text-black/35 dark:text-white/30">
                {modelCount} model{modelCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-row items-center gap-1.5">
          {hasError ? (
            <span
              title="Connection error"
              className="p-1.5 rounded-lg bg-red-50 dark:bg-red-500/10"
            >
              <XCircle size={13} className="text-red-500 dark:text-red-400" />
            </span>
          ) : (
            <span
              title="Connected"
              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10"
            >
              <CheckCircle2
                size={13}
                className="text-emerald-500 dark:text-emerald-400"
              />
            </span>
          )}
          <button
            onClick={handleReload}
            disabled={isReloading}
            title="Reload provider"
            className="p-1.5 rounded-lg hover:bg-light-200/60 dark:hover:bg-dark-200/40 text-black/35 dark:text-white/30 hover:text-black/60 dark:hover:text-white/50 transition-all duration-200 disabled:opacity-40"
          >
            <RefreshCw
              size={13}
              className={isReloading ? 'animate-spin' : ''}
            />
          </button>
          <UpdateProvider
            fields={fields}
            modelProvider={modelProvider}
            setProviders={setProviders}
          />
          <DeleteProvider
            modelProvider={modelProvider}
            setProviders={setProviders}
          />
        </div>
      </div>

      {/* Models list */}
      <div className="flex flex-col gap-y-5 px-5 py-5">
        {/* Chat models */}
        <div className="flex flex-col gap-y-2.5">
          <div className="flex flex-row w-full justify-between items-center">
            <p className="text-[10px] font-semibold text-black/30 dark:text-white/25 uppercase tracking-[0.12em]">
              Chat Models
            </p>
            {!modelProvider.chatModels.some((m) => m.key === 'error') && (
              <AddModel
                providerId={modelProvider.id}
                setProviders={setProviders}
                type="chat"
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            {modelProvider.chatModels.some((m) => m.key === 'error') ? (
              <div className="flex flex-row items-center gap-2 text-xs text-red-500 dark:text-red-400 rounded-lg bg-red-50/80 dark:bg-red-950/20 px-3.5 py-2.5 border border-red-200/60 dark:border-red-900/20">
                <AlertCircle size={14} className="shrink-0" />
                <span className="break-words">
                  {
                    modelProvider.chatModels.find((m) => m.key === 'error')
                      ?.name
                  }
                </span>
              </div>
            ) : modelProvider.chatModels.filter((m) => m.key !== 'error')
                .length === 0 && !hasError ? (
              <div className="flex flex-col items-center justify-center py-4 px-4 rounded-lg border border-dashed border-light-200/60 dark:border-dark-200/30">
                <p className="text-[11px] text-black/30 dark:text-white/25 text-center">
                  No chat models configured
                </p>
              </div>
            ) : modelProvider.chatModels.filter((m) => m.key !== 'error')
                .length > 0 ? (
              <div className="flex flex-row flex-wrap gap-1.5">
                {modelProvider.chatModels.map((model, index) => (
                  <div
                    key={`${modelProvider.id}-chat-${model.key}-${index}`}
                    className="group/tag flex flex-row items-center gap-1.5 text-[11px] lg:text-xs text-black/60 dark:text-white/55 rounded-lg bg-light-secondary/60 dark:bg-dark-secondary/40 px-2.5 py-1.5 border border-light-200/60 dark:border-dark-200/40 transition-all duration-150 hover:border-light-200 hover:dark:border-dark-200/60"
                  >
                    <span>{model.name}</span>
                    <button
                      onClick={() => {
                        handleModelDelete('chat', model.key);
                      }}
                      className="text-black/20 dark:text-white/20 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Embedding models */}
        <div className="flex flex-col gap-y-2.5">
          <div className="flex flex-row w-full justify-between items-center">
            <p className="text-[10px] font-semibold text-black/30 dark:text-white/25 uppercase tracking-[0.12em]">
              Embedding Models
            </p>
            {!modelProvider.embeddingModels.some((m) => m.key === 'error') && (
              <AddModel
                providerId={modelProvider.id}
                setProviders={setProviders}
                type="embedding"
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            {modelProvider.embeddingModels.some((m) => m.key === 'error') ? (
              <div className="flex flex-row items-center gap-2 text-xs text-red-500 dark:text-red-400 rounded-lg bg-red-50/80 dark:bg-red-950/20 px-3.5 py-2.5 border border-red-200/60 dark:border-red-900/20">
                <AlertCircle size={14} className="shrink-0" />
                <span className="break-words">
                  {
                    modelProvider.embeddingModels.find(
                      (m) => m.key === 'error',
                    )?.name
                  }
                </span>
              </div>
            ) : modelProvider.embeddingModels.filter((m) => m.key !== 'error')
                .length === 0 && !hasError ? (
              <div className="flex flex-col items-center justify-center py-4 px-4 rounded-lg border border-dashed border-light-200/60 dark:border-dark-200/30">
                <p className="text-[11px] text-black/30 dark:text-white/25 text-center">
                  No embedding models configured
                </p>
              </div>
            ) : modelProvider.embeddingModels.filter((m) => m.key !== 'error')
                .length > 0 ? (
              <div className="flex flex-row flex-wrap gap-1.5">
                {modelProvider.embeddingModels.map((model, index) => (
                  <div
                    key={`${modelProvider.id}-embedding-${model.key}-${index}`}
                    className="group/tag flex flex-row items-center gap-1.5 text-[11px] lg:text-xs text-black/60 dark:text-white/55 rounded-lg bg-light-secondary/60 dark:bg-dark-secondary/40 px-2.5 py-1.5 border border-light-200/60 dark:border-dark-200/40 transition-all duration-150 hover:border-light-200 hover:dark:border-dark-200/60"
                  >
                    <span>{model.name}</span>
                    <button
                      onClick={() => {
                        handleModelDelete('embedding', model.key);
                      }}
                      className="text-black/20 dark:text-white/20 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelProvider;
