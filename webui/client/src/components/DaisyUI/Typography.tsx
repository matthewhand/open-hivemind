import React from 'react';

export interface TypographyProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'subtitle1' | 'subtitle2' | 'body1' | 'body2' | 'caption';
  component?: keyof React.JSX.IntrinsicElements;
  className?: string;
  gutterBottom?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'inherit';
  align?: 'left' | 'center' | 'right' | 'justify';
  style?: React.CSSProperties;
}

const Typography: React.FC<TypographyProps> = ({
  children,
  variant = 'body1',
  component,
  className = '',
  gutterBottom = false,
  color,
  align,
  style,
  ...props
}) => {
  // Default components for each variant
  const defaultComponents = {
    h1: 'h1',
    h2: 'h2', 
    h3: 'h3',
    h4: 'h4',
    h5: 'h5',
    h6: 'h6',
    subtitle1: 'h6',
    subtitle2: 'h6',
    body1: 'p',
    body2: 'p',
    caption: 'span',
  } as const;

  // Typography classes for each variant
  const variantClasses = {
    h1: 'text-4xl font-bold',
    h2: 'text-3xl font-bold',
    h3: 'text-2xl font-bold',
    h4: 'text-xl font-bold',
    h5: 'text-lg font-semibold',
    h6: 'text-base font-semibold',
    subtitle1: 'text-base font-medium',
    subtitle2: 'text-sm font-medium',
    body1: 'text-base',
    body2: 'text-sm',
    caption: 'text-xs',
  };

  const colorClasses = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
    info: 'text-info',
    inherit: '',
  };

  const alignClasses = {
    left: 'text-left',
    center: 'text-center', 
    right: 'text-right',
    justify: 'text-justify',
  };

  const classes = [
    variantClasses[variant],
    color ? colorClasses[color] : '',
    align ? alignClasses[align] : '',
    gutterBottom ? 'mb-4' : '',
    className,
  ].filter(Boolean).join(' ');

  const Component = component || defaultComponents[variant];

  return React.createElement(
    Component,
    {
      className: classes,
      style,
      ...props,
    },
    children
  );
};

export default Typography;