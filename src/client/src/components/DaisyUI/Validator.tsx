import React from 'react';
import classNames from 'classnames';
import { useUIStore, selectHintStyle } from '../../store/uiStore';
import HintDisplay from './HintDisplay';

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
  const hintStyle = useUIStore(selectHintStyle);

  // Compact: icon only
  if (hintStyle === 'icon') {
    const textContent = typeof children === 'string' ? children : '';
    return textContent ? (
      <HintDisplay text={textContent} variant="info" className={className} />
    ) : <div className={classNames('validator-hint', className)} {...props}>{children}</div>;
  }

  // Text or Full: use standard rendering with HintDisplay for full
  if (hintStyle === 'full') {
    const textContent = typeof children === 'string' ? children : '';
    return textContent ? (
      <HintDisplay text={textContent} variant="info" className={className} />
    ) : <div className={classNames('validator-hint', className)} {...props}>{children}</div>;
  }

  const classes = classNames('validator-hint', className);
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
});

ValidatorHint.displayName = 'ValidatorHint';

export default Validator;
