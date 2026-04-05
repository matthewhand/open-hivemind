import React from 'react';
import classNames from 'classnames';

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Color variant */
  color?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'error';
  /** Only show underline on hover */
  hover?: boolean;
  /** Render as a custom component (e.g., react-router Link) */
  as?: React.ElementType;
  /** Additional CSS classes */
  className?: string;
  children?: React.ReactNode;
}

const Link: React.FC<LinkProps> = React.memo(({
  color,
  hover = false,
  as: Component = 'a',
  className,
  children,
  ...props
}) => {
  const classes = classNames(
    'link',
    {
      'link-hover': hover,
      [`link-${color}`]: color,
    },
    className,
  );

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
});

Link.displayName = 'Link';

export default Link;
