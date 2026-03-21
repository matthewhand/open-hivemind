import React, { memo } from 'react';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color' | 'style'> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'link';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  buttonStyle?: 'solid' | 'outline';
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  className?: string;
  loadingText?: string;
}

// Bolt Optimization: Added React.memo() to prevent unnecessary re-renders.
// Since Button is a primitive UI component used inside lists and forms,
// this skips reconciliation passes when parent re-renders and props are identical.
export const Button = memo(({
  children,
  variant = 'primary',
  size = 'md',
  buttonStyle = 'solid',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  startIcon,
  endIcon,
  className = '',
  loadingText,
  onClick,
  ...props
}: ButtonProps) => {
  const getVariantClass = () => {
    if (buttonStyle === 'outline') {
      return `btn-outline btn-${variant}`;
    }
    return `btn-${variant}`;
  };

  const getSizeClass = () => {
    switch (size) {
    case 'xs': return 'btn-xs';
    case 'sm': return 'btn-sm';
    case 'lg': return 'btn-lg';
    default: return '';
    }
  };

  const getSpinnerSizeClass = () => {
    switch (size) {
    case 'xs': return 'loading-xs';
    case 'sm': return 'loading-sm';
    case 'lg': return 'loading-lg';
    default: return 'loading-md';
    }
  };

  const baseClasses = 'btn';
  const variantClass = getVariantClass();
  const sizeClass = getSizeClass();
  const loadingClass = loading ? 'loading' : '';
  const disabledClass = disabled || loading ? 'btn-disabled' : '';

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (loading || disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  const hasTextContent = Boolean(loadingText || (children && React.Children.count(children) > 0));

  const buttonContent = (
    <>
      {loading && <span className={`loading loading-spinner ${getSpinnerSizeClass()} ${hasTextContent ? 'mr-2' : ''}`.trim()}></span>}
      {(icon || startIcon) && !loading && <span className="mr-2">{icon || startIcon}</span>}
      {loading && loadingText ? loadingText : children}
      {(iconRight || endIcon) && !loading && <span className="ml-2">{iconRight || endIcon}</span>}
    </>
  );

  return (
    <button
      className={`${baseClasses} ${variantClass} ${sizeClass} ${loadingClass} ${disabledClass} ${className}`.trim()}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {buttonContent}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
