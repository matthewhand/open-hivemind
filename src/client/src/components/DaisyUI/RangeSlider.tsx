import React, { useCallback, useState } from 'react';

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
  variant?: 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
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
  /** Whether to show tick marks */
  showMarks?: boolean;
  /** Custom mark labels (requires showMarks) */
  marks?: { value: number; label: string }[];
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
  showMarks = false,
  marks = [],
  'aria-label': ariaLabel,
  id,
  ...props
}) => {
  const [internalValue, setInternalValue] = useState(initialValue);

  const currentValue = onChange ? initialValue : internalValue;

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(event.target.value);
      if (onChange) {
        onChange(newValue);
      } else {
        setInternalValue(newValue);
      }
    },
    [onChange]
  );

  const getVariantClass = () => {
    return `range-${variant}`;
  };

  const getSizeClass = () => {
    switch (size) {
      case 'xs':
        return 'range-xs';
      case 'sm':
        return 'range-sm';
      case 'lg':
        return 'range-lg';
      default:
        return '';
    }
  };

  const baseClasses = 'range';
  const variantClass = getVariantClass();
  const sizeClass = getSizeClass();
  const disabledClass = disabled ? 'range-disabled' : '';

  const generatedId = React.useId();
  const sliderId = id || `range-slider-${generatedId}`;

  return (
    <div className={`form-control ${className}`.trim()}>
      {label && (
        <label htmlFor={sliderId} className="label">
          <span className="label-text">{label}</span>
          {showValue && <span className="label-text-alt">{valueFormatter(currentValue)}</span>}
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
      {showMarks && (
        <div className="w-full flex justify-between text-xs px-2 mt-1">
          {marks.length > 0 ? (
            marks.map((mark, index) => (
              <span key={index} className={`opacity-70 flex flex-col items-center ${currentValue === mark.value ? `font-bold text-${variant}` : ''}`}>
                <span>|</span>
                <span>{mark.label}</span>
              </span>
            ))
          ) : (
            // Default marks based on min/max and step
            Array.from({ length: Math.floor((max - min) / step) + 1 }).map((_, index) => (
              <span key={index}>|</span>
            ))
          )}
        </div>
      )}
      {!label && showValue && !showMarks && (
        <div className="text-center mt-2">
          <span className="text-sm opacity-70">{valueFormatter(currentValue)}</span>
        </div>
      )}
    </div>
  );
};

export default RangeSlider;
