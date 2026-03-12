import { ChevronDown, Settings2, Sliders, Star, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/react';
import { useState } from 'react';
import { useChat } from '@/lib/hooks/useChat';
import { AnimatePresence, motion } from 'motion/react';
import { ResponseLength } from '@/lib/config/pipeline';

const OptimizationModes = [
  {
    key: 'speed',
    title: 'Speed',
    description: 'Prioritize speed and get the quickest possible answer.',
    icon: <Zap size={16} className="text-[#FF9800]" />,
  },
  {
    key: 'balanced',
    title: 'Balanced',
    description: 'Find the right balance between speed and accuracy',
    icon: <Sliders size={16} className="text-[#4CAF50]" />,
  },
  {
    key: 'quality',
    title: 'Quality',
    description: 'Get the most thorough and accurate answer',
    icon: (
      <Star
        size={16}
        className="text-[#2196F3] dark:text-[#BBDEFB] fill-[#BBDEFB] dark:fill-[#2196F3]"
      />
    ),
  },
];

const responseLengthOptions: { key: ResponseLength; label: string }[] = [
  { key: 'brief', label: 'Brief' },
  { key: 'standard', label: 'Standard' },
  { key: 'comprehensive', label: 'Detailed' },
];

const Optimization = () => {
  const {
    optimizationMode,
    setOptimizationMode,
    pipelineOverrides,
    setPipelineOverrides,
  } = useChat();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasOverrides = Object.keys(pipelineOverrides).length > 0;

  const handleModeChange = (key: string) => {
    setOptimizationMode(key);
    setPipelineOverrides({});
    setShowAdvanced(false);
  };

  return (
    <Popover className="relative w-full max-w-[15rem] md:max-w-md lg:max-w-lg">
      {({ open }) => (
        <>
          <PopoverButton
            type="button"
            className="p-2 text-black/50 dark:text-white/50 rounded-xl hover:bg-light-secondary dark:hover:bg-dark-secondary active:scale-95 transition duration-200 hover:text-black dark:hover:text-white focus:outline-none"
          >
            <div className="flex flex-row items-center space-x-1">
              {
                OptimizationModes.find((mode) => mode.key === optimizationMode)
                  ?.icon
              }
              {hasOverrides && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              )}
              <ChevronDown
                size={16}
                className={cn(
                  open ? 'rotate-180' : 'rotate-0',
                  'transition duration:200',
                )}
              />
            </div>
          </PopoverButton>
          <AnimatePresence>
            {open && (
              <PopoverPanel
                className="absolute z-10 w-64 md:w-[280px] left-0"
                static
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.1, ease: 'easeOut' }}
                  className="origin-top-left flex flex-col space-y-2 bg-light-primary dark:bg-dark-primary border rounded-lg border-light-200 dark:border-dark-200 w-full p-2 max-h-[400px] md:max-h-none overflow-y-auto"
                >
                  {OptimizationModes.map((mode, i) => (
                    <button
                      onClick={() => handleModeChange(mode.key)}
                      key={i}
                      type="button"
                      className={cn(
                        'p-2 rounded-lg flex flex-col items-start justify-start text-start space-y-1 duration-200 cursor-pointer transition focus:outline-none',
                        optimizationMode === mode.key
                          ? 'bg-light-secondary dark:bg-dark-secondary'
                          : 'hover:bg-light-secondary dark:hover:bg-dark-secondary',
                      )}
                    >
                      <div className="flex flex-row justify-between w-full text-black dark:text-white">
                        <div className="flex flex-row space-x-1">
                          {mode.icon}
                          <p className="text-xs font-medium">{mode.title}</p>
                        </div>
                        {mode.key === 'quality' && (
                          <span className="bg-sky-500/70 dark:bg-sky-500/40 border border-sky-600 px-1 rounded-full text-[10px] text-white">
                            Beta
                          </span>
                        )}
                      </div>
                      <p className="text-black/70 dark:text-white/70 text-xs">
                        {mode.description}
                      </p>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center space-x-1 px-2 py-1 text-xs text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition"
                  >
                    <Settings2 size={12} />
                    <span>Advanced</span>
                    <ChevronDown
                      size={12}
                      className={cn(
                        showAdvanced ? 'rotate-180' : 'rotate-0',
                        'transition duration-200',
                      )}
                    />
                  </button>

                  {showAdvanced && (
                    <div className="space-y-3 px-2 pb-1">
                      {/* Research Depth */}
                      <div>
                        <label className="text-[10px] text-black/60 dark:text-white/60 font-medium">
                          Research Depth ({pipelineOverrides.maxIterations ?? '-'})
                        </label>
                        <input
                          type="range"
                          min={1}
                          max={50}
                          value={pipelineOverrides.maxIterations ?? ''}
                          onChange={(e) =>
                            setPipelineOverrides({
                              ...pipelineOverrides,
                              maxIterations: parseInt(e.target.value),
                            })
                          }
                          className="w-full h-1 accent-blue-500"
                        />
                      </div>

                      {/* Response Length */}
                      <div>
                        <label className="text-[10px] text-black/60 dark:text-white/60 font-medium">
                          Response Length
                        </label>
                        <div className="flex space-x-1 mt-1">
                          {responseLengthOptions.map((opt) => (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() =>
                                setPipelineOverrides({
                                  ...pipelineOverrides,
                                  responseLength: opt.key,
                                })
                              }
                              className={cn(
                                'px-2 py-0.5 text-[10px] rounded-md transition',
                                pipelineOverrides.responseLength === opt.key
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-light-secondary dark:bg-dark-secondary text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-dark-200',
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Verification Toggle */}
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-black/60 dark:text-white/60 font-medium">
                          Verification
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setPipelineOverrides({
                              ...pipelineOverrides,
                              verificationEnabled:
                                pipelineOverrides.verificationEnabled === undefined
                                  ? optimizationMode !== 'speed'
                                    ? false
                                    : true
                                  : !pipelineOverrides.verificationEnabled,
                            })
                          }
                          className={cn(
                            'w-8 h-4 rounded-full transition relative',
                            (pipelineOverrides.verificationEnabled ??
                              optimizationMode !== 'speed')
                              ? 'bg-blue-500'
                              : 'bg-gray-300 dark:bg-gray-600',
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 w-3 h-3 rounded-full bg-white transition',
                              (pipelineOverrides.verificationEnabled ??
                                optimizationMode !== 'speed')
                                ? 'left-4'
                                : 'left-0.5',
                            )}
                          />
                        </button>
                      </div>

                      {/* Strictness */}
                      <div>
                        <label className="text-[10px] text-black/60 dark:text-white/60 font-medium">
                          Strictness ({pipelineOverrides.passThreshold ?? '-'})
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={
                            pipelineOverrides.passThreshold !== undefined
                              ? pipelineOverrides.passThreshold * 100
                              : 50
                          }
                          onChange={(e) =>
                            setPipelineOverrides({
                              ...pipelineOverrides,
                              passThreshold: parseInt(e.target.value) / 100,
                            })
                          }
                          className="w-full h-1 accent-blue-500"
                        />
                      </div>

                      {hasOverrides && (
                        <button
                          type="button"
                          onClick={() => setPipelineOverrides({})}
                          className="text-[10px] text-red-500 hover:text-red-600 transition"
                        >
                          Reset overrides
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              </PopoverPanel>
            )}
          </AnimatePresence>
        </>
      )}
    </Popover>
  );
};

export default Optimization;
