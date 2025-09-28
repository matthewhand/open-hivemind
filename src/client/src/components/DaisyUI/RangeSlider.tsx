import React, { useState, useCallback } from 'react';

export interface RangeSliderProps {
  /** Current value of the slider */
  value?: number;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Color variant of the slider */
  variant?: 'primary' | 'secondary' | 'accent';
  /** Size of the slider */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Whether the slider is disabled */
  disabled?: boolean;
  /** Callback when value changes */
  onChange?: (value: number) => void;
  /** Label for the slider */
  label?: string;
  /** Whether to show value tooltip */
  showValue?: boolean;
  /** Custom value formatter */
  valueFormatter?: (value: number) => string;
  /** Additional CSS classes */
  className?: string;
  /** Accessibility label */
  'aria-label'?: string;
  /** ID for the input element */
  id?: string;
}

export const RangeSlider: React.FC<RangeSliderProps> = ({
  value: initialValue = 50,
  min = 0,
  max = 100,
  step = 1,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onChange,
  label,
  showValue = true,
  valueFormatter = (val) => val.toString(),
  className = '',
  'aria-label': ariaLabel,
  id,
  ...props
}) => {
  const [internalValue, setInternalValue] = useState(initialValue);

  const currentValue = onChange ? initialValue : internalValue;

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(event.target.value);
    if (onChange) {
      onChange(newValue);
    } else {
      setInternalValue(newValue);
    }
  }, [onChange]);

  const getVariantClass = () => {
    return `range-${variant}`;
  };

  const getSizeClass = () => {
    switch (size) {
      case 'xs': return 'range-xs';
      case 'sm': return 'range-sm';
      case 'lg': return 'range-lg';
      default: return '';
    }
  };

  const baseClasses = 'range';
  const variantClass = getVariantClass();
  const sizeClass = getSizeClass();
  const disabledClass = disabled ? 'range-disabled' : '';

  const sliderId = id || `range-slider-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`form-control ${className}`.trim()}>
      {label && (
        <label htmlFor={sliderId} className="label">
          <span className="label-text">{label}</span>
          {showValue && (
            <span className="label-text-alt">{valueFormatter(currentValue)}</span>
          )}
        </label>
      )}
      <input
        id={sliderId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        disabled={disabled}
        onChange={handleChange}
        className={`${baseClasses} ${variantClass} ${sizeClass} ${disabledClass}`.trim()}
        aria-label={ariaLabel || label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={currentValue}
        aria-valuetext={showValue ? valueFormatter(currentValue) : undefined}
        {...props}
      />
      {!label && showValue && (
        <div className="text-center mt-2">
          <span className="text-sm opacity-70">{valueFormatter(currentValue)}</span>
        </div>
      )}
    </div>
  );
};

export default RangeSlider;