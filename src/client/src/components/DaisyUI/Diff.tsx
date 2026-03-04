import React from 'react';
import { twMerge } from 'tailwind-merge';

/** Default aspect ratio for the diff viewer (16:9 widescreen) */
const DEFAULT_ASPECT_RATIO = 'aspect-[16/9]';

export interface DiffProps {
  /** The first item to compare (left side) */
  oldVersion: React.ReactNode;
  /** The second item to compare (right side) */
  currentVersion: React.ReactNode;
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
 *   oldVersion={<img src="img1.jpg" alt="Before" />}
 *   currentVersion={<img src="img2.jpg" alt="After" />}
 *   aspectRatio="aspect-[16/9]"
 * />
 */
const Diff: React.FC<DiffProps> = ({
  oldVersion,
  currentVersion,
  className = '',
  resizerClassName = '',
  aspectRatio = DEFAULT_ASPECT_RATIO
}) => {
  return (
    <div className={twMerge('diff', aspectRatio, className)}>
      <div className="diff-item-1">
        {oldVersion}
      </div>
      <div className="diff-item-2">
        {currentVersion}
      </div>
      <div className={twMerge('diff-resizer', resizerClassName)}></div>
    </div>
  );
};

export default Diff;
