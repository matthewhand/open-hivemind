import React from 'react';
import { LoadingSpinner } from './DaisyUI';

interface LoadingSpinnerComponentProps {
  message?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

const LoadingSpinnerComponent: React.FC<LoadingSpinnerComponentProps> = ({
  message = 'Loading...',
  size = 'md',
  fullScreen = false
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4 p-6">
      <LoadingSpinner color="primary" size={size} />
      {message && (
        <p className="text-sm text-base-content/70">
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinnerComponent;