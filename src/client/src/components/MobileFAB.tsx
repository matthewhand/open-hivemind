import React, { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

export interface MobileFABProps {
  /** Which side of the viewport to anchor the FAB to. */
  position: 'left' | 'right';
  /** Icon node rendered inside the FAB. Replaced by a spinner when `loading` is true. */
  icon: ReactNode;
  /** Click handler. */
  onClick: () => void;
  /** Accessible label for screen readers. */
  ariaLabel: string;
  /** Disables the button. */
  disabled?: boolean;
  /** When true, the icon is replaced by an animated spinner. */
  loading?: boolean;
  /** Additional Tailwind classes (appended after the FAB classes). */
  className?: string;
}

/**
 * MobileFAB — a circular floating action button anchored to the bottom-left
 * or bottom-right of the viewport on small screens. Hidden on `md` and up via
 * the `md:hidden` Tailwind class so desktop layouts are unaffected.
 *
 * Reuses `.fab-mobile`, `.fab-mobile-left`, `.fab-mobile-right` from
 * `src/client/src/index.css`. No CSS changes required to consume.
 */
const MobileFAB: React.FC<MobileFABProps> = ({
  position,
  icon,
  onClick,
  ariaLabel,
  disabled = false,
  loading = false,
  className = '',
}) => {
  const positionClass = position === 'left' ? 'fab-mobile-left' : 'fab-mobile-right';
  const composed = `fab-mobile ${positionClass} md:hidden${className ? ` ${className}` : ''}`;

  return (
    <button
      type="button"
      className={composed}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : icon}
    </button>
  );
};

export default MobileFAB;
