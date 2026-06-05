import React from 'react';
import { type FieldError } from 'react-hook-form';
import { useUIStore, selectHintStyle } from '../../store/uiStore';
import HintDisplay from './HintDisplay';

interface FormFieldProps {
  label: string;
  error?: FieldError;
  required?: boolean;
  hint?: string;
  /**
   * When provided, renders a real `<label htmlFor={htmlFor}>` for the child
   * control instead of a `<legend>`. The child control must also receive
   * `id={htmlFor}` so that the label is programmatically associated for
   * screen readers and meets WCAG. Without this, the visible label is only
   * a `<legend>` inside a `<fieldset>` — which works for grouped controls
   * but is not detected by every assistive technology nor by accessibility
   * audits that look for explicit `label[for]` associations.
   */
  htmlFor?: string;
  children: React.ReactNode;
}

/**
 * DaisyUI-styled form field wrapper for react-hook-form.
 * Handles label, error display, and required indicator.
 * Respects the user's hintStyle preference for hint rendering.
 */
const FormField: React.FC<FormFieldProps> = ({ label, error, required, hint, htmlFor, children }) => {
  const hintStyle = useUIStore(selectHintStyle);

  return (
    <fieldset className="fieldset">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="fieldset-legend">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      ) : (
        <legend className="fieldset-legend">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </legend>
      )}
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
