import React, { memo, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export interface MobileFABProps {
  /** Which side of the viewport to anchor the FAB to. */
  position: 'left' | 'right';
  /**
   * Icon node rendered inside the FAB.
   *
   * The caller's `icon` is always rendered. When `loading` is `true`, the icon
   * is dimmed (via `opacity-30`) and a `Loader2` spinner is overlaid on top —
   * so the FAB still visually communicates which action it represents.
   */
  icon: ReactNode;
  /** Click handler. */
  onClick: () => void;
  /** Accessible label for screen readers. */
  ariaLabel: string;
  /** Disables the button. */
  disabled?: boolean;
  /**
   * When `true`, the caller's `icon` is rendered at reduced opacity with a
   * `Loader2` spinner overlay. The button also receives `aria-busy="true"`
   * and `aria-disabled="true"` for assistive tech.
   */
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
  const composed = `fab-mobile ${positionClass} md:hidden relative${className ? ` ${className}` : ''}`;

  return (
    <button
      type="button"
      className={composed}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-busy={loading}
      aria-disabled={loading || disabled}
    >
      <span className={loading ? 'opacity-30' : undefined}>{icon}</span>
      {loading && (
        <Loader2
          className="absolute inset-0 m-auto w-5 h-5 animate-spin"
          aria-hidden="true"
        />
      )}
    </button>
  );
};

export default memo(MobileFAB);
