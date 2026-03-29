import React from 'react';
import { SkeletonCard, SkeletonTable, SkeletonForm } from './DaisyUI/Skeleton';

export type LoadingStateType = 'card' | 'table' | 'form';

export interface LoadingStateProps {
  type: LoadingStateType;
  count?: number;
}

/**
 * LoadingState component provides skeleton loaders for different layout types
 * Used to show loading placeholders while data is being fetched
 */
export const LoadingState: React.FC<LoadingStateProps> = ({ type, count = 3 }) => {
  switch (type) {
    case 'card':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );

    case 'table':
      return <SkeletonTable rows={count} />;

    case 'form':
      return <SkeletonForm fields={count} />;

    default:
      return null;
  }
};

export default LoadingState;
