/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import Input from './Input';

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file';
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  validation?: (value: any) => string | null;
  disabled?: boolean;
  helperText?: string;
  multiple?: boolean;
}

interface ModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: FormField[];
  onSubmit: (data: Record<string, any>) => Promise<void> | void;
  submitText?: string;
  cancelText?: string;
  initialData?: Record<string, any>;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  steps?: Array<{
    title: string;
    description?: string;
    fields: string[];
  }>;
}

const ModalForm: React.FC<ModalFormProps> = ({
  isOpen,
  onClose,
  title,
  fields,
  onSubmit,
  submitText = 'Submit',
  cancelText = 'Cancel',
  initialData = {},
  loading = false,
  size = 'md',
  steps,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData);
      setErrors({});
      setCurrentStep(0);

      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
        document.body.style.overflow = 'hidden';
      }
    } else {
      document.body.style.paddingRight = '';
      document.body.style.overflow = '';
    }

    return () => {
      // Clean up styles if unmounted while open
      if (isOpen) {
        document.body.style.paddingRight = '';
        document.body.style.overflow = '';
      }
    };
  }, [isOpen, initialData]);

  const getSizeClass = () => {
    switch (size) {
    case 'sm': return 'w-11/12 max-w-md';
    case 'md': return 'w-11/12 max-w-2xl';
    case 'lg': return 'w-11/12 max-w-4xl';
    case 'xl': return 'w-11/12 max-w-6xl';
    default: return 'w-11/12 max-w-2xl';
    }
  };

  const validateField = (field: FormField, value: any): string | null => {
    if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `${field.label} is required`;
    }
    
    if (field.validation) {
      return field.validation(value);
    }
    
    return null;
  };

  const validateStep = (stepIndex: number): boolean => {
    if (!steps) {return true;}
    
    const stepFields = steps[stepIndex].fields;
    const stepErrors: Record<string, string> = {};
    let isValid = true;

    stepFields.forEach(fieldName => {
      const field = fields.find(f => f.name === fieldName);
      if (field) {
        const error = validateField(field, formData[fieldName]);
        if (error) {
          stepErrors[fieldName] = error;
          isValid = false;
        }
      }
    });

    setErrors(prev => ({ ...prev, ...stepErrors }));
    return isValid;
  };

  const handleInputChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: '' }));
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors: Record<string, string> = {};
    fields.forEach(field => {
      const error = validateField(field, formData[field.name]);
      if (error) {
        newErrors[field.name] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const hasError = !!errors[field.name];
    
    switch (field.type) {
    case 'textarea':
      return (
        <textarea
          className={`textarea textarea-bordered w-full ${hasError ? 'textarea-error' : ''}`}
          placeholder={field.placeholder}
          value={formData[field.name] || ''}
          onChange={(e) => handleInputChange(field.name, e.target.value)}
          disabled={field.disabled || loading}
          rows={4}
        />
      );
        
    case 'select':
      return (
        <select
          className={`select select-bordered w-full ${hasError ? 'select-error' : ''}`}
          value={formData[field.name] || ''}
          onChange={(e) => handleInputChange(field.name, e.target.value)}
          disabled={field.disabled || loading}
          multiple={field.multiple}
        >
          <option value="">{field.placeholder || 'Select an option'}</option>
          {field.options?.map(option => (
            <option key={option.value} value={option.value}>
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
              type="checkbox"
              className="checkbox"
              checked={formData[field.name] || false}
              onChange={(e) => handleInputChange(field.name, e.target.checked)}
              disabled={field.disabled || loading}
            />
            <span className="label-text">{field.label}</span>
          </label>
        </div>
      );
        
    case 'radio':
      return (
        <div className="form-control">
          {field.options?.map(option => (
            <label key={option.value} className="label cursor-pointer justify-start gap-2">
              <input
                type="radio"
                name={field.name}
                className="radio"
                value={option.value}
                checked={formData[field.name] === option.value}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                disabled={field.disabled || loading}
              />
              <span className="label-text">{option.label}</span>
            </label>
          ))}
        </div>
      );
        
    case 'file':
      return (
        <input
          type="file"
          className={`file-input file-input-bordered w-full ${hasError ? 'file-input-error' : ''}`}
          onChange={(e) => handleInputChange(field.name, e.target.files?.[0])}
          disabled={field.disabled || loading}
          multiple={field.multiple}
        />
      );
        
    default:
      return (
        <Input
          type={field.type}
          variant={hasError ? 'error' : undefined}
          placeholder={field.placeholder}
          value={formData[field.name] || ''}
          onChange={(e) => handleInputChange(field.name, e.target.value)}
          disabled={field.disabled || loading}
        />
      );
    }
  };

  const getCurrentStepFields = () => {
    if (!steps) {return fields;}
    return fields.filter(field => steps[currentStep].fields.includes(field.name));
  };

  if (!isOpen) {return null;}

  return (
    <div className="modal modal-open">
      <div className={`modal-box ${getSizeClass()}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{title}</h3>
          <button 
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        {/* Steps indicator */}
        {steps && steps.length > 1 && (
          <div className="mb-6">
            <ul className="steps steps-horizontal w-full">
              {steps.map((step, index) => (
                <li 
                  key={index}
                  className={`step ${index <= currentStep ? 'step-primary' : ''}`}
                >
                  {step.title}
                </li>
              ))}
            </ul>
            
            {steps[currentStep].description && (
              <div className="mt-2 text-sm text-base-content/60 text-center">
                {steps[currentStep].description}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Form Fields */}
          <div className="space-y-4">
            {getCurrentStepFields().map(field => (
              <div key={field.name} className="form-control w-full">
                {field.type !== 'checkbox' && (
                  <label className="label">
                    <span className="label-text">
                      {field.label}
                      {field.required && <span className="text-error ml-1">*</span>}
                    </span>
                  </label>
                )}
                
                {renderField(field)}
                
                {errors[field.name] && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors[field.name]}</span>
                  </label>
                )}
                
                {field.helperText && !errors[field.name] && (
                  <label className="label">
                    <span className="label-text-alt text-base-content/60">{field.helperText}</span>
                  </label>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="modal-action">
            {steps && steps.length > 1 ? (
              <div className="flex justify-between w-full">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0 || isSubmitting}
                >
                  Previous
                </button>
                
                {currentStep < steps.length - 1 ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleNext}
                    disabled={isSubmitting}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <span className="loading loading-spinner loading-sm"></span>}
                    {submitText}
                  </button>
                )}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  {cancelText}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <span className="loading loading-spinner loading-sm"></span>}
                  {submitText}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalForm;