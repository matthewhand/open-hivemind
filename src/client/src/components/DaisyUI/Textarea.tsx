import React, { forwardRef, TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  bordered?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    className = '',
    variant = 'primary',
    size = 'md',
    bordered = true,
    resize = 'vertical',
    ...props
  }, ref) => {
    const getVariantClass = () => {
      const variants = {
        primary: 'textarea-primary',
        secondary: 'textarea-secondary',
        accent: 'textarea-accent',
        info: 'textarea-info',
        success: 'textarea-success',
        warning: 'textarea-warning',
        error: 'textarea-error',
        ghost: 'textarea-ghost'
      };
      return variants[variant] || variants.primary;
    };

    const getSizeClass = () => {
      const sizes = {
        xs: 'textarea-xs',
        sm: 'textarea-sm',
        md: 'textarea-md',
        lg: 'textarea-lg'
      };
      return sizes[size] || sizes.md;
    };

    const getBorderedClass = () => bordered ? 'textarea-bordered' : '';
    const getResizeClass = () => {
      const resizes = {
        none: 'resize-none',
        vertical: 'resize-y',
        horizontal: 'resize-x',
        both: 'resize'
      };
      return resizes[resize] || resizes.vertical;
    };

    return (
      <textarea
        ref={ref}
        className={`textarea ${getVariantClass()} ${getSizeClass()} ${getBorderedClass()} ${getResizeClass()} ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;