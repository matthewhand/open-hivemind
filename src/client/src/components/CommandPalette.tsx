import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Bot, Users, Shield, Settings, Activity, Component,
  Brain, MessageSquare, Map, Search, CornerDownLeft,
} from 'lucide-react';
import Kbd from './DaisyUI/Kbd';

interface PaletteItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  section?: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  { id: 'overview', label: 'Overview', path: '/admin/overview', icon: <LayoutDashboard className="w-4 h-4" />, section: 'Pages' },
  { id: 'bots', label: 'Bots', path: '/admin/bots', icon: <Bot className="w-4 h-4" />, section: 'Pages' },
  { id: 'create-bot', label: 'Create New Bot', path: '/admin/bots/create', icon: <Bot className="w-4 h-4" />, section: 'Actions' },
  { id: 'personas', label: 'Personas', path: '/admin/personas', icon: <Users className="w-4 h-4" />, section: 'Pages' },
  { id: 'guards', label: 'Guards', path: '/admin/guards', icon: <Shield className="w-4 h-4" />, section: 'Pages' },
  { id: 'llm-providers', label: 'LLM Providers', path: '/admin/providers/llm', icon: <Brain className="w-4 h-4" />, section: 'Pages' },
  { id: 'message-providers', label: 'Message Providers', path: '/admin/providers/message', icon: <MessageSquare className="w-4 h-4" />, section: 'Pages' },
  { id: 'monitoring', label: 'Monitoring', path: '/admin/monitoring', icon: <Activity className="w-4 h-4" />, section: 'Pages' },
  { id: 'settings', label: 'Settings', path: '/admin/settings', icon: <Settings className="w-4 h-4" />, section: 'Pages' },
  { id: 'configuration', label: 'Global Defaults', path: '/admin/configuration', icon: <Settings className="w-4 h-4" />, section: 'Pages' },
  { id: 'showcase', label: 'UI Components', path: '/admin/showcase', icon: <Component className="w-4 h-4" />, section: 'Developer' },
  { id: 'sitemap', label: 'Sitemap', path: '/admin/sitemap', icon: <Map className="w-4 h-4" />, section: 'Developer' },
];

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    if (!query.trim()) return PALETTE_ITEMS;
    const lower = query.toLowerCase();
    return PALETTE_ITEMS.filter(
      item =>
        item.label.toLowerCase().includes(lower) ||
        item.path.toLowerCase().includes(lower) ||
        (item.section && item.section.toLowerCase().includes(lower))
    );
  }, [query]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Focus after the dialog has rendered
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Clamp selected index when results change
  useEffect(() => {
    setSelectedIndex(prev => Math.min(prev, Math.max(filtered.length - 1, 0)));
  }, [filtered.length]);

  // Scroll the selected item into view
  useEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return;
    const selected = listEl.children[selectedIndex] as HTMLElement | undefined;
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const selectItem = (item: PaletteItem) => {
    onClose();
    navigate(item.path);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filtered.length);
      break;
    case 'ArrowUp':
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
      break;
    case 'Enter':
      e.preventDefault();
      if (filtered[selectedIndex]) {
        selectItem(filtered[selectedIndex]);
      }
      break;
    case 'Escape':
      e.preventDefault();
      onClose();
      break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Palette card */}
      <div
        className="relative w-full max-w-lg bg-base-100 rounded-xl shadow-2xl border border-base-300 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 border-b border-base-300">
          <Search className="w-5 h-5 text-base-content/50 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="input input-ghost w-full focus:outline-none border-none bg-transparent py-4 text-base"
            placeholder="Type a command or search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Command palette search"
          />
          <Kbd size="sm" className="shrink-0">Esc</Kbd>
        </div>

        {/* Results list */}
        <ul
          ref={listRef}
          className="max-h-72 overflow-y-auto py-2"
          role="listbox" aria-label="Command results"
        >
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-base-content/50">
              No results found
            </li>
          )}
          {filtered.map((item, idx) => (
            <li
              key={item.id}
              role="option"
              aria-selected={idx === selectedIndex}
              className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${
                idx === selectedIndex
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-base-200 text-base-content'
              }`}
              onClick={() => selectItem(item)}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <span className="shrink-0 opacity-70">{item.icon}</span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.section && (
                <span className="text-xs text-base-content/40">{item.section}</span>
              )}
              {idx === selectedIndex && (
                <CornerDownLeft className="w-3.5 h-3.5 opacity-40 shrink-0" />
              )}
            </li>
          ))}
        </ul>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-base-300 text-xs text-base-content/50">
          <span className="flex items-center gap-1">
            <Kbd size="xs">&#8593;</Kbd>
            <Kbd size="xs">&#8595;</Kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd size="xs">Enter</Kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <Kbd size="xs">Esc</Kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
