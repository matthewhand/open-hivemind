import React, { forwardRef } from 'react';

// Lightweight class merge utility to avoid pulling in tailwind-merge for tests.
// It simply joins truthy class segments and removes duplicate consecutive spaces.
function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

export type TextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> & {
  variant?: 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  bordered?: boolean;
  ghost?: boolean;
  loading?: boolean;
  label?: string;
  helperText?: string;
  containerClassName?: string;
  resizable?: 'none' | 'both' | 'horizontal' | 'vertical';
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      variant,
      size = 'md',
      bordered = true,
      ghost = false,
      loading = false,
      disabled,
      label,
      helperText,
      className,
      containerClassName,
      resizable = 'vertical',
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      primary: 'textarea-primary',
      secondary: 'textarea-secondary',
      accent: 'textarea-accent',
      info: 'textarea-info',
      success: 'textarea-success',
      warning: 'textarea-warning',
      error: 'textarea-error',
    };

    const sizeClasses = {
      xs: 'textarea-xs',
      sm: 'textarea-sm',
      md: 'textarea-md',
      lg: 'textarea-lg',
    };

    const resizeClasses = {
      none: 'resize-none',
      both: 'resize',
      horizontal: 'resize-x',
      vertical: 'resize-y',
    };

    const textareaClasses = cx(
      'textarea w-full',
      bordered && 'textarea-bordered',
      ghost && 'textarea-ghost',
      variant && variantClasses[variant],
      size && sizeClasses[size],
      resizable && resizeClasses[resizable],
      className || ''
    );

    const containerClasses = cx('form-control', containerClassName || '');
    // Extract possible aria-describedby so we can merge before spreading remaining props
  // Narrow props to HTMLTextAreaElement attributes while allowing unknown extras
  // Extract aria-describedby so we can merge with helper text id without being overwritten
  const { ['aria-describedby']: externalDescribedBy, onKeyDown, id: providedId, ...restProps } = props as React.TextareaHTMLAttributes<HTMLTextAreaElement> & { [key: string]: unknown };
    const effectiveId = providedId || 'textarea';
    const labelId = label ? `${effectiveId}-label` : undefined;
    const helperId = helperText ? `${effectiveId}-helper` : undefined;
    const ariaDescribedBy = [externalDescribedBy, helperId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={containerClasses}>
        {label && (
          <label className="label" id={labelId}>
            <span className="label-text">{label}</span>
          </label>
        )}
        <div className="relative">
          <textarea
            ref={ref}
            id={providedId}
            disabled={disabled || loading}
            className={textareaClasses}
            aria-labelledby={labelId}
            aria-describedby={ariaDescribedBy}
            {...restProps}
            onKeyDown={(e) => {
              if (disabled || loading) return; // prevent user handler firing when disabled as tests expect
              onKeyDown?.(e);
            }}
          />
          {loading && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="loading loading-spinner"></span>
            </div>
          )}
        </div>
        {helperText && (
          <label className="label" id={helperId}>
            <span className="label-text-alt">{helperText}</span>
          </label>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;