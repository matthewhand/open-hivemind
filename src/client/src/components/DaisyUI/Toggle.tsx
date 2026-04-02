import React, { useId } from 'react';
import classNames from 'classnames';


export interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
    label?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'info' | 'error';
}

const Toggle: React.FC<ToggleProps> = ({
  label,
  size = 'md',
  color,
  className,
  checked,
  onChange,
  id,
  ...props
}) => {
  const uniqueId = useId();
  const toggleId = id || `toggle-${uniqueId}`;

  const toggleClasses = classNames(
    'toggle',
    {
      [`toggle-${size}`]: size,
      [`toggle-${color}`]: color,
    },
    className,
  );

  const toggleInput = (
    <input
      id={toggleId}
      type="checkbox"
      className={toggleClasses}
      checked={checked}
      onChange={onChange}
      aria-label={!label ? (props['aria-label'] || 'Toggle') : undefined}
      {...props}
    />
  );

  if (label) {
    return (
      <div className="form-control">
        <label htmlFor={toggleId} className="label cursor-pointer">
          <span className="label-text">{label}</span>
          {toggleInput}
        </label>
      </div>
    );
  }

  return toggleInput;
};

export default Toggle;
