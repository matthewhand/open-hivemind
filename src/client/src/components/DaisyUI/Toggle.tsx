import React, { useState, useCallback } from 'react';

type ToggleSize = 'xs' | 'sm' | 'md' | 'lg';
type ToggleColor = 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';

interface ToggleProps {
  id: string;
  label: string;
  helperText?: string;
  size?: ToggleSize;
  color?: ToggleColor;
  disabled?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({
  id,
  label,
  helperText,
  size = 'md',
  color,
  disabled = false,
  checked: initialChecked = false,
  onChange,
}) => {
  const [isChecked, setIsChecked] = useState(initialChecked);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newCheckedState = event.target.checked;
    setIsChecked(newCheckedState);
    if (onChange) {
      onChange(newCheckedState);
    }
  }, [onChange]);

  const sizeClasses: Record<ToggleSize, string> = {
    xs: 'toggle-xs',
    sm: 'toggle-sm',
    md: 'toggle-md',
    lg: 'toggle-lg',
  };

  const colorClasses: Record<ToggleColor, string> = {
    primary: 'toggle-primary',
    secondary: 'toggle-secondary',
    accent: 'toggle-accent',
    success: 'toggle-success',
    warning: 'toggle-warning',
    error: 'toggle-error',
  };

  const toggleClassName = [
    'toggle',
    sizeClasses[size],
    color ? colorClasses[color] : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="form-control">
      <label htmlFor={id} className="label cursor-pointer">
        <span id={`${id}-label`} className="label-text">{label}</span>
        <input
          type="checkbox"
          id={id}
          className={toggleClassName}
          checked={isChecked}
          onChange={handleChange}
          disabled={disabled}
          aria-checked={isChecked}
          aria-label={label}
          aria-describedby={helperText ? `${id}-helper` : undefined}
          role="switch"
        />
      </label>
      {helperText && (
        <div className="label" id={`${id}-helper`}>
          <span className="label-text-alt">{helperText}</span>
        </div>
      )}
    </div>
  );
};

export default Toggle;