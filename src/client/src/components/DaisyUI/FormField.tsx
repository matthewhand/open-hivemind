import React from 'react';
import { type FieldError } from 'react-hook-form';
import { useUIStore, selectHintStyle } from '../../store/uiStore';
import HintDisplay from './HintDisplay';

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
 * Respects the user's hintStyle preference for hint rendering.
 */
const FormField: React.FC<FormFieldProps> = ({ label, error, required, hint, children }) => {
  const hintStyle = useUIStore(selectHintStyle);

  return (
    <fieldset className="fieldset">
      <legend className="fieldset-legend">
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </legend>
      {children}
      {hint && !error && hintStyle === 'icon' && (
        <HintDisplay text={hint} variant="info" className="mt-1" />
      )}
      {hint && !error && hintStyle === 'text' && (
        <p className="fieldset-label text-xs text-base-content/60 mt-1">{hint}</p>
      )}
      {hint && !error && hintStyle === 'full' && (
        <HintDisplay text={hint} variant="info" className="mt-1" />
      )}
      {error && (
        <p className="fieldset-label text-error">{error.message || 'This field is required'}</p>
      )}
    </fieldset>
  );
};

export default FormField;
