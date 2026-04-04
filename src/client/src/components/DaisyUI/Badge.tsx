import React from 'react';

export interface BadgeProps {
  /** The content to display inside the badge */
  children: React.ReactNode;
  /**
   * Color variant of the badge
   * @default 'neutral'
   * @example 'ghost' - Used for subtle, low-priority status indicators
   */
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'ghost';
  /** Size of the badge */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'small' | 'normal' | 'large';
  /** Style variant - solid or outline */
  style?: 'solid' | 'outline';
  /** Optional icon to display before the content */
  icon?: React.ReactNode;
  /** Optional avatar to display */
  avatar?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Accessibility label */
  'aria-label'?: string;
  /** Role attribute for screen readers */
  role?: string;
}

// ⚡ Bolt Optimization: Added React.memo() to prevent unnecessary re-renders of this core primitive UI component.
export const Badge: React.FC<BadgeProps> = React.memo(({
  children,
  variant = 'neutral',
  size = 'normal',
  style = 'solid',
  icon,
  avatar,
  className = '',
  'aria-label': ariaLabel,
  role = 'status',
  ...props
}) => {
  const getVariantClass = () => {
    if (style === 'outline') {
      return `badge-outline badge-${variant}`;
    }
    return `badge-${variant}`;
  };

  const getSizeClass = () => {
    switch (size) {
      case 'xs':
      case 'small': return 'badge-xs';
      case 'sm': return 'badge-sm';
      case 'lg':
      case 'large': return 'badge-lg';
      case 'md':
      case 'normal':
      default: return 'badge-md';
    }
  };

  const baseClasses = 'badge';
  const variantClass = getVariantClass();
  const sizeClass = getSizeClass();

  const badgeContent = (
    <>
      {avatar && <span className="avatar placeholder">{avatar}</span>}
      {icon && <span className="mr-1">{React.isValidElement(icon) ? icon : (typeof icon === 'function' || typeof icon === 'object' ? React.createElement(icon as any) : icon)}</span>}
      {children}
    </>
  );

  return (
    <span
      className={`${baseClasses} ${variantClass} ${sizeClass} ${className}`.trim()}
      role={role}
      aria-label={ariaLabel}
      {...props}
    >
      {badgeContent}
    </span>
  );
});

Badge.displayName = 'Badge';

export default Badge;