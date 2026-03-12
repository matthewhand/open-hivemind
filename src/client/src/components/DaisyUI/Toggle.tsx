import React from 'react';
import classNames from 'classnames';


export interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
    label?: React.ReactNode;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'info' | 'error';
    variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'info' | 'error';
}

const Toggle: React.FC<ToggleProps> = ({
  label,
  size = 'md',
  color,
  variant,
  className,
  checked,
  onChange,
  ...props
}) => {

  const activeColor = color || variant;

  const toggleClasses = classNames(
    'toggle',
    {
      [`toggle-${size}`]: size,
      [`toggle-${activeColor}`]: activeColor,
    },
    className,
  );

  const toggleInput = (
    <input
      type="checkbox"
      className={toggleClasses}
      checked={checked}
      onChange={onChange}
      {...props}
    />
  );

  if (label) {
    return (
      <div className="form-control">
        <label className="label cursor-pointer">
          <span className="label-text">{label}</span>
          {toggleInput}
        </label>
      </div>
    );
  }

  return toggleInput;
};

export default Toggle;
