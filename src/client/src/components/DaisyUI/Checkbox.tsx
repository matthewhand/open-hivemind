import React, { useRef, useEffect } from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** The label text to display next to the checkbox */
  label?: string;
  /** Custom content to display instead of or in addition to the label */
  children?: React.ReactNode;
  /** Color variant of the checkbox */
  variant?: 'primary' | 'secondary' | 'accent';
  /** Size of the checkbox */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Whether the checkbox is in an indeterminate state */
  indeterminate?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Callback when the checkbox state changes */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  children,
  variant,
  size = 'md',
  indeterminate = false,
  className = '',
  checked,
  disabled,
  onChange,
  id,
  ...props
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const getVariantClass = () => {
    switch (variant) {
    case 'primary': return 'checkbox-primary';
    case 'secondary': return 'checkbox-secondary';
    case 'accent': return 'checkbox-accent';
    default: return '';
    }
  };

  const getSizeClass = () => {
    switch (size) {
    case 'xs': return 'checkbox-xs';
    case 'sm': return 'checkbox-sm';
    case 'lg': return 'checkbox-lg';
    default: return '';
    }
  };

  const baseClasses = 'checkbox';
  const variantClass = getVariantClass();
  const sizeClass = getSizeClass();

  const inputId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Reset indeterminate state when user interacts with the checkbox
    if (inputRef.current && indeterminate) {
      inputRef.current.indeterminate = false;
    }
    onChange?.(event);
  };

  return (
    <div className={`form-control ${className}`.trim()}>
      <label className="label cursor-pointer">
        <input
          ref={inputRef}
          type="checkbox"
          id={inputId}
          className={`${baseClasses} ${variantClass} ${sizeClass}`.trim()}
          checked={checked}
          disabled={disabled}
          onChange={handleChange}
          aria-checked={indeterminate ? 'mixed' : checked ? 'true' : 'false'}
          aria-describedby={label ? `${inputId}-label` : undefined}
          {...props}
        />
        {(label || children) && (
          <span
            id={label ? `${inputId}-label` : undefined}
            className="label-text ml-2"
          >
            {label || children}
          </span>
        )}
      </label>
    </div>
  );
};

export default Checkbox;