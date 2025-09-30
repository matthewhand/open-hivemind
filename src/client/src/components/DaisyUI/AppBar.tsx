import React from 'react';

export interface AppBarProps {
  children: React.ReactNode;
  position?: 'fixed' | 'absolute' | 'sticky' | 'static' | 'relative';
  color?: 'default' | 'primary' | 'secondary' | 'transparent';
  elevation?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const AppBar: React.FC<AppBarProps> = ({
  children,
  position = 'static',
  color = 'default',
  elevation = true,
  className = '',
  style,
  ...props
}) => {
  const positionClasses = {
    fixed: 'fixed top-0 left-0 right-0 z-50',
    absolute: 'absolute top-0 left-0 right-0',
    sticky: 'sticky top-0 z-40',
    static: '',
    relative: 'relative',
  };

  const colorClasses = {
    default: 'bg-base-100 text-base-content',
    primary: 'bg-primary text-primary-content',
    secondary: 'bg-secondary text-secondary-content',
    transparent: 'bg-transparent',
  };

  const classes = [
    'navbar min-h-16 px-4',
    positionClasses[position],
    colorClasses[color],
    elevation ? 'shadow-lg' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <header className={classes} style={style} {...props}>
      {children}
    </header>
  );
};

export interface ToolbarProps {
  children: React.ReactNode;
  variant?: 'regular' | 'dense';
  disableGutters?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  children,
  variant = 'regular',
  disableGutters = false,
  className = '',
  style,
  ...props
}) => {
  const classes = [
    'flex items-center w-full',
    variant === 'dense' ? 'min-h-12' : 'min-h-16',
    !disableGutters ? 'px-4' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} style={style} {...props}>
      {children}
    </div>
  );
};

export default AppBar;