/**
 * DetailDrawer -- right-side slide-over panel for master-detail views.
 *
 * Designed for item detail panels that slide in from the right side
 * when a user clicks an item in a list. Supports:
 *   - Escape-key and backdrop-click dismiss
 *   - Smooth slide-in/out transitions
 *   - Responsive: full-width on mobile, fixed-width on desktop
 *   - Custom header with close button
 *   - Scrollable body content
 */

import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

export interface DetailDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Called when the drawer should close */
  onClose: () => void;
  /** Header title */
  title?: React.ReactNode;
  /** Optional subtitle shown below the title */
  subtitle?: React.ReactNode;
  /** Body content */
  children?: React.ReactNode;
  /** Additional CSS classes for the drawer panel */
  className?: string;
  /** Width class for desktop (default: "w-[28rem]") */
  width?: string;
}

const DetailDrawer: React.FC<DetailDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  className = '',
  width = 'w-[28rem]',
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // Prevent body scroll when drawer is open on mobile
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
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full ${width} max-w-full bg-base-100 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Detail panel'}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b border-base-300 shrink-0">
          <div className="min-w-0">
            {title && (
              <h2 className="text-lg font-bold truncate">{title}</h2>
            )}
            {subtitle && (
              <p className="text-sm text-base-content/60 mt-0.5 line-clamp-2">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square shrink-0"
            onClick={onClose}
            aria-label="Close detail panel"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </>
  );
};

export default DetailDrawer;
