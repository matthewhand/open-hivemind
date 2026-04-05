import React from 'react';
import classNames from 'classnames';

export interface FooterProps extends React.HTMLAttributes<HTMLElement> {
  /** Center the footer content */
  center?: boolean;
  /** Additional CSS classes */
  className?: string;
  children?: React.ReactNode;
}

const Footer: React.FC<FooterProps> = React.memo(({
  center = false,
  className,
  children,
  ...props
}) => {
  const classes = classNames(
    'footer',
    {
      'footer-center': center,
    },
    className,
  );

  return (
    <footer className={classes} {...props}>
      {children}
    </footer>
  );
});

Footer.displayName = 'Footer';

export default Footer;
