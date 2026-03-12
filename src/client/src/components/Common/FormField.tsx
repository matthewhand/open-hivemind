import React from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  children: React.ReactElement;
}

/**
 * Accessible form field wrapper that enforces htmlFor/id pairing
 * and aria-describedby for error messages (WCAG 1.3.1, 3.3.1).
 */
export const FormField: React.FC<FormFieldProps> = ({ id, label, error, children }) => {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="form-control">
      <label htmlFor={id} className="label py-1">
        <span className="label-text text-sm font-medium">{label}</span>
      </label>
      {React.cloneElement(children, {
        id,
        'aria-describedby': errorId,
        'aria-invalid': !!error,
      })}
      {error && (
        <span id={errorId} role="alert" className="label-text-alt text-error mt-1">
          {error}
        </span>
      )}
    </div>
  );
};
