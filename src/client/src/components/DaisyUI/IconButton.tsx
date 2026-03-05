import React, { memo } from 'react';
import { Button, ButtonProps } from './Button';

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'icon' | 'startIcon' | 'endIcon' | 'iconRight'> {
  /** The icon to display inside the button */
  icon: React.ReactNode;
  /**
   * REQUIRED: Accessible label for screen readers.
   * Icon-only buttons must have an aria-label to explain their function.
   */
  'aria-label': string;
  /** Optional tooltip text to display on hover (defaults to aria-label if not provided) */
  tooltip?: string;
}

export const IconButton = memo(({
  icon,
  'aria-label': ariaLabel,
  tooltip,
  className = '',
  ...props
}: IconButtonProps) => {
  return (
    <Button
      aria-label={ariaLabel}
      title={tooltip || ariaLabel}
      className={`btn-square ${className}`}
      {...props}
    >
      {icon}
    </Button>
  );
});

IconButton.displayName = 'IconButton';

export default IconButton;
