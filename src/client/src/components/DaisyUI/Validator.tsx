import React from 'react';
import classNames from 'classnames';

export interface ValidatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Additional CSS classes */
  className?: string;
  children?: React.ReactNode;
}

const Validator: React.FC<ValidatorProps> = React.memo(({
  className,
  children,
  ...props
}) => {
  const classes = classNames('validator', className);

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
});

Validator.displayName = 'Validator';

export interface ValidatorHintProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Additional CSS classes */
  className?: string;
  children?: React.ReactNode;
}

export const ValidatorHint: React.FC<ValidatorHintProps> = React.memo(({
  className,
  children,
  ...props
}) => {
  const classes = classNames('validator-hint', className);

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
});

ValidatorHint.displayName = 'ValidatorHint';

export default Validator;
