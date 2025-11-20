import React, { useState, useEffect, useRef } from 'react';
import {
  VolumeUpIcon,
  VolumeOffIcon,
  EyeIcon,
  EyeOffIcon,
  AccessibilityIcon,
  KeyboardIcon,
  MagnifyingGlassPlusIcon as ZoomInIcon,
  MagnifyingGlassMinusIcon as ZoomOutIcon,
} from '@heroicons/react/24/outline';

// Screen Reader Announcement (unchanged logic, using a hidden div)
interface ScreenReaderAnnouncementProps {
  message: string;
  priority?: 'polite' | 'assertive';
  delay?: number;
}
export const ScreenReaderAnnouncement: React.FC<ScreenReaderAnnouncementProps> = ({
  message,
  priority = 'polite',
  delay = 0,
}) => {
  const [announcement, setAnnouncement] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnnouncement(message);
      const clearTimer = setTimeout(() => setAnnouncement(''), 1000);
      return () => clearTimeout(clearTimer);
    }, delay);
    return () => clearTimeout(timer);
  }, [message, delay]);
  return (
    <div
      className="sr-only"
      role="status"
      aria-live={priority}
      aria-atomic="true"
    >
      {announcement}
    </div>
  );
};

// Keyboard Navigation with help overlay
interface KeyboardNavigationProps {
  children: React.ReactNode;
  shortcuts?: { key: string; description: string; action: () => void }[];
}
export const KeyboardNavigation: React.FC<KeyboardNavigationProps> = ({
  children,
  shortcuts = [],
}) => {
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        setShowHelp((prev) => !prev);
      }
      shortcuts.forEach((s) => {
        if (e.key.toLowerCase() === s.key.toLowerCase()) {
          e.preventDefault();
          s.action();
        }
      });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
  return (
    <>
      {children}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-base-100 p-4 rounded shadow max-w-lg w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-2">Keyboard Shortcuts</h2>
            <p className="mb-2">Press Ctrl+H to toggle this help.</p>
            <ul className="space-y-2">
              {shortcuts.map((s, i) => (
                <li key={i} className="flex justify-between items-center border-b pb-1">
                  <span>{s.description}</span>
                  <kbd className="px-2 py-1 bg-neutral text-neutral-content rounded text-sm">
                    {s.key}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
};

// High Contrast Mode
interface HighContrastModeProps {
  children: React.ReactNode;
}
export const HighContrastMode: React.FC<HighContrastModeProps> = ({ children }) => {
  const [enabled, setEnabled] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  useEffect(() => {
    if (enabled) {
      setAnnouncement('High contrast mode enabled');
      document.documentElement.setAttribute('data-high-contrast', 'true');
    } else {
      setAnnouncement('High contrast mode disabled');
      document.documentElement.removeAttribute('data-high-contrast');
    }
  }, [enabled]);
  return (
    <>
      <ScreenReaderAnnouncement message={announcement} />
      {children}
    </>
  );
};

// Reduced Motion Mode
interface ReducedMotionModeProps {
  children: React.ReactNode;
}
export const ReducedMotionMode: React.FC<ReducedMotionModeProps> = ({ children }) => {
  const [enabled, setEnabled] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  useEffect(() => {
    if (enabled) {
      setAnnouncement('Reduced motion mode enabled');
      document.documentElement.setAttribute('data-reduced-motion', 'true');
    } else {
      setAnnouncement('Reduced motion mode disabled');
      document.documentElement.removeAttribute('data-reduced-motion');
    }
  }, [enabled]);
  return (
    <>
      <ScreenReaderAnnouncement message={announcement} />
      {children}
    </>
  );
};

// Focus Manager (focus trap)
interface FocusManagerProps {
  children: React.ReactNode;
  autoFocus?: boolean;
  focusTrapped?: boolean;
}
export const FocusManager: React.FC<FocusManagerProps> = ({
  children,
  autoFocus = false,
  focusTrapped = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [focusable, setFocusable] = useState<HTMLElement[]>([]);
  useEffect(() => {
    if (containerRef.current) {
      const elems = Array.from(
        containerRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ) as HTMLElement[];
      setFocusable(elems);
    }
  }, []);
  useEffect(() => {
    if (autoFocus && focusable.length) focusable[0].focus();
  }, [autoFocus, focusable]);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!focusTrapped || focusable.length === 0) return;
    if (e.key === 'Tab') {
      e.preventDefault();
      const active = document.activeElement as HTMLElement;
      const idx = focusable.indexOf(active);
      const next = e.shiftKey
        ? idx > 0
          ? focusable[idx - 1]
          : focusable[focusable.length - 1]
        : idx < focusable.length - 1
          ? focusable[idx + 1]
          : focusable[0];
      next.focus();
    }
  };
  return (
    <div
      ref={containerRef}
      onKeyDown={onKeyDown}
      tabIndex={-1}
      className="outline-none"
    >
      {children}
    </div>
  );
};

// Skip Link
interface SkipLinkProps {
  href: string;
  text: string;
}
export const SkipLink: React.FC<SkipLinkProps> = ({ href, text }) => (
  <a
    href={href}
    className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-primary text-primary-content px-4 py-2 rounded"
  >
    {text}
  </a>
);

// Accessibility Toolbar
interface AccessibilityToolbarProps {
  onToggleHighContrast?: () => void;
  onToggleReducedMotion?: () => void;
  onToggleScreenReader?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}
export const AccessibilityToolbar: React.FC<AccessibilityToolbarProps> = ({
  onToggleHighContrast,
  onToggleReducedMotion,
  onToggleScreenReader,
  onZoomIn,
  onZoomOut,
}) => {
  const [announcement, setAnnouncement] = useState('');
  const handleHighContrast = () => {
    onToggleHighContrast?.();
    setAnnouncement('High contrast toggled');
  };
  const handleReducedMotion = () => {
    onToggleReducedMotion?.();
    setAnnouncement('Reduced motion toggled');
  };
  return (
    <>
      <ScreenReaderAnnouncement message={announcement} />
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        <button
          className="btn btn-sm btn-ghost"
          onClick={handleHighContrast}
          aria-label="Toggle high contrast"
        >
          <EyeIcon className="w-5 h-5" />
        </button>
        <button
          className="btn btn-sm btn-ghost"
          onClick={handleReducedMotion}
          aria-label="Toggle reduced motion"
        >
          <AccessibilityIcon className="w-5 h-5" />
        </button>
        {onZoomIn && (
          <button
            className="btn btn-sm btn-ghost"
            onClick={onZoomIn}
            aria-label="Zoom in"
          >
            <ZoomInIcon className="w-5 h-5" />
          </button>
        )}
        {onZoomOut && (
          <button
            className="btn btn-sm btn-ghost"
            onClick={onZoomOut}
            aria-label="Zoom out"
          >
            <ZoomOutIcon className="w-5 h-5" />
          </button>
        )}
      </div>
    </>
  );
};

// Accessible Form (replaces MUI FormControl)
interface AccessibleFormProps {
  children: React.ReactNode;
  onSubmit: (data: Record<string, string>) => void;
  ariaLabel: string;
}
export const AccessibleForm: React.FC<AccessibleFormProps> = ({
  children,
  onSubmit,
  ariaLabel,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data: Record<string, string> = {};
    new FormData(form).forEach((value, key) => {
      data[key] = value.toString();
    });
    onSubmit(data);
  };
  return (
    <form onSubmit={handleSubmit} aria-label={ariaLabel} className="space-y-4">
      {children}
    </form>
  );
};

export default {
  ScreenReaderAnnouncement,
  KeyboardNavigation,
  HighContrastMode,
  ReducedMotionMode,
  FocusManager,
  SkipLink,
  AccessibilityToolbar,
  AccessibleForm,
};