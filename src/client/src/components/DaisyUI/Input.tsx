import React, { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> & {
  variant?: 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  bordered?: boolean;
  ghost?: boolean;
  loading?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  containerClassName?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant,
      size = 'md',
      bordered = true,
      ghost = false,
      loading = false,
      disabled,
      prefix,
      suffix,
      className,
      containerClassName,
      ...props
    },
    ref,
  ) => {
    const variantClasses = {
      primary: 'input-primary',
      secondary: 'input-secondary',
      accent: 'input-accent',
      info: 'input-info',
      success: 'input-success',
      warning: 'input-warning',
      error: 'input-error',
    };

    const sizeClasses = {
      xs: 'input-xs',
      sm: 'input-sm',
      md: 'input-md',
      lg: 'input-lg',
    };

    const inputClasses = twMerge(
      'input w-full',
      bordered && 'input-bordered',
      ghost && 'input-ghost',
      variant && variantClasses[variant],
      size && sizeClasses[size],
      className,
    );

    const containerClasses = twMerge('relative', containerClassName);

    return (
      <div className={containerClasses}>
        {prefix && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-base-content/60 sm:text-sm">{prefix}</span>
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled || loading}
          className={inputClasses}
          {...props}
        />
        {suffix && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <span className="text-base-content/60 sm:text-sm">{suffix}</span>
          </div>
        )}
        {loading && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <span className="loading loading-spinner"></span>
          </div>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;