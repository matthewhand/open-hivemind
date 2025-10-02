import React, { ReactNode, HTMLAttributes } from 'react';

export interface IndicatorProps extends HTMLAttributes<HTMLDivElement> {
  /** The main content */
  children: ReactNode;
  /** The indicator element to display */
  indicator: ReactNode;
  /** Position of the indicator */
  position?: 'top-start' | 'top-center' | 'top-end' | 'middle-start' | 'middle-center' | 'middle-end' | 'bottom-start' | 'bottom-center' | 'bottom-end';
  /** Additional CSS classes for the container */
  className?: string;
  /** Additional CSS classes for the indicator */
  indicatorClassName?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * DaisyUI Indicator Component
 * 
 * A component to attach a badge or notification to another element.
 * Perfect for showing notification counts, status dots, or other small indicators.
 */
const Indicator: React.FC<IndicatorProps> = ({
  children,
  indicator,
  position = 'top-end',
  className = '',
  indicatorClassName = '',
  'data-testid': testId,
  ...props
}) => {
  const getPositionClasses = () => {
    const positions = {
      'top-start': 'indicator-top indicator-start',
      'top-center': 'indicator-top indicator-center',
      'top-end': 'indicator-top indicator-end',
      'middle-start': 'indicator-middle indicator-start',
      'middle-center': 'indicator-middle indicator-center',
      'middle-end': 'indicator-middle indicator-end',
      'bottom-start': 'indicator-bottom indicator-start',
      'bottom-center': 'indicator-bottom indicator-center',
      'bottom-end': 'indicator-bottom indicator-end',
    };
    return positions[position];
  };

  return (
    <div 
      className={`indicator ${className}`}
      data-testid={testId}
      {...props}
    >
      <span className={`indicator-item ${getPositionClasses()} ${indicatorClassName}`}>
        {indicator}
      </span>
      {children}
    </div>
  );
};

export default Indicator;