import React, { ReactNode, HTMLAttributes } from 'react';

export interface ArtboardProps extends HTMLAttributes<HTMLDivElement> {
  /** Content to display within the artboard */
  children: ReactNode;
  /** Size of the artboard */
  size?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Whether the artboard is horizontal */
  horizontal?: boolean;
  /** Whether to display the artboard in phone mode */
  phone?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * DaisyUI Artboard Component
 * 
 * A component that provides a fixed-size container for showcasing content,
 * such as code snippets, UI mockups, or visual examples.
 */
const Artboard: React.FC<ArtboardProps> = ({
  children,
  size = 1,
  horizontal = false,
  phone = false,
  className = '',
  'data-testid': testId,
  ...props
}) => {
  const getPhoneClass = () => {
    if (!phone) return '';
    return horizontal ? `phone-${size} artboard-horizontal` : `phone-${size}`;
  };

  const artboardClasses = `artboard ${getPhoneClass()} ${className}`;

  return (
    <div 
      className={artboardClasses}
      data-testid={testId}
      {...props}
    >
      {children}
    </div>
  );
};

export default Artboard;