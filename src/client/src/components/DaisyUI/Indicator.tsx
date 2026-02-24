import React from 'react';
import { twMerge } from 'tailwind-merge';

export type IndicatorPositionHorizontal = 'start' | 'center' | 'end';
export type IndicatorPositionVertical = 'top' | 'middle' | 'bottom';

export interface IndicatorProps {
  /** The item to be displayed as the indicator (e.g., a Badge) */
  item: React.ReactNode;
  /** The content that the indicator is attached to */
  children: React.ReactNode;
  /** Horizontal position of the indicator */
  horizontalPosition?: IndicatorPositionHorizontal;
  /** Vertical position of the indicator */
  verticalPosition?: IndicatorPositionVertical;
  /** Additional CSS classes for the container */
  className?: string;
  /** Additional CSS classes for the indicator item wrapper */
  itemClassName?: string;
}

/**
 * DaisyUI Indicator Component
 *
 * Indicators are used to place an element on the corner of another element.
 *
 * @example
 * <Indicator item={<Badge>New</Badge>}>
 *   <div className="bg-base-300 grid h-32 w-32 place-items-center">content</div>
 * </Indicator>
 */
const Indicator: React.FC<IndicatorProps> = ({
  item,
  children,
  horizontalPosition,
  verticalPosition,
  className = '',
  itemClassName = '',
}) => {
  const getPositionClasses = () => {
    const classes = [];

    if (horizontalPosition) {
      classes.push(`indicator-${horizontalPosition}`);
    }

    if (verticalPosition) {
      classes.push(`indicator-${verticalPosition}`);
    }

    return classes.join(' ');
  };

  return (
    <div className={twMerge('indicator', className)}>
      <span className={twMerge('indicator-item', getPositionClasses(), itemClassName)}>
        {item}
      </span>
      {children}
    </div>
  );
};

export default Indicator;
