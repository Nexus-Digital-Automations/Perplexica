import {
  Microscope,
  Ruler,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
} from '@headlessui/react';
import { useChat } from '@/lib/hooks/useChat';
import { AnimatePresence, motion } from 'motion/react';
import {
  PipelineOverrides,
  PIPELINE_OVERRIDES_LS_KEY,
} from '@/lib/config/pipeline';
import type { ResponseLength } from '@/lib/config/pipeline';

const NUM_INPUT_CLS =
  'w-16 px-2 py-1 text-xs rounded-md border border-light-200 dark:border-dark-200 ' +
  'bg-light-primary dark:bg-dark-primary text-black dark:text-white ' +
  'focus:outline-none focus:ring-1 focus:ring-blue-500';

const BTN_CLS =
  'relative p-2 rounded-lg text-black/50 dark:text-white/50 hover:bg-light-200 dark:hover:bg-dark-200 active:scale-95 transition duration-200 hover:text-black dark:hover:text-white focus:outline-none';

const PANEL_CLS =
  'origin-bottom bg-light-primary dark:bg-dark-primary border rounded-lg border-light-200 dark:border-dark-200 shadow-lg';

const responseLengthOptions: { key: ResponseLength; label: string }[] = [
  { key: 'brief', label: 'Brief' },
  { key: 'standard', label: 'Standard' },
  { key: 'comprehensive', label: 'Detailed' },
];

const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
  <button
    type="button"
    onClick={onToggle}
    className={cn(
      'w-8 h-4 rounded-full transition relative flex-shrink-0',
      on ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600',
    )}
  >
    <span
      className={cn(
        'absolute top-0.5 w-3 h-3 rounded-full bg-white transition',
        on ? 'left-4' : 'left-0.5',
      )}
    />
  </button>
);

const usePipelineUpdate = () => {
  const { pipelineOverrides, setPipelineOverrides } = useChat();

  const update = (patch: Partial<PipelineOverrides>) => {
    const next = { ...pipelineOverrides, ...patch };
    setPipelineOverrides(next);
    try {
      Object.keys(next).length > 0
        ? localStorage.setItem(
            PIPELINE_OVERRIDES_LS_KEY,
            JSON.stringify(next),
          )
        : localStorage.removeItem(PIPELINE_OVERRIDES_LS_KEY);
    } catch { /* ignore */ }
  };

  return { overrides: pipelineOverrides, update };
};

const MiniPopover = ({
  icon: Icon,
  label,
  active,
  children,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) => (
  <Popover className="relative">
    {({ open }) => (
      <>
        <PopoverButton type="button" className={BTN_CLS} title={label}>
          <Icon size={16} />
          {active && (
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
          )}
        </PopoverButton>
        <AnimatePresence>
          {open && (
            <PopoverPanel
              static
              className="absolute z-10 bottom-full mb-2 right-0"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1, ease: 'easeOut' }}
                className={cn(PANEL_CLS, 'w-64')}
              >
                <div className="p-3 space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
                    {label}
                  </p>
                  {children}
                </div>
              </motion.div>
            </PopoverPanel>
          )}
        </AnimatePresence>
      </>
    )}
  </Popover>
);

const Row = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-[11px] text-black/60 dark:text-white/50">
      {label}
    </span>
    {children}
  </div>
);

export const ResearchConfig = () => {
  const { overrides, update } = usePipelineUpdate();
  const hasOverrides =
    overrides.numQuestions !== undefined ||
    overrides.sourcesPerQuestion !== undefined ||
    overrides.questionsParallel !== undefined ||
    overrides.interactiveQuestions !== undefined ||
    overrides.maxConcurrentResearchers !== undefined;

  return (
    <MiniPopover icon={Microscope} label="Research" active={hasOverrides}>
      <Row label="Questions">
        <input
          type="number"
          min={1}
          max={50}
          placeholder="auto"
          value={overrides.numQuestions ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            update({
              numQuestions:
                val === ''
                  ? undefined
                  : Math.min(50, Math.max(1, parseInt(val) || 1)),
            });
          }}
          className={NUM_INPUT_CLS}
        />
      </Row>
      <Row label="Sources / question">
        <input
          type="number"
          min={1}
          max={25}
          placeholder="auto"
          value={overrides.sourcesPerQuestion ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            update({
              sourcesPerQuestion:
                val === ''
                  ? undefined
                  : Math.min(25, Math.max(1, parseInt(val) || 1)),
            });
          }}
          className={NUM_INPUT_CLS}
        />
      </Row>
      <Row label="Parallel">
        <Toggle
          on={overrides.questionsParallel ?? true}
          onToggle={() =>
            update({
              questionsParallel: !(overrides.questionsParallel ?? true),
            })
          }
        />
      </Row>
      <Row label="Review questions">
        <Toggle
          on={overrides.interactiveQuestions ?? true}
          onToggle={() =>
            update({
              interactiveQuestions: !(overrides.interactiveQuestions ?? true),
            })
          }
        />
      </Row>
      <Row label="Max parallel">
        <input
          type="number"
          min={1}
          max={10}
          placeholder="5"
          value={overrides.maxConcurrentResearchers ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            update({
              maxConcurrentResearchers:
                val === ''
                  ? undefined
                  : Math.min(10, Math.max(1, parseInt(val) || 1)),
            });
          }}
          className={NUM_INPUT_CLS}
        />
      </Row>
    </MiniPopover>
  );
};

export const ResponseConfig = () => {
  const { overrides, update } = usePipelineUpdate();
  const hasOverrides =
    overrides.responseLength !== undefined ||
    overrides.writerTemperature !== undefined ||
    overrides.budgetUsd !== undefined;

  return (
    <MiniPopover icon={Ruler} label="Response" active={hasOverrides}>
      <Row label="Length">
        <div className="flex space-x-1">
          {responseLengthOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => update({ responseLength: opt.key })}
              className={cn(
                'px-2 py-0.5 text-[10px] rounded-md transition',
                overrides.responseLength === opt.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-light-secondary dark:bg-dark-secondary text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-dark-200',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Row>
      <Row label="Creativity">
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            max={100}
            step={10}
            placeholder="20"
            value={
              overrides.writerTemperature !== undefined
                ? Math.round(overrides.writerTemperature * 100)
                : ''
            }
            onChange={(e) => {
              const val = e.target.value;
              update({
                writerTemperature:
                  val === ''
                    ? undefined
                    : Math.min(100, Math.max(0, parseInt(val) || 0)) / 100,
              });
            }}
            className={NUM_INPUT_CLS}
          />
          <span className="text-[10px] text-black/50 dark:text-white/50">
            %
          </span>
        </div>
      </Row>
      <Row label="Budget ($/search)">
        <input
          type="number"
          min={0}
          step={0.01}
          placeholder="No limit"
          value={overrides.budgetUsd ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            update({ budgetUsd: val === '' ? null : parseFloat(val) });
          }}
          className={NUM_INPUT_CLS}
        />
      </Row>
    </MiniPopover>
  );
};

const PercentInput = ({
  value,
  placeholder,
  onChange,
}: {
  value: number | undefined;
  placeholder: string;
  onChange: (v: number | undefined) => void;
}) => (
  <div className="flex items-center gap-1">
    <input
      type="number"
      min={0}
      max={100}
      placeholder={placeholder}
      value={value !== undefined ? Math.round(value * 100) : ''}
      onChange={(e) => {
        const val = e.target.value;
        onChange(
          val === ''
            ? undefined
            : Math.min(100, Math.max(0, parseInt(val) || 0)) / 100,
        );
      }}
      className={NUM_INPUT_CLS}
    />
    <span className="text-[10px] text-black/50 dark:text-white/50">%</span>
  </div>
);

export const CitationsConfig = () => {
  const { overrides, update } = usePipelineUpdate();
  const verificationOn = overrides.verificationEnabled ?? true;
  const hasOverrides =
    overrides.verificationEnabled !== undefined ||
    overrides.passThreshold !== undefined ||
    overrides.verbatimPassThreshold !== undefined ||
    overrides.weakThreshold !== undefined ||
    overrides.maxCorrectionRetries !== undefined ||
    overrides.correctionTemperature !== undefined ||
    overrides.correctionTimeoutMs !== undefined;

  return (
    <MiniPopover icon={ShieldCheck} label="Citations" active={hasOverrides}>
      <Row label="Verification">
        <Toggle
          on={verificationOn}
          onToggle={() => update({ verificationEnabled: !verificationOn })}
        />
      </Row>
      <Row label="Threshold">
        <PercentInput
          value={overrides.passThreshold}
          placeholder="30"
          onChange={(v) => update({ passThreshold: v })}
        />
      </Row>
      <Row label="Verbatim threshold">
        <PercentInput
          value={overrides.verbatimPassThreshold}
          placeholder="50"
          onChange={(v) => update({ verbatimPassThreshold: v })}
        />
      </Row>
      <Row label="Weak threshold">
        <PercentInput
          value={overrides.weakThreshold}
          placeholder="18"
          onChange={(v) => update({ weakThreshold: v })}
        />
      </Row>
      <Row label="Correction retries">
        <input
          type="number"
          min={0}
          max={5}
          placeholder="1"
          value={overrides.maxCorrectionRetries ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            update({
              maxCorrectionRetries:
                val === ''
                  ? undefined
                  : Math.min(5, Math.max(0, parseInt(val) || 0)),
            });
          }}
          className={NUM_INPUT_CLS}
        />
      </Row>
      <Row label="Correction creativity">
        <PercentInput
          value={overrides.correctionTemperature}
          placeholder="10"
          onChange={(v) => update({ correctionTemperature: v })}
        />
      </Row>
      <Row label="Correction timeout">
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={1}
            max={60}
            placeholder="12"
            value={
              overrides.correctionTimeoutMs !== undefined
                ? Math.round(overrides.correctionTimeoutMs / 1000)
                : ''
            }
            onChange={(e) => {
              const val = e.target.value;
              update({
                correctionTimeoutMs:
                  val === ''
                    ? undefined
                    : Math.min(60, Math.max(1, parseInt(val) || 1)) * 1000,
              });
            }}
            className={NUM_INPUT_CLS}
          />
          <span className="text-[10px] text-black/50 dark:text-white/50">
            s
          </span>
        </div>
      </Row>
      <Row label="Credibility adjust">
        <PercentInput
          value={overrides.credibilityThresholdAdjustment}
          placeholder="3"
          onChange={(v) => update({ credibilityThresholdAdjustment: v })}
        />
      </Row>
    </MiniPopover>
  );
};

const AdvancedSearchConfig = () => (
  <div className="flex flex-row items-center space-x-1">
    <ResearchConfig />
    <ResponseConfig />
    <CitationsConfig />
  </div>
);

export default AdvancedSearchConfig;
