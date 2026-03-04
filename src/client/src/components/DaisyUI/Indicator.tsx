import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface IndicatorProps {
  /** The content of the indicator (e.g., a badge or icon) */
  item: React.ReactNode;
  /** The main content that the indicator is attached to */
  children: React.ReactNode;
  /** Vertical position of the indicator */
  verticalPosition?: 'top' | 'middle' | 'bottom';
  /** Horizontal position of the indicator */
  horizontalPosition?: 'start' | 'center' | 'end';
  /** Additional CSS classes for the container */
  className?: string;
  /** Additional CSS classes for the indicator item itself */
  itemClassName?: string;
}

/**
 * DaisyUI Indicator Component
 *
 * A component to place an element on the corner of another element.
 *
 * @example
 * <Indicator item={<Badge>99+</Badge>}>
 *   <Button>Inbox</Button>
 * </Indicator>
 */
const Indicator: React.FC<IndicatorProps> = ({
  item,
  children,
  verticalPosition = 'top',
  horizontalPosition = 'end',
  className = '',
  itemClassName = '',
}) => {
  // Default is top-end, so we only need to add classes for non-default positions if we want to be explicit,
  // but DaisyUI classes are additive.
  // Actually, 'indicator-item' defaults to top-end.
  // Adding 'indicator-middle' or 'indicator-bottom' changes vertical.
  // Adding 'indicator-start' or 'indicator-center' changes horizontal.

  const positionClasses = [
    verticalPosition !== 'top' ? `indicator-${verticalPosition}` : '',
    horizontalPosition !== 'end' ? `indicator-${horizontalPosition}` : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={twMerge('indicator', className)}>
      <span className={twMerge('indicator-item', positionClasses, itemClassName)}>
        {item}
      </span>
      {children}
    </div>
  );
};

export default Indicator;
