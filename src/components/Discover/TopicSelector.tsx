'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TAXONOMY, getAllLeaves, type TopCategory, type SubCategory, type LeafTopic } from '@/lib/discover/taxonomy';

interface CustomTopic {
  id: number;
  label: string;
  parentPath: string | null;
}

interface TopicSelectorProps {
  selectedKey: string;
  onSelect: (key: string, display: string) => void;
}

const TopicSelector = ({ selectedKey, onSelect }: TopicSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [hoveredTop, setHoveredTop] = useState<string | null>(null);
  const [hoveredSub, setHoveredSub] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [customTopics, setCustomTopics] = useState<CustomTopic[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [addingTopic, setAddingTopic] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCustomTopics();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchCustomTopics = async () => {
    try {
      const res = await fetch('/api/discover/topics');
      if (res.ok) {
        const data = await res.json();
        setCustomTopics(data.topics ?? []);
      }
    } catch {
      // ignore
    }
  };

  const addCustomTopic = async () => {
    if (!newLabel.trim()) return;
    setAddingTopic(true);
    try {
      const res = await fetch('/api/discover/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim() }),
      });
      if (res.ok) {
        setNewLabel('');
        await fetchCustomTopics();
      }
    } finally {
      setAddingTopic(false);
    }
  };

  const deleteCustomTopic = async (id: number) => {
    try {
      await fetch(`/api/discover/topics/${id}`, { method: 'DELETE' });
      setCustomTopics((prev) => prev.filter((t) => t.id !== id));
      if (selectedKey === `custom:${id}`) {
        const firstLeaf = getAllLeaves()[0];
        if (firstLeaf) onSelect(firstLeaf.key, firstLeaf.display);
      }
    } catch {
      // ignore
    }
  };

  const startEdit = (topic: CustomTopic) => {
    setEditingId(topic.id);
    setEditLabel(topic.label);
  };

  const saveEdit = async (id: number) => {
    if (!editLabel.trim()) return;
    try {
      const res = await fetch(`/api/discover/topics/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: editLabel.trim() }),
      });
      if (res.ok) {
        setCustomTopics((prev) =>
          prev.map((t) => (t.id === id ? { ...t, label: editLabel.trim() } : t)),
        );
        setEditingId(null);
      }
    } catch {
      setEditingId(null);
    }
  };

  const selectLeaf = (key: string, display: string) => {
    onSelect(key, display);
    setOpen(false);
    setSearch('');
    setHoveredTop(null);
    setHoveredSub(null);
  };

  const searchResults: LeafTopic[] = search.trim()
    ? getAllLeaves().filter((leaf) =>
        leaf.display.toLowerCase().includes(search.toLowerCase()),
      )
    : [];

  const selectedDisplay =
    getAllLeaves().find((l) => l.key === selectedKey)?.display ??
    customTopics.find((t) => `custom:${t.id}` === selectedKey)?.label ??
    'Select Topic';

  const activeTop = TAXONOMY.find((t) =>
    t.children.some((sub) => sub.children.some((leaf) => leaf.key === selectedKey)),
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-2 border-[0.1px] rounded-full text-sm px-4 py-1.5 transition duration-200 cursor-pointer',
          open
            ? 'text-cyan-700 dark:text-cyan-300 bg-cyan-300/20 border-cyan-700/60 dark:border-cyan-300/40'
            : 'border-black/30 dark:border-white/30 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:border-black/40 dark:hover:border-white/40 hover:bg-black/5 dark:hover:bg-white/5',
        )}
      >
        <span className="max-w-[160px] truncate">{selectedDisplay}</span>
        <ChevronRight
          size={14}
          className={cn('transition-transform', open ? 'rotate-90' : '')}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 flex shadow-xl rounded-2xl overflow-visible">
          {/* Main panel */}
          <div className="w-64 bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden flex flex-col">
            {/* Search */}
            <div className="p-2 border-b border-black/10 dark:border-white/10">
              <input
                type="text"
                placeholder="Search topics..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border-0 outline-none placeholder:text-black/40 dark:placeholder:text-white/40 text-black dark:text-white"
              />
            </div>

            {/* Search results */}
            {search.trim() ? (
              <div className="overflow-y-auto max-h-60 p-1">
                {searchResults.length === 0 ? (
                  <p className="text-xs text-black/40 dark:text-white/40 px-3 py-2">
                    No results
                  </p>
                ) : (
                  searchResults.map((leaf) => (
                    <button
                      key={leaf.key}
                      type="button"
                      onClick={() => selectLeaf(leaf.key, leaf.display)}
                      className={cn(
                        'w-full text-left text-xs px-3 py-1.5 rounded-lg transition-colors',
                        leaf.key === selectedKey
                          ? 'bg-cyan-300/20 text-cyan-700 dark:text-cyan-300'
                          : 'hover:bg-black/5 dark:hover:bg-white/5 text-black/80 dark:text-white/80',
                      )}
                    >
                      {leaf.display}
                    </button>
                  ))
                )}
              </div>
            ) : (
              <>
                {/* Top-level categories */}
                <div className="overflow-y-auto max-h-48 p-1">
                  {TAXONOMY.map((top) => (
                    <button
                      key={top.key}
                      type="button"
                      onMouseEnter={() => {
                        setHoveredTop(top.key);
                        setHoveredSub(null);
                      }}
                      className={cn(
                        'w-full text-left text-xs px-3 py-1.5 rounded-lg flex items-center justify-between transition-colors',
                        hoveredTop === top.key || activeTop?.key === top.key
                          ? 'bg-black/5 dark:bg-white/5 text-black dark:text-white'
                          : 'text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5',
                      )}
                    >
                      <span>
                        {top.icon} {top.display}
                      </span>
                      <ChevronRight size={12} className="opacity-50" />
                    </button>
                  ))}
                </div>

                {/* My Topics */}
                {customTopics.length > 0 && (
                  <>
                    <div className="px-3 pt-2 pb-0.5">
                      <span className="text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30 font-medium">
                        My Topics
                      </span>
                    </div>
                    <div className="px-1 pb-1 max-h-36 overflow-y-auto">
                      {customTopics.map((topic) => (
                        <div
                          key={topic.id}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 group"
                        >
                          {editingId === topic.id ? (
                            <>
                              <input
                                type="text"
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit(topic.id);
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                                className="flex-1 text-xs bg-transparent outline-none text-black dark:text-white min-w-0"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => saveEdit(topic.id)}
                                className="text-green-500 hover:text-green-400 p-0.5"
                              >
                                <Check size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="text-black/40 dark:text-white/40 hover:text-red-400 p-0.5"
                              >
                                <X size={11} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  selectLeaf(`custom:${topic.id}`, topic.label)
                                }
                                className={cn(
                                  'flex-1 text-left text-xs truncate transition-colors',
                                  `custom:${topic.id}` === selectedKey
                                    ? 'text-cyan-700 dark:text-cyan-300'
                                    : 'text-black/80 dark:text-white/80',
                                )}
                              >
                                {topic.label}
                              </button>
                              <button
                                type="button"
                                onClick={() => startEdit(topic)}
                                className="opacity-0 group-hover:opacity-100 text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white p-0.5 transition-opacity"
                              >
                                <Pencil size={10} />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteCustomTopic(topic.id)}
                                className="opacity-0 group-hover:opacity-100 text-black/30 dark:text-white/30 hover:text-red-500 p-0.5 transition-opacity"
                              >
                                <Trash2 size={10} />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Add custom topic */}
                <div className="p-2 border-t border-black/10 dark:border-white/10 flex gap-1">
                  <input
                    type="text"
                    placeholder="Add topic..."
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addCustomTopic();
                    }}
                    className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 border-0 outline-none placeholder:text-black/40 dark:placeholder:text-white/40 text-black dark:text-white min-w-0"
                  />
                  <button
                    type="button"
                    onClick={addCustomTopic}
                    disabled={addingTopic || !newLabel.trim()}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-cyan-600/20 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  >
                    <Plus size={11} />
                    Add
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Subcategory flyout */}
          {hoveredTop && !search.trim() && (
            <SubFlyout
              top={TAXONOMY.find((t) => t.key === hoveredTop)!}
              hoveredSub={hoveredSub}
              setHoveredSub={setHoveredSub}
              selectedKey={selectedKey}
              onSelect={selectLeaf}
            />
          )}

          {/* Leaf flyout */}
          {hoveredSub && !search.trim() && (
            <LeafFlyout
              sub={
                TAXONOMY.find((t) => t.key === hoveredTop)?.children.find(
                  (s) => s.key === hoveredSub,
                )!
              }
              selectedKey={selectedKey}
              onSelect={selectLeaf}
            />
          )}
        </div>
      )}
    </div>
  );
};

const SubFlyout = ({
  top,
  hoveredSub,
  setHoveredSub,
  selectedKey,
  onSelect,
}: {
  top: TopCategory;
  hoveredSub: string | null;
  setHoveredSub: (k: string | null) => void;
  selectedKey: string;
  onSelect: (key: string, display: string) => void;
}) => (
  <div className="ml-1 w-52 bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl">
    <div className="p-1 overflow-y-auto max-h-72">
      {top.children.map((sub) => {
        const isActive = sub.children.some((l) => l.key === selectedKey);
        return (
          <button
            key={sub.key}
            type="button"
            onMouseEnter={() => setHoveredSub(sub.key)}
            className={cn(
              'w-full text-left text-xs px-3 py-1.5 rounded-lg flex items-center justify-between transition-colors',
              hoveredSub === sub.key || isActive
                ? 'bg-black/5 dark:bg-white/5 text-black dark:text-white'
                : 'text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5',
            )}
          >
            <span>{sub.display}</span>
            <ChevronRight size={12} className="opacity-50" />
          </button>
        );
      })}
    </div>
  </div>
);

const LeafFlyout = ({
  sub,
  selectedKey,
  onSelect,
}: {
  sub: SubCategory;
  selectedKey: string;
  onSelect: (key: string, display: string) => void;
}) => (
  <div className="ml-1 w-52 bg-white dark:bg-[#1a1a1a] border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl">
    <div className="p-1 overflow-y-auto max-h-72">
      {sub.children.map((leaf) => (
        <button
          key={leaf.key}
          type="button"
          onClick={() => onSelect(leaf.key, leaf.display)}
          className={cn(
            'w-full text-left text-xs px-3 py-2 rounded-lg transition-colors',
            leaf.key === selectedKey
              ? 'bg-cyan-300/20 text-cyan-700 dark:text-cyan-300'
              : 'text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white',
          )}
        >
          {leaf.display}
        </button>
      ))}
    </div>
  </div>
);

export default TopicSelector;
