import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { Alert } from './DaisyUI/Alert';
import type { ValidationError, ValidationWarning } from '../hooks/useRealTimeValidation';

export interface ValidationFeedbackProps {
  /** Validation errors */
  errors?: ValidationError[];
  /** Validation warnings */
  warnings?: ValidationWarning[];
  /** Whether validation is in progress */
  isValidating?: boolean;
  /** Whether the field/form is valid */
  isValid?: boolean;
  /** Field name for filtering errors/warnings */
  fieldName?: string;
  /** Show inline or block style */
  variant?: 'inline' | 'block';
  /** Compact mode (smaller text) */
  compact?: boolean;
}

/**
 * Component to display validation feedback (errors, warnings, loading state).
 *
 * Features:
 * - Color-coded alerts (red for errors, yellow for warnings, green for valid)
 * - Loading spinner while validating
 * - Helpful suggestions from validation rules
 * - Field-specific filtering
 */
export const ValidationFeedback: React.FC<ValidationFeedbackProps> = ({
  errors = [],
  warnings = [],
  isValidating = false,
  isValid = true,
  fieldName,
  variant = 'inline',
  compact = false,
}) => {
  // Filter errors/warnings by field name if provided
  const filteredErrors = fieldName
    ? errors.filter(e => e.field === fieldName)
    : errors;
  const filteredWarnings = fieldName
    ? warnings.filter(w => w.field === fieldName)
    : warnings;

  const hasErrors = filteredErrors.length > 0;
  const hasWarnings = filteredWarnings.length > 0;
  const showSuccess = !isValidating && !hasErrors && !hasWarnings && isValid;

  if (isValidating) {
    return (
      <div className={`flex items-center gap-2 text-base-content/60 ${compact ? 'text-xs' : 'text-sm'}`}>
        <Loader className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} animate-spin`} />
        <span>Validating...</span>
      </div>
    );
  }

  if (!hasErrors && !hasWarnings && !showSuccess) {
    return null;
  }

  if (variant === 'inline') {
    return (
      <div className="space-y-1">
        {filteredErrors.map((error, idx) => (
          <div
            key={`error-${idx}`}
            className={`flex items-start gap-2 text-error ${compact ? 'text-xs' : 'text-sm'}`}
          >
            <AlertCircle className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} flex-shrink-0 mt-0.5`} />
            <div className="flex-1">
              <div className="font-medium">{error.message}</div>
              {error.suggestions && error.suggestions.length > 0 && (
                <ul className="list-disc list-inside mt-1 opacity-80">
                  {error.suggestions.map((suggestion, sIdx) => (
                    <li key={sIdx}>{suggestion}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}

        {filteredWarnings.map((warning, idx) => (
          <div
            key={`warning-${idx}`}
            className={`flex items-start gap-2 text-warning ${compact ? 'text-xs' : 'text-sm'}`}
          >
            <AlertTriangle className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} flex-shrink-0 mt-0.5`} />
            <div className="flex-1">
              <div className="font-medium">{warning.message}</div>
              {warning.suggestions && warning.suggestions.length > 0 && (
                <ul className="list-disc list-inside mt-1 opacity-80">
                  {warning.suggestions.map((suggestion, sIdx) => (
                    <li key={sIdx}>{suggestion}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}

        {showSuccess && (
          <div className={`flex items-center gap-2 text-success ${compact ? 'text-xs' : 'text-sm'}`}>
            <CheckCircle className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} />
            <span>Valid</span>
          </div>
        )}
      </div>
    );
  }

  // Block variant - uses DaisyUI alert components
  return (
    <div className="space-y-2">
      {filteredErrors.map((error, idx) => (
        <Alert key={`error-${idx}`} status="error" className="shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-semibold">{error.message}</div>
            {error.suggestions && error.suggestions.length > 0 && (
              <ul className="list-disc list-inside mt-2 text-sm opacity-90">
                {error.suggestions.map((suggestion, sIdx) => (
                  <li key={sIdx}>{suggestion}</li>
                ))}
              </ul>
            )}
          </div>
        </Alert>
      ))}

      {filteredWarnings.map((warning, idx) => (
        <Alert key={`warning-${idx}`} status="warning" className="shadow-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-semibold">{warning.message}</div>
            {warning.suggestions && warning.suggestions.length > 0 && (
              <ul className="list-disc list-inside mt-2 text-sm opacity-90">
                {warning.suggestions.map((suggestion, sIdx) => (
                  <li key={sIdx}>{suggestion}</li>
                ))}
              </ul>
            )}
          </div>
        </Alert>
      ))}

      {showSuccess && (
        <Alert status="success" className="shadow-sm">
          <CheckCircle className="w-5 h-5" />
          <span>Configuration is valid</span>
        </Alert>
      )}
    </div>
  );
};

/**
 * Get input className based on validation state
 * Returns DaisyUI classes for input borders
 */
export function getValidationInputClass(
  isValidating: boolean,
  isValid: boolean,
  hasErrors: boolean,
  hasWarnings: boolean
): string {
  if (isValidating) {
    return 'input-bordered';
  }
  if (hasErrors) {
    return 'input-bordered input-error';
  }
  if (hasWarnings) {
    return 'input-bordered input-warning';
  }
  if (isValid && !hasErrors && !hasWarnings) {
    return 'input-bordered input-success';
  }
  return 'input-bordered';
}

export default ValidationFeedback;
