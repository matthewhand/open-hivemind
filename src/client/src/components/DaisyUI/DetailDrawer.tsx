/**
 * DetailDrawer -- a right-side slide-out panel for master-detail UIs.
 *
 * Slides in from the right edge of the viewport, showing full details
 * for a selected item. Supports backdrop click and X button to close.
 * Only one drawer is shown at a time.
 */

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface DetailDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Called when the drawer should close */
  onClose: () => void;
  /** Title shown in the drawer header */
  title?: React.ReactNode;
  /** Optional subtitle below the title */
  subtitle?: React.ReactNode;
  /** Content to render inside the drawer body */
  children: React.ReactNode;
  /** Width class for desktop (default: w-[420px]) */
  widthClass?: string;
  /** Additional CSS classes on the drawer panel */
  className?: string;
}

const DetailDrawer: React.FC<DetailDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  widthClass = 'w-[420px]',
  className = '',
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape key dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Detail panel'}
        className={[
          'fixed top-0 right-0 z-50 h-full bg-base-100 shadow-2xl flex flex-col',
          'transition-transform duration-300 ease-in-out',
          'w-full md:max-w-[420px]',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          className,
        ].join(' ')}
        style={widthClass !== 'w-[420px]' ? undefined : undefined}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-200 shrink-0">
          <div className="min-w-0 flex-1">
            {title && (
              <h2 className="text-lg font-bold truncate">{title}</h2>
            )}
            {subtitle && (
              <p className="text-sm text-base-content/60 truncate">{subtitle}</p>
            )}
          </div>
          <button
            className="btn btn-ghost btn-sm btn-circle ml-2 shrink-0"
            onClick={onClose}
            aria-label="Close detail panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </aside>
    </>
  );
};

export default DetailDrawer;
