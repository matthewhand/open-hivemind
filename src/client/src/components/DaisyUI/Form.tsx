/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-refresh/only-export-components, no-empty, no-case-declarations */
import type { ReactNode } from 'react';
import React, { useState, useEffect, useRef } from 'react';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file' | 'url' | 'tel' | 'date' | 'time' | 'datetime-local' | 'key-value';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
  validation?: (value: any) => string | null;
  helperText?: string;
  multiple?: boolean;
  accept?: string; // For file inputs
  min?: number | string;
  max?: number | string;
  step?: number | string;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  autoComplete?: string;
  'aria-describedby'?: string;
  'aria-label'?: string;
}

export interface FormFieldSet {
  legend: string;
  description?: string;
  fields: string[];
  className?: string;
}

export interface FormProps {
  /** Form fields configuration */
  fields: FormField[];
  /** Form submission handler */
  onSubmit: (data: Record<string, any>) => Promise<void> | void;
  /** Initial form data */
  initialData?: Record<string, any>;
  /** Form layout orientation */
  layout?: 'vertical' | 'horizontal';
  /** Whether form is in loading state */
  loading?: boolean;
  /** Submit button text */
  submitText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Show cancel button */
  showCancel?: boolean;
  /** Cancel button handler */
  onCancel?: () => void;
  /** Form title */
  title?: string;
  /** Form description */
  description?: string;
  /** Custom form className */
  className?: string;
  /** Form field sets for grouping */
  fieldSets?: FormFieldSet[];
  /** Validate on change */
  validateOnChange?: boolean;
  /** Validate on blur */
  validateOnBlur?: boolean;
  /** Custom submit button content */
  submitButton?: ReactNode;
  /** Custom cancel button content */
  cancelButton?: ReactNode;
  /** Form size */
  size?: 'sm' | 'md' | 'lg';
  /** Auto focus first field */
  autoFocus?: boolean;
  /** Form ID */
  id?: string;
  /** Form method */
  method?: 'get' | 'post';
  /** Form action */
  action?: string;
  /** Form encoding type */
  encType?: 'application/x-www-form-urlencoded' | 'multipart/form-data' | 'text/plain';
  /** Disable native validation */
  noValidate?: boolean;
  /** Form ARIA attributes */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

export const Form: React.FC<FormProps> = ({
  fields,
  onSubmit,
  initialData = {},
  layout = 'vertical',
  loading = false,
  submitText = 'Submit',
  cancelText = 'Cancel',
  showCancel = false,
  onCancel,
  title,
  description,
  className = '',
  fieldSets,
  validateOnChange = false,
  validateOnBlur = true,
  submitButton,
  cancelButton,
  size = 'md',
  autoFocus = false,
  id,
  method,
  action,
  encType,
  noValidate = false,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setFormData(initialData);
    setErrors({});
    setTouched({});
  }, [initialData]);

  // Auto focus first field
  useEffect(() => {
    if (autoFocus && formRef.current) {
      const firstInput = formRef.current.querySelector('input, select, textarea') as HTMLElement;
      if (firstInput) {
        firstInput.focus();
      }
    }
  }, [autoFocus]);

  const getSizeClass = () => {
    switch (size) {
    case 'sm': return 'form-control-sm';
    case 'lg': return 'form-control-lg';
    default: return '';
    }
  };

  const validateField = (field: FormField, value: any): string | null => {
    // Required validation
    if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `${field.label} is required`;
    }

    // Skip other validations if field is empty and not required
    if (!value || (typeof value === 'string' && !value.trim())) {
      return null;
    }

    // Type-specific validations
    switch (field.type) {
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Please enter a valid email address';
      }
      break;
    case 'url':
      try {
        new URL(value);
      } catch {
        return 'Please enter a valid URL';
      }
      break;
    case 'number':
      if (isNaN(Number(value))) {
        return 'Please enter a valid number';
      }
      if (field.min !== undefined && Number(value) < Number(field.min)) {
        return `Value must be at least ${field.min}`;
      }
      if (field.max !== undefined && Number(value) > Number(field.max)) {
        return `Value must be at most ${field.max}`;
      }
      break;
    }

    // Length validations
    if (field.minLength && value.length < field.minLength) {
      return `${field.label} must be at least ${field.minLength} characters`;
    }
    if (field.maxLength && value.length > field.maxLength) {
      return `${field.label} must be at most ${field.maxLength} characters`;
    }

    // Pattern validation
    if (field.pattern && !new RegExp(field.pattern).test(value)) {
      return `${field.label} format is invalid`;
    }

    // Custom validation
    if (field.validation) {
      return field.validation(value);
    }

    return null;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    fields.forEach(field => {
      const error = validateField(field, formData[field.name]);
      if (error) {
        newErrors[field.name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleInputChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));

    if (validateOnChange) {
      const field = fields.find(f => f.name === fieldName);
      if (field) {
        const error = validateField(field, value);
        setErrors(prev => ({ ...prev, [fieldName]: error || '' }));
      }
    } else if (errors[fieldName]) {
      // Clear error when user starts typing
      setErrors(prev => ({ ...prev, [fieldName]: '' }));
    }
  };

  const handleBlur = (fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));

    if (validateOnBlur) {
      const field = fields.find(f => f.name === fieldName);
      if (field) {
        const error = validateField(field, formData[fieldName]);
        setErrors(prev => ({ ...prev, [fieldName]: error || '' }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const renderField = (field: FormField) => {
    const hasError = touched[field.name] && !!errors[field.name];
    const fieldId = `${id || 'form'}-${field.name}`;
    const errorId = `${fieldId}-error`;
    const helperId = `${fieldId}-helper`;

    const commonProps = {
      id: fieldId,
      name: field.name,
      disabled: field.disabled || loading,
      readOnly: field.readonly,
      required: field.required,
      'aria-invalid': hasError,
      'aria-describedby': [
        field['aria-describedby'],
        hasError ? errorId : undefined,
        field.helperText ? helperId : undefined,
      ].filter(Boolean).join(' ') || undefined,
      'aria-label': field['aria-label'],
      onBlur: () => handleBlur(field.name),
    };

    switch (field.type) {
    case 'textarea':
      return (
        <textarea
          {...commonProps}
          className={`textarea textarea-bordered w-full ${hasError ? 'textarea-error' : ''} ${getSizeClass()}`}
          placeholder={field.placeholder}
          value={formData[field.name] || ''}
          onChange={(e) => handleInputChange(field.name, e.target.value)}
          maxLength={field.maxLength}
          minLength={field.minLength}
          autoComplete={field.autoComplete}
          rows={4}
        />
      );

    case 'select':
      return (
        <select
          {...commonProps}
          className={`select select-bordered w-full ${hasError ? 'select-error' : ''} ${getSizeClass()}`}
          value={formData[field.name] || ''}
          onChange={(e) => handleInputChange(field.name, field.multiple ? Array.from(e.target.selectedOptions, option => option.value) : e.target.value)}
          multiple={field.multiple}
        >
          {!field.multiple && (
            <option value="">{field.placeholder || 'Select an option'}</option>
          )}
          {field.options?.map(option => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
      );

    case 'checkbox':
      return (
        <div className="form-control">
          <label className="label cursor-pointer justify-start gap-2">
            <input
              {...commonProps}
              type="checkbox"
              className={`checkbox ${hasError ? 'checkbox-error' : ''}`}
              checked={formData[field.name] || false}
              onChange={(e) => handleInputChange(field.name, e.target.checked)}
            />
            <span className="label-text">
              {field.label}
              {field.required && <span className="text-error ml-1">*</span>}
            </span>
          </label>
        </div>
      );

    case 'radio':
      return (
        <div className="form-control">
          <div className="label">
            <span className="label-text">
              {field.label}
              {field.required && <span className="text-error ml-1">*</span>}
            </span>
          </div>
          {field.options?.map(option => (
            <label key={option.value} className="label cursor-pointer justify-start gap-2">
              <input
                {...commonProps}
                type="radio"
                className={`radio ${hasError ? 'radio-error' : ''}`}
                value={option.value}
                checked={formData[field.name] === option.value}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                disabled={option.disabled || field.disabled || loading}
              />
              <span className="label-text">{option.label}</span>
            </label>
          ))}
        </div>
      );

    case 'file':
      return (
        <input
          {...commonProps}
          type="file"
          className={`file-input file-input-bordered w-full ${hasError ? 'file-input-error' : ''} ${getSizeClass()}`}
          onChange={(e) => handleInputChange(field.name, field.multiple ? e.target.files : e.target.files?.[0])}
          multiple={field.multiple}
          accept={field.accept}
        />
      );

    default:
      return (
        <input
          {...commonProps}
          type={field.type}
          className={`input input-bordered w-full ${hasError ? 'input-error' : ''} ${getSizeClass()}`}
          placeholder={field.placeholder}
          value={formData[field.name] || ''}
          onChange={(e) => handleInputChange(field.name, e.target.value)}
          min={field.min}
          max={field.max}
          step={field.step}
          maxLength={field.maxLength}
          minLength={field.minLength}
          pattern={field.pattern}
          autoComplete={field.autoComplete}
        />
      );

    case 'key-value':
      const pairs = (formData[field.name] as Record<string, string>) || {};
      const entries = Object.entries(pairs);

      return (
        <div className="space-y-2">
          {entries.map(([key, value], index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                placeholder="Key"
                className="input input-bordered input-sm flex-1"
                value={key}
                onChange={(e) => {
                  const newPairs = { ...pairs };
                  const val = newPairs[key];
                  delete newPairs[key];
                  newPairs[e.target.value] = val;
                  handleInputChange(field.name, newPairs);
                }}
              />
              <input
                type="text"
                placeholder="Value"
                className="input input-bordered input-sm flex-1"
                value={value}
                onChange={(e) => {
                  const newPairs = { ...pairs };
                  newPairs[key] = e.target.value;
                  handleInputChange(field.name, newPairs);
                }}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm text-error"
                aria-label="Remove item"
                onClick={() => {
                  const newPairs = { ...pairs };
                  delete newPairs[key];
                  handleInputChange(field.name, newPairs);
                }}
              >
                  ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-block border-dashed border-base-300"
            onClick={() => {
              const newPairs = { ...pairs };
              let i = 0;
              while (newPairs[`NEW_KEY_${i}`]) {i++;}
              newPairs[`NEW_KEY_${i}`] = '';
              handleInputChange(field.name, newPairs);
            }}
          >
              + Add Override
          </button>
        </div>
      );
    }
  };

  const renderFormField = (field: FormField) => {
    const hasError = touched[field.name] && !!errors[field.name];
    const fieldId = `${id || 'form'}-${field.name}`;
    const errorId = `${fieldId}-error`;
    const helperId = `${fieldId}-helper`;

    if (field.type === 'checkbox' || field.type === 'radio') {
      return (
        <div key={field.name} className="form-control w-full">
          {renderField(field)}
          {hasError && (
            <div className="label">
              <span id={errorId} className="label-text-alt text-error" role="alert">
                {errors[field.name]}
              </span>
            </div>
          )}
          {field.helperText && !hasError && (
            <div className="label">
              <span id={helperId} className="label-text-alt text-base-content/60">
                {field.helperText}
              </span>
            </div>
          )}
        </div>
      );
    }

    if (layout === 'horizontal') {
      return (
        <div key={field.name} className="form-control">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <label htmlFor={fieldId} className="label md:justify-end">
              <span className="label-text">
                {field.label}
                {field.required && <span className="text-error ml-1">*</span>}
              </span>
            </label>
            <div className="md:col-span-2">
              {renderField(field)}
              {hasError && (
                <div className="label">
                  <span id={errorId} className="label-text-alt text-error" role="alert">
                    {errors[field.name]}
                  </span>
                </div>
              )}
              {field.helperText && !hasError && (
                <div className="label">
                  <span id={helperId} className="label-text-alt text-base-content/60">
                    {field.helperText}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={field.name} className="form-control w-full">
        <label htmlFor={fieldId} className="label">
          <span className="label-text">
            {field.label}
            {field.required && <span className="text-error ml-1">*</span>}
          </span>
        </label>
        {renderField(field)}
        {hasError && (
          <div className="label">
            <span id={errorId} className="label-text-alt text-error" role="alert">
              {errors[field.name]}
            </span>
          </div>
        )}
        {field.helperText && !hasError && (
          <div className="label">
            <span id={helperId} className="label-text-alt text-base-content/60">
              {field.helperText}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderFieldSet = (fieldSet: FormFieldSet) => {
    const fieldSetFields = fields.filter(field => fieldSet.fields.includes(field.name));

    return (
      <fieldset key={fieldSet.legend} className={`border border-base-300 rounded-lg p-4 ${fieldSet.className || ''}`}>
        <legend className="text-lg font-semibold px-2">{fieldSet.legend}</legend>
        {fieldSet.description && (
          <p className="text-sm text-base-content/60 mb-4">{fieldSet.description}</p>
        )}
        <div className="space-y-4">
          {fieldSetFields.map(renderFormField)}
        </div>
      </fieldset>
    );
  };

  const getFieldsToRender = () => {
    if (fieldSets) {
      const fieldSetFieldNames = fieldSets.flatMap(fs => fs.fields);
      return fields.filter(field => !fieldSetFieldNames.includes(field.name));
    }
    return fields;
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={`space-y-6 ${className}`}
      id={id}
      method={method}
      action={action}
      encType={encType}
      noValidate={noValidate}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
    >
      {/* Form Header */}
      {(title || description) && (
        <div className="form-header">
          {title && (
            <h2 className="text-2xl font-bold mb-2">{title}</h2>
          )}
          {description && (
            <p className="text-base-content/60 mb-4">{description}</p>
          )}
        </div>
      )}

      {/* Field Sets */}
      {fieldSets && (
        <div className="space-y-6">
          {fieldSets.map(renderFieldSet)}
        </div>
      )}

      {/* Regular Fields */}
      {getFieldsToRender().length > 0 && (
        <div className="space-y-4">
          {getFieldsToRender().map(renderFormField)}
        </div>
      )}

      {/* Form Actions */}
      <div className="form-actions flex gap-4 justify-end pt-4 border-t border-base-300">
        {showCancel && (
          <>
            {cancelButton || (
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                {cancelText}
              </button>
            )}
          </>
        )}

        {submitButton || (
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || loading}
          >
            {(isSubmitting || loading) && (
              <span className="loading loading-spinner loading-sm"></span>
            )}
            {submitText}
          </button>
        )}
      </div>
    </form>
  );
};

export default Form;