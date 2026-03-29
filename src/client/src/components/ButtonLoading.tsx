import React from 'react';
import Button, { ButtonProps } from './DaisyUI/Button';

export interface ButtonLoadingProps extends Omit<ButtonProps, 'loading'> {
  loading?: boolean;
}

/**
 * ButtonLoading wraps the DaisyUI Button with automatic loading state handling
 * Disables the button and shows a spinner when loading is true
 */
export const ButtonLoading: React.FC<ButtonLoadingProps> = ({
  loading = false,
  disabled,
  children,
  ...props
}) => {
  return (
    <Button
      {...props}
      loading={loading}
      disabled={disabled || loading}
    >
      {children}
    </Button>
  );
};

export default ButtonLoading;
