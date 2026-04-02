import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService } from '../services/api';

export interface ValidationError {
  id: string;
  ruleId: string;
  message: string;
  field: string;
  value: any;
  expected?: any;
  suggestions?: string[];
  category: 'required' | 'format' | 'business' | 'security' | 'performance';
}

export interface ValidationWarning {
  id: string;
  ruleId: string;
  message: string;
  field: string;
  value: any;
  suggestions?: string[];
  category: 'required' | 'format' | 'business' | 'security' | 'performance';
}

export interface ValidationState {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  isValidating: boolean;
}

export interface UseRealTimeValidationOptions {
  /** Debounce delay in milliseconds (default: 500ms) */
  debounceMs?: number;
  /** Validation profile to use (default: 'standard') */
  profileId?: string;
  /** Enable validation (default: true) */
  enabled?: boolean;
}

/**
 * React hook that provides real-time validation for configuration data.
 *
 * Features:
 *  - Debounced validation (500ms default) to avoid excessive API calls
 *  - Returns validation state: { isValid, errors, warnings, isValidating }
 *  - Handles error states gracefully
 *  - Cancels pending validation when data changes
 *
 * @example
 *   const validation = useRealTimeValidation(botData, { debounceMs: 500 });
 *   if (!validation.isValid) {
 *     // Show errors
 *   }
 */
export function useRealTimeValidation<T = any>(
  data: T | null,
  options: UseRealTimeValidationOptions = {}
): ValidationState {
  const {
    debounceMs = 500,
    profileId = 'standard',
    enabled = true,
  } = options;

  const [validationState, setValidationState] = useState<ValidationState>({
    isValid: true,
    errors: [],
    warnings: [],
    isValidating: false,
  });

  // Keep track of the latest validation request to cancel stale ones
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const validate = useCallback(
    async (configData: T) => {
      // Cancel any pending validation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setValidationState(prev => ({ ...prev, isValidating: true }));

      try {
        // Call backend validation endpoint
        const response = await apiService.post<{
          success: boolean;
          result: {
            isValid: boolean;
            errors: ValidationError[];
            warnings: ValidationWarning[];
            score: number;
          };
        }>(
          '/api/admin/validate/bot-config',
          { configData, profileId },
          { signal: controller.signal }
        );

        // Only update state if this request wasn't cancelled
        if (!controller.signal.aborted) {
          setValidationState({
            isValid: response.result.isValid,
            errors: response.result.errors || [],
            warnings: response.result.warnings || [],
            isValidating: false,
          });
        }
      } catch (error: any) {
        // Ignore abort errors (request was cancelled)
        if (error.name === 'AbortError' || controller.signal.aborted) {
          return;
        }

        // Handle validation errors gracefully
        console.error('Validation error:', error);

        // Don't set validation state on network errors - keep previous state
        // This prevents flashing error states during connectivity issues
        setValidationState(prev => ({
          ...prev,
          isValidating: false,
        }));
      }
    },
    [profileId]
  );

  // Debounced validation effect
  useEffect(() => {
    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Skip validation if disabled or no data
    if (!enabled || !data) {
      setValidationState({
        isValid: true,
        errors: [],
        warnings: [],
        isValidating: false,
      });
      return;
    }

    // Debounce the validation call
    debounceTimerRef.current = setTimeout(() => {
      validate(data);
    }, debounceMs);

    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [data, enabled, debounceMs, validate]);

  return validationState;
}

/**
 * Hook to validate a specific field value
 */
export function useFieldValidation(
  fieldName: string,
  value: any,
  validationType: 'bot-config' | 'persona' = 'bot-config',
  options: UseRealTimeValidationOptions = {}
): ValidationState {
  const data = { [fieldName]: value };
  return useRealTimeValidation(data, options);
}

export default useRealTimeValidation;
