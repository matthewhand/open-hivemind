/* eslint-disable @typescript-eslint/no-explicit-any */

/** Shared field type definitions used by Form and ModalForm components. */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file' | 'url' | 'tel' | 'date' | 'time' | 'datetime-local' | 'key-value' | 'custom';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  options?: SelectOption[];
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
  render?: (props: { value: any; onChange: (value: any) => void; error?: string; disabled?: boolean }) => React.ReactNode;
}

export interface FormFieldSet {
  legend: string;
  description?: string;
  fields: string[];
  className?: string;
}
