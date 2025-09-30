import React, { ReactNode, HTMLAttributes } from 'react';

export interface JoinProps extends HTMLAttributes<HTMLDivElement> {
  /** Children elements to be joined */
  children: ReactNode;
  /** Whether to make the join vertical instead of horizontal */
  vertical?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * DaisyUI Join Component
 * 
 * A component that visually connects form elements or buttons.
 * Perfect for grouping related controls like search inputs with buttons,
 * or creating connected form fields.
 */
const Join: React.FC<JoinProps> = ({
  children,
  vertical = false,
  className = '',
  'data-testid': testId,
  ...props
}) => {
  const joinClasses = `join ${vertical ? 'join-vertical' : 'join-horizontal'} ${className}`;

  return (
    <div 
      className={joinClasses}
      data-testid={testId}
      {...props}
    >
      {children}
    </div>
 );
};

export default Join;