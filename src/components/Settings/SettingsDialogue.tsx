import { Dialog, DialogPanel } from '@headlessui/react';
import {
  ArrowLeft,
  BrainCog,
  ChevronLeft,
  ExternalLink,
  Search,
  Sliders,
  ToggleRight,
} from 'lucide-react';
import Preferences from './Sections/Preferences';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Loader from '../ui/Loader';
import { cn } from '@/lib/utils';
import Models from './Sections/Models/Section';
import SearchSection from './Sections/Search';
import Select from '@/components/ui/Select';
import Personalization from './Sections/Personalization';

const sections = [
  {
    key: 'preferences',
    name: 'Preferences',
    description: 'Customize your application preferences.',
    icon: Sliders,
    component: Preferences,
    dataAdd: 'preferences',
  },
  {
    key: 'personalization',
    name: 'Personalization',
    description: 'Customize the behavior and tone of the model.',
    icon: ToggleRight,
    component: Personalization,
    dataAdd: 'personalization',
  },
  {
    key: 'models',
    name: 'Models',
    description: 'Connect to AI services and manage connections.',
    icon: BrainCog,
    component: Models,
    dataAdd: 'modelProviders',
  },
  {
    key: 'search',
    name: 'Search',
    description: 'Manage search settings.',
    icon: Search,
    component: SearchSection,
    dataAdd: 'search',
  },
];

const SettingsDialogue = ({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (active: boolean) => void;
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<string>(sections[0].key);
  const [selectedSection, setSelectedSection] = useState(sections[0]);

  useEffect(() => {
    setSelectedSection(sections.find((s) => s.key === activeSection)!);
  }, [activeSection]);

  useEffect(() => {
    if (isOpen) {
      const fetchConfig = async () => {
        try {
          const res = await fetch('/api/config', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          const data = await res.json();

          setConfig(data);
        } catch (error) {
          console.error('Error fetching config:', error);
          toast.error('Failed to load configuration.');
        } finally {
          setIsLoading(false);
        }
      };

      fetchConfig();
    }
  }, [isOpen]);

  return (
    <Dialog
      open={isOpen}
      onClose={() => setIsOpen(false)}
      className="relative z-50"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 flex w-screen items-center justify-center p-4 bg-black/40 backdrop-blur-md h-screen"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="w-full h-full flex items-center justify-center"
        >
          <DialogPanel className="border border-light-200/80 dark:border-dark-200/60 bg-light-primary dark:bg-dark-primary rounded-2xl h-[95vh] w-[95vw] md:h-[90vh] md:w-[90vw] lg:h-[85vh] lg:w-[min(72vw,900px)] overflow-hidden flex flex-col shadow-2xl shadow-black/10 dark:shadow-black/40">
            {isLoading ? (
              <div className="flex items-center justify-center h-full w-full">
                <Loader />
              </div>
            ) : (
              <div className="flex flex-1 inset-0 h-full overflow-hidden">
                {/* Desktop sidebar */}
                <div className="hidden lg:flex flex-col justify-between w-[260px] border-r border-light-200/70 dark:border-dark-200/50 h-full bg-light-secondary/40 dark:bg-dark-secondary/30 overflow-y-auto">
                  <div className="flex flex-col px-4 pt-5">
                    <button
                      onClick={() => setIsOpen(false)}
                      className="group flex flex-row items-center gap-1.5 px-2 py-2 rounded-lg hover:bg-light-200/60 hover:dark:bg-dark-200/40 transition-all duration-200 mb-1"
                    >
                      <ChevronLeft
                        size={16}
                        className="text-black/40 dark:text-white/40 group-hover:text-black/60 group-hover:dark:text-white/60 transition-colors"
                      />
                      <span className="text-black/40 dark:text-white/40 group-hover:text-black/60 group-hover:dark:text-white/60 text-[13px] transition-colors">
                        Back
                      </span>
                    </button>

                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/30 dark:text-white/25 px-2 mt-6 mb-3">
                      Settings
                    </p>

                    <div className="flex flex-col gap-0.5">
                      {sections.map((section) => {
                        const isActive = activeSection === section.key;
                        return (
                          <button
                            key={section.dataAdd}
                            className={cn(
                              'group relative flex flex-row items-center gap-3 px-3 py-2.5 rounded-xl w-full text-[13px] transition-all duration-200',
                              isActive
                                ? 'bg-light-200/80 dark:bg-dark-200/60 text-black dark:text-white shadow-sm shadow-black/[0.03] dark:shadow-black/10'
                                : 'text-black/55 dark:text-white/50 hover:text-black/80 hover:dark:text-white/70 hover:bg-light-200/40 hover:dark:bg-dark-200/30',
                            )}
                            onClick={() => setActiveSection(section.key)}
                          >
                            <div
                              className={cn(
                                'flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200',
                                isActive
                                  ? 'bg-sky-500/10 dark:bg-sky-400/10 text-sky-600 dark:text-sky-400'
                                  : 'text-black/40 dark:text-white/35 group-hover:text-black/60 group-hover:dark:text-white/50',
                              )}
                            >
                              <section.icon size={15} strokeWidth={isActive ? 2 : 1.5} />
                            </div>
                            <span className={cn(isActive && 'font-medium')}>
                              {section.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 py-5 px-6 border-t border-light-200/50 dark:border-dark-200/30">
                    <p className="text-[11px] text-black/35 dark:text-white/30 tabular-nums">
                      v{process.env.NEXT_PUBLIC_VERSION}
                    </p>
                    <a
                      href="https://github.com/itzcrazykns/vane"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-black/35 dark:text-white/30 flex flex-row gap-1 items-center transition duration-200 hover:text-black/60 hover:dark:text-white/50"
                    >
                      <span>GitHub</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>

                {/* Content area */}
                <div className="w-full flex flex-col overflow-hidden">
                  {/* Mobile header */}
                  <div className="flex flex-row lg:hidden w-full justify-between items-center px-5 py-4 flex-shrink-0 border-b border-light-200/60 dark:border-dark-200/40">
                    <button
                      onClick={() => setIsOpen(false)}
                      className="group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-light-200/60 hover:dark:bg-dark-200/40 transition-colors"
                    >
                      <ArrowLeft
                        size={18}
                        className="text-black/50 dark:text-white/50 group-hover:text-black/70 group-hover:dark:text-white/70"
                      />
                    </button>
                    <Select
                      options={sections.map((section) => {
                        return {
                          value: section.key,
                          key: section.key,
                          label: section.name,
                        };
                      })}
                      value={activeSection}
                      onChange={(e) => {
                        setActiveSection(e.target.value);
                      }}
                      className="!text-xs lg:!text-sm"
                    />
                  </div>

                  {selectedSection.component && (
                    <div className="flex flex-1 flex-col overflow-hidden">
                      {/* Section header */}
                      <div className="px-8 pt-6 pb-5 flex-shrink-0 border-b border-light-200/40 dark:border-dark-200/30">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={selectedSection.key}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="flex flex-col gap-1"
                          >
                            <h2 className="font-medium text-black dark:text-white text-sm tracking-tight">
                              {selectedSection.name}
                            </h2>
                            <p className="text-[11px] lg:text-xs text-black/45 dark:text-white/40">
                              {selectedSection.description}
                            </p>
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      {/* Section content */}
                      <div className="flex-1 overflow-y-auto">
                        <selectedSection.component
                          fields={config.fields[selectedSection.dataAdd]}
                          values={config.values[selectedSection.dataAdd]}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogPanel>
        </motion.div>
      </motion.div>
    </Dialog>
  );
};

export default SettingsDialogue;
