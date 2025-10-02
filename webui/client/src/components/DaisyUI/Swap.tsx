import React, { ReactNode, useState } from 'react';

export interface SwapProps {
  /** Content to show when in the default state */
  onContent: ReactNode;
  /** Content to show when in the swapped state */
  offContent: ReactNode;
  /** Whether the swap is initially active */
  defaultActive?: boolean;
  /** Animation style for the swap */
  animation?: 'rotate' | 'flip' | 'fade' | 'scale';
  /** Size of the swap component */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Additional CSS classes */
  className?: string;
  /** Callback when swap state changes */
  onChange?: (isActive: boolean) => void;
  /** Whether the swap is disabled */
  disabled?: boolean;
  /** Test ID for testing */
  'data-testid'?: string;
  /** Aria label for accessibility */
  'aria-label'?: string;
}

/**
 * DaisyUI Swap Component
 * 
 * An interactive component that switches between two states with smooth animations.
 * Perfect for theme toggles, like/unlike buttons, and other binary state switches.
 */
const Swap: React.FC<SwapProps> = ({
  onContent,
  offContent,
  defaultActive = false,
  animation = 'rotate',
  size = 'md',
  className = '',
  onChange,
  disabled = false,
  'data-testid': testId,
  'aria-label': ariaLabel,
}) => {
  const [isActive, setIsActive] = useState(defaultActive);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    const newState = event.target.checked;
    setIsActive(newState);
    onChange?.(newState);
  };

  const getAnimationClasses = () => {
    const animations = {
      rotate: 'swap-rotate',
      flip: 'swap-flip',
      fade: 'swap-fade',
      scale: 'swap-scale',
    };
    return animations[animation];
  };

  const getSizeClasses = () => {
    const sizes = {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    };
    return sizes[size];
  };

  return (
    <label 
      className={`swap ${getAnimationClasses()} ${getSizeClasses()} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      data-testid={testId}
      aria-label={ariaLabel}
    >
      <input
        type="checkbox"
        checked={isActive}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
        aria-hidden="true"
      />
      
      {/* Content shown when swap is OFF */}
      <div className="swap-off">
        {offContent}
      </div>
      
      {/* Content shown when swap is ON */}
      <div className="swap-on">
        {onContent}
      </div>
    </label>
  );
};

export default Swap;