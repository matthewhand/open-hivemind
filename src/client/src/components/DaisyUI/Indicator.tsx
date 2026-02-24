import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface IndicatorProps {
  /** The item to be used as an indicator (e.g., a Badge) */
  item: React.ReactNode;
  /** The content that the indicator is attached to */
  children: React.ReactNode;
  /** Horizontal position of the indicator */
  horizontalPosition?: 'start' | 'center' | 'end';
  /** Vertical position of the indicator */
  verticalPosition?: 'top' | 'middle' | 'bottom';
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
  horizontalPosition,
  verticalPosition,
  className = '',
  itemClassName = '',
}) => {
  const getHorizontalClass = () => {
    switch (horizontalPosition) {
      case 'start':
        return 'indicator-start';
      case 'center':
        return 'indicator-center';
      case 'end':
        return 'indicator-end';
      default:
        return '';
    }
  };

  const getVerticalClass = () => {
    switch (verticalPosition) {
      case 'top':
        return 'indicator-top';
      case 'middle':
        return 'indicator-middle';
      case 'bottom':
        return 'indicator-bottom';
      default:
        return '';
    }
  };

  return (
    <div className={twMerge('indicator', className)}>
      <span
        className={twMerge(
          'indicator-item',
          getHorizontalClass(),
          getVerticalClass(),
          itemClassName
        )}
      >
        {item}
      </span>
      {children}
    </div>
  );
};

export default Indicator;
