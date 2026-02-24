import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface IndicatorProps {
  /** The item to be used as the indicator (e.g., Badge, Button) */
  item: React.ReactNode;
  /** The content that the indicator is attached to */
  children: React.ReactNode;
  /** Vertical position of the indicator */
  vertical?: 'top' | 'middle' | 'bottom';
  /** Horizontal position of the indicator */
  horizontal?: 'start' | 'center' | 'end';
  /** Additional CSS classes for the container */
  className?: string;
  /** Additional CSS classes for the indicator item */
  itemClassName?: string;
}

/**
 * DaisyUI Indicator Component
 *
 * Indicators are used to place an element on the corner of another element.
 *
 * @example
 * <Indicator item={<Badge>New</Badge>}>
 *   <div className="w-32 h-32 bg-base-300">Content</div>
 * </Indicator>
 */
const Indicator: React.FC<IndicatorProps> = ({
  item,
  children,
  vertical,
  horizontal,
  className = '',
  itemClassName = '',
}) => {
  const getPositionClasses = () => {
    const classes = [];

    if (vertical && vertical !== 'top') {
      classes.push(`indicator-${vertical}`);
    }

    if (horizontal && horizontal !== 'end') {
      classes.push(`indicator-${horizontal}`);
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
