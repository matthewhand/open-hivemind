import React from 'react';

type RadioSize = 'xs' | 'sm' | 'md' | 'lg';
type RadioColor = 'primary' | 'secondary' | 'accent';

export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  radioSize?: RadioSize;
  color?: RadioColor;
}

const Radio: React.FC<RadioProps> = ({
  label,
  radioSize,
  color,
  className,
  disabled,
  ...props
}) => {
  const sizeClasses: Record<RadioSize, string> = {
    xs: 'radio-xs',
    sm: 'radio-sm',
    md: 'radio-md',
    lg: 'radio-lg',
  };

  const colorClasses: Record<RadioColor, string> = {
    primary: 'radio-primary',
    secondary: 'radio-secondary',
    accent: 'radio-accent',
  };

  const radioClassName = [
    'radio',
    radioSize ? sizeClasses[radioSize] : '',
    color ? colorClasses[color] : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="form-control">
      <label className="label cursor-pointer">
        {label && <span className="label-text">{label}</span>}
        <input
          type="radio"
          className={radioClassName}
          disabled={disabled}
          {...props}
        />
      </label>
    </div>
  );
};

export default Radio;