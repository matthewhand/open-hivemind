import React from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactElement;
}

/**
 * Accessible form field wrapper that enforces htmlFor/id pairing
 * and aria-describedby for error messages (WCAG 1.3.1, 3.3.1).
 */
export const FormField: React.FC<FormFieldProps> = ({ id, label, error, hint, required, children }) => {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="form-control">
      <label htmlFor={id} className="label py-1">
        <span className="label-text text-sm font-medium">
          {label}
          {required && <span aria-hidden="true" className="text-error ml-1">*</span>}
        </span>
      </label>
      {React.cloneElement(children, {
        id,
        'aria-describedby': describedBy,
        'aria-invalid': !!error,
        'aria-required': required,
      })}
      {hint && !error && (
        <span id={hintId} className="label-text-alt text-base-content/60 mt-1">{hint}</span>
      )}
      {error && (
        <span id={errorId} role="alert" className="label-text-alt text-error mt-1">{error}</span>
      )}
    </div>
  );
};
