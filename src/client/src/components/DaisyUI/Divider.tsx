import React, { HTMLAttributes } from 'react';

export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  /** Additional CSS classes */
  className?: string;
  /** Whether the divider is horizontal or vertical */
  horizontal?: boolean;
  /** Text to display in the center of the divider */
  text?: string;
  /** Whether to use the divider as a horizontal rule */
  horizontalRule?: boolean;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * DaisyUI Divider Component
 * 
 * A component that visually separates content sections.
 * Useful for creating clear boundaries between different content areas.
 */
const Divider: React.FC<DividerProps> = ({
  className = '',
 horizontal = true,
  text,
  horizontalRule = false,
 'data-testid': testId,
  ...props
}) => {
  const getClasses = () => {
    const classes = [
      'divider',
      horizontal ? 'divider-horizontal' : 'divider-vertical',
      className
    ];
    
    return classes.join(' ');
 };

  if (horizontalRule) {
    return (
      <div 
        className={getClasses()}
        data-testid={testId}
        {...props}
      >
        <hr className="divider-item" />
        {text && <span className="divider-label">{text}</span>}
        <hr className="divider-item" />
      </div>
    );
  }

  return (
    <div 
      className={getClasses()}
      data-testid={testId}
      {...props}
    >
      {text && <span className="divider-label">{text}</span>}
    </div>
  );
};

export default Divider;