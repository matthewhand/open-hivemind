import React from 'react';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  /** The content to display inside the button */
  children: React.ReactNode;
  /** Color variant of the button */
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'link';
  /** Size of the button */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Style variant - solid or outline */
  buttonStyle?: 'solid' | 'outline';
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Optional icon to display before the content */
  icon?: React.ReactNode;
  /** Optional icon to display after the content */
  iconRight?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Loading text to display when loading */
  loadingText?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  buttonStyle = 'solid',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  className = '',
  loadingText,
  onClick,
  ...props
}) => {
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

  const buttonContent = (
    <>
      {loading && !loadingText && <span className="loading loading-spinner loading-sm"></span>}
      {icon && !loading && <span className="mr-2">{icon}</span>}
      {loading && loadingText ? loadingText : children}
      {iconRight && !loading && <span className="ml-2">{iconRight}</span>}
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
};

export default Button;