import React from 'react';
import classNames from 'classnames';

export interface FilterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Additional CSS classes */
  className?: string;
  children?: React.ReactNode;
}

const Filter: React.FC<FilterProps> = React.memo(({
  className,
  children,
  ...props
}) => {
  const classes = classNames('filter', className);

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
});

Filter.displayName = 'Filter';

export interface FilterResetProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Additional CSS classes */
  className?: string;
}

export const FilterReset: React.FC<FilterResetProps> = React.memo(({
  className,
  ...props
}) => {
  const classes = classNames('filter-reset', className);

  return (
    <input type="radio" className={classes} aria-label="Reset filter" {...props} />
  );
});

FilterReset.displayName = 'FilterReset';

export default Filter;
