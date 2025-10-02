import React, { ReactNode, useState } from 'react';

export interface CollapsibleProps {
  /** Title displayed in the collapsible header */
  title: string;
  /** Content to be shown/hidden */
  children: ReactNode;
  /** Whether the collapsible is initially open */
  defaultOpen?: boolean;
  /** Custom icon to display when collapsed */
  collapsedIcon?: string;
  /** Custom icon to display when expanded */
  expandedIcon?: string;
  /** Additional CSS classes */
  className?: string;
  /** Variant styling */
  variant?: 'bordered' | 'ghost' | 'plus' | 'arrow';
  /** Size of the collapsible */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show focus outline */
  focus?: boolean;
  /** Callback when collapse state changes */
  onToggle?: (isOpen: boolean) => void;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * DaisyUI Collapsible Component
 * 
 * A collapsible component for organizing content that can be expanded or collapsed.
 * Perfect for FAQ sections, settings panels, and content organization.
 */
const Collapsible: React.FC<CollapsibleProps> = ({
  title,
  children,
  defaultOpen = false,
  collapsedIcon,
  expandedIcon,
  className = '',
  variant = 'bordered',
  size = 'md',
  focus = false,
  onToggle,
  'data-testid': testId,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onToggle?.(newState);
  };

  const getVariantClasses = () => {
    const variants = {
      bordered: 'collapse-arrow bg-base-200',
      ghost: 'collapse-arrow',
      plus: 'collapse-plus bg-base-200',
      arrow: 'collapse-arrow bg-base-200',
    };
    return variants[variant];
  };

  const getSizeClasses = () => {
    const sizes = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    };
    return sizes[size];
  };

  const getFocusClasses = () => {
    return focus ? 'collapse-focus' : '';
  };

  const getIcon = () => {
    if (collapsedIcon && expandedIcon) {
      return isOpen ? expandedIcon : collapsedIcon;
    }
    return null;
  };

  return (
    <div 
      className={`collapse ${getVariantClasses()} ${getSizeClasses()} ${getFocusClasses()} ${className}`}
      data-testid={testId}
    >
      <input 
        type="checkbox" 
        className="collapse-checkbox"
        checked={isOpen}
        onChange={handleToggle}
        aria-label={`Toggle ${title}`}
      />
      <div className="collapse-title font-medium flex items-center gap-2">
        {getIcon() && <span className="text-lg">{getIcon()}</span>}
        {title}
      </div>
      <div className="collapse-content">
        <div className="pb-2">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Collapsible;