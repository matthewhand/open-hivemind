import React, { useId } from 'react';
import classNames from 'classnames';


export interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
    label?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'info' | 'error';
}

const Toggle: React.FC<ToggleProps> = ({
  id,
  label,
  size = 'md',
  color,
  className,
  checked,
  onChange,
  ...props
}) => {

  const reactId = useId();
  const toggleId = id || reactId;

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
      type="checkbox"
      role="switch"
      id={toggleId}
      className={toggleClasses}
      checked={checked}
      aria-checked={checked}
      onChange={onChange}
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
