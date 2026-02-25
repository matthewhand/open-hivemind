import React from 'react';

export interface BadgeProps {
  /** The content to display inside the badge */
  children?: React.ReactNode;
  /** Color variant of the badge */
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'ghost';
  /** Size of the badge */
  size?: 'xs' | 'sm' | 'md' | 'lg';
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

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
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
    case 'xs': return 'badge-xs';
    case 'sm': return 'badge-sm';
    case 'lg': return 'badge-lg';
    default: return 'badge-md';
    }
  };

  const baseClasses = 'badge';
  const variantClass = getVariantClass();
  const sizeClass = getSizeClass();

  const badgeContent = (
    <>
      {avatar && <span className="avatar placeholder">{avatar}</span>}
      {icon && <span className="mr-1">{icon}</span>}
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
};

export default Badge;
