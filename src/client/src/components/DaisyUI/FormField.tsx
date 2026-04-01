import React from 'react';
import { type FieldError } from 'react-hook-form';

interface FormFieldProps {
  label: string;
  error?: FieldError;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

/**
 * DaisyUI-styled form field wrapper for react-hook-form.
 * Handles label, error display, and required indicator.
 */
const FormField: React.FC<FormFieldProps> = ({ label, error, required, hint, children }) => (
  <fieldset className="fieldset">
    <legend className="fieldset-legend">
      {label}
      {required && <span className="text-error ml-1">*</span>}
    </legend>
    {children}
    {hint && !error && (
      <p className="fieldset-label text-base-content/50">{hint}</p>
    )}
    {error && (
      <p className="fieldset-label text-error">{error.message || 'This field is required'}</p>
    )}
  </fieldset>
);

export default FormField;
