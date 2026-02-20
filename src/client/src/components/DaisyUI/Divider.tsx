import React from 'react';
import classNames from 'classnames';


export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
    vertical?: boolean;
    color?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'error';
}

const Divider: React.FC<DividerProps> = ({
  children,
  vertical = false,
  color,
  className,
  ...props
}) => {

  const classes = classNames(
    'divider',
    {
      'divider-horizontal': vertical, // DaisyUI uses divider-horizontal for vertical layout (side-by-side)
      [`divider-${color}`]: color,
    },
    className,
  );

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export default Divider;
