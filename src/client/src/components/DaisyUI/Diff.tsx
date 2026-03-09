import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface DiffProps {
  /** The first item to compare (left side) */
  item1: React.ReactNode;
  /** The second item to compare (right side) */
  item2: React.ReactNode;
  /** Additional CSS classes for the container */
  className?: string;
  /** Additional CSS classes for the resizer handle */
  resizerClassName?: string;
  /** Aspect ratio of the diff container (e.g. aspect-[16/9]) */
  aspectRatio?: string;
}

/**
 * DaisyUI Diff Component
 *
 * A component to compare two items by sliding one over the other.
 *
 * @example
 * <Diff
 *   item1={<img src="img1.jpg" alt="Before" />}
 *   item2={<img src="img2.jpg" alt="After" />}
 *   aspectRatio="aspect-[16/9]"
 * />
 */
const Diff: React.FC<DiffProps> = ({
  item1,
  item2,
  className = '',
  resizerClassName = '',
  aspectRatio = 'aspect-[16/9]'
}) => {
  return (
    <div className={twMerge('diff', aspectRatio, className)}>
      <div className="diff-item-1">
        {item1}
      </div>
      <div className="diff-item-2">
        {item2}
      </div>
      <div className={twMerge('diff-resizer', resizerClassName)}></div>
    </div>
  );
};

export default Diff;
