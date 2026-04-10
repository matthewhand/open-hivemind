/**
 * Swap Component - DaisyUI swap toggle for switching between two states
 */

import React, { useState } from 'react';

interface SwapProps {
  onContent: React.ReactNode;
  offContent: React.ReactNode;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  variant?: 'default' | 'rotate' | 'flip';
  className?: string;
  disabled?: boolean;
}

const Swap: React.FC<SwapProps> = ({
  onContent,
  offContent,
  checked = false,
  onChange,
  variant = 'default',
  className = '',
  disabled = false
}) => {
  const [isChecked, setIsChecked] = useState(checked);

  const handleChange = (newChecked: boolean) => {
    if (disabled) return;
    setIsChecked(newChecked);
    onChange?.(newChecked);
  };

  const getSwapClasses = () => {
    const variantClasses = {
      default: '',
      rotate: 'swap-rotate',
      flip: 'swap-flip'
    };

    return `swap ${variantClasses[variant]} ${disabled ? 'swap-disabled' : ''}`;
  };

  return (
    <label className={`${getSwapClasses()} ${className}`}>
      <input
        type="checkbox"
        checked={isChecked}
        onChange={(e) => handleChange(e.target.checked)}
        disabled={disabled}
        className="swap-checkbox"
      />
      <div className="swap-on">{onContent}</div>
      <div className="swap-off">{offContent}</div>
    </label>
  );
};

export default Swap;