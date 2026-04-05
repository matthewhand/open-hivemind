import React from 'react';
import classNames from 'classnames';

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Additional CSS classes */
  className?: string;
  children?: React.ReactNode;
}

const Stack: React.FC<StackProps> = React.memo(({
  className,
  children,
  ...props
}) => {
  const classes = classNames('stack', className);

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
});

Stack.displayName = 'Stack';

export default Stack;
