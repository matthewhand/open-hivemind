import React, { forwardRef, useId } from 'react';
import { twMerge } from 'tailwind-merge';

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  variant?: 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  bordered?: boolean;
  ghost?: boolean;
  loading?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  containerClassName?: string;
  label?: React.ReactNode;
  error?: React.ReactNode;
  helperText?: React.ReactNode;
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
      label,
      error,
      helperText,
      id: providedId,
      ...props
    },
    ref,
  ) => {
    const uniqueId = useId();
    const id = providedId || uniqueId;

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

    // If there's an error, force the error variant
    const appliedVariant = error ? 'error' : variant;

    const inputClasses = twMerge(
      'input w-full',
      bordered && 'input-bordered',
      ghost && 'input-ghost',
      appliedVariant && variantClasses[appliedVariant],
      size && sizeClasses[size],
      className,
    );

    const containerClasses = twMerge('relative', containerClassName);

    const inputContent = (
      <div className={containerClasses}>
        {prefix && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-base-content/60 sm:text-sm">{prefix}</span>
          </div>
        )}
        <input
          ref={ref}
          id={id}
          disabled={disabled || loading}
          className={inputClasses}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${id}-error` : helperText ? `${id}-helper` : undefined
          }
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

    if (label || error || helperText) {
      return (
        <div className="form-control w-full">
          {label && (
            <label htmlFor={id} className="label">
              <span className="label-text">{label}</span>
            </label>
          )}
          {inputContent}
          {error && (
            <label className="label" id={`${id}-error`}>
              <span className="label-text-alt text-error">{error}</span>
            </label>
          )}
          {helperText && !error && (
            <label className="label" id={`${id}-helper`}>
              <span className="label-text-alt text-base-content/60">{helperText}</span>
            </label>
          )}
        </div>
      );
    }

    return inputContent;
  },
);

Input.displayName = 'Input';

export default Input;
