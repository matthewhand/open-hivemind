import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { Input, InputProps } from './Input';

export type TextInputProps = InputProps & {
  label?: string;
  helperText?: string;
  error?: boolean;
  success?: boolean;
  required?: boolean;
  labelClassName?: string;
  helperTextClassName?: string;
};

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      label,
      helperText,
      error = false,
      success = false,
      required = false,
      labelClassName,
      helperTextClassName,
      variant,
      className,
      containerClassName,
      'aria-describedby': ariaDescribedBy,
      id,
      ...props
    },
    ref
  ) => {
    // Generate unique IDs for accessibility
    const inputId = id || `text-input-${Math.random().toString(36).substr(2, 9)}`;
    const helperId = helperText ? `${inputId}-helper` : undefined;
    const labelId = label ? `${inputId}-label` : undefined;

    // Determine variant based on state
    let finalVariant = variant;
    if (error) {
      finalVariant = 'error';
    } else if (success) {
      finalVariant = 'success';
    }

    // Combine aria-describedby
    const describedBy = [ariaDescribedBy, helperId].filter(Boolean).join(' ') || undefined;

    const labelClasses = twMerge(
      'label-text text-base font-medium mb-2 block',
      error && 'text-error',
      success && 'text-success',
      labelClassName
    );

    const helperTextClasses = twMerge(
      'text-sm mt-1',
      error && 'text-error',
      success && 'text-success',
      helperTextClassName
    );

    return (
      <div className="form-control w-full">
        {label && (
          <label
            htmlFor={inputId}
            id={labelId}
            className={labelClasses}
          >
            {label}
            {required && <span className="text-error ml-1" aria-label="required">*</span>}
          </label>
        )}

        <Input
          ref={ref}
          id={inputId}
          variant={finalVariant}
          className={className}
          containerClassName={containerClassName}
          aria-describedby={describedBy}
          aria-invalid={error}
          aria-required={required}
          {...props}
        />

        {helperText && (
          <div
            id={helperId}
            className={helperTextClasses}
            role={error ? 'alert' : undefined}
            aria-live={error ? 'polite' : undefined}
          >
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';

export default TextInput;