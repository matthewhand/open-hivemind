import React from 'react';

export interface ContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | false;
  className?: string;
  style?: React.CSSProperties;
}

const Container: React.FC<ContainerProps> = ({
  children,
  maxWidth = 'lg',
  className = '',
  style,
  ...props
}) => {
  const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md', 
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    false: '',
  };

  const classes = [
    'container mx-auto px-4',
    maxWidth !== false ? maxWidthClasses[maxWidth] : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} style={style} {...props}>
      {children}
    </div>
  );
};

export default Container;