import React, { forwardRef, useId, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { Eye, EyeOff } from 'lucide-react';

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> & {
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
      type = 'text',
      ...props
    },
    ref,
  ) => {
    const uniqueId = useId();
    const id = providedId || uniqueId;
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';

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
      isPassword && !suffix && !loading ? 'pr-10' : '',
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
          type={isPassword ? (showPassword ? 'text' : 'password') : type}
          disabled={disabled || loading}
          className={inputClasses}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${id}-error` : helperText ? `${id}-helper` : undefined
          }
          {...props}
        />

        {/* Render password toggle or suffix */}
        {(isPassword || suffix || loading) && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 gap-2 pointer-events-none z-10">
            {isPassword && !disabled && !loading && (
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-circle text-base-content/60 hover:text-base-content focus:outline-none focus-visible:ring-2 focus-visible:ring-primary pointer-events-auto"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            )}

            {suffix && (
              <div className="flex items-center pointer-events-auto">
                <span className="text-base-content/60 sm:text-sm">{suffix}</span>
              </div>
            )}

            {loading && (
              <div className="flex items-center">
                <span className="loading loading-spinner w-4 h-4"></span>
              </div>
            )}
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
