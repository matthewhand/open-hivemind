import React from 'react';

interface ChipProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const Chip: React.FC<ChipProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
}) => {
  const getVariantClass = () => {
    const variants = {
      primary: 'badge-primary',
      secondary: 'badge-secondary',
      accent: 'badge-accent',
      info: 'badge-info',
      success: 'badge-success',
      warning: 'badge-warning',
      error: 'badge-error',
      ghost: 'badge-ghost',
    };
    return variants[variant] || variants.primary;
  };

  const getSizeClass = () => {
    const sizes = {
      xs: 'badge-xs',
      sm: 'badge-sm',
      md: 'badge-md',
      lg: 'badge-lg',
    };
    return sizes[size] || sizes.md;
  };

  return (
    <span className={`badge ${getVariantClass()} ${getSizeClass()} ${className}`}>
      {children}
    </span>
  );
};

export default Chip;