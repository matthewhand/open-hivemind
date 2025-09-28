import React from 'react';

interface SkeletonProps {
  /**
   * The shape of the skeleton
   */
  shape?: 'rectangle' | 'circle' | 'text';
  /**
   * Width of the skeleton (CSS value or predefined size)
   */
  width?: string | number;
  /**
   * Height of the skeleton (CSS value or predefined size)
   */
  height?: string | number;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Number of lines for text skeleton (only applies when shape is 'text')
   */
  lines?: number;
  /**
   * Whether to animate the skeleton
   */
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  shape = 'rectangle',
  width,
  height,
  className = '',
  lines = 1,
  animate = true
}) => {
  const getShapeClass = () => {
    switch (shape) {
      case 'circle':
        return 'rounded-full';
      case 'text':
        return 'rounded';
      case 'rectangle':
      default:
        return 'rounded';
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    const styles: React.CSSProperties = {};

    if (width) {
      styles.width = typeof width === 'number' ? `${width}px` : width;
    }

    if (height) {
      styles.height = typeof height === 'number' ? `${height}px` : height;
    }

    return styles;
  };

  const baseClasses = `skeleton ${getShapeClass()} ${animate ? '' : 'skeleton-static'} ${className}`;

  if (shape === 'text') {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={baseClasses}
            style={{
              ...getSizeStyles(),
              height: height || '1rem',
              width: width || (index === lines - 1 && lines > 1 ? '66.67%' : '100%')
            }}
            aria-hidden="true"
            role="presentation"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={baseClasses}
      style={getSizeStyles()}
      aria-hidden="true"
      role="presentation"
    />
  );
};

// Predefined skeleton variants for common use cases
export const SkeletonText: React.FC<Omit<SkeletonProps, 'shape'> & { lines?: number }> = (props) => (
  <Skeleton {...props} shape="text" />
);

export const SkeletonCircle: React.FC<Omit<SkeletonProps, 'shape'>> = (props) => (
  <Skeleton {...props} shape="circle" />
);

export const SkeletonRectangle: React.FC<Omit<SkeletonProps, 'shape'>> = (props) => (
  <Skeleton {...props} shape="rectangle" />
);

// Complex skeleton layouts
interface SkeletonCardProps {
  className?: string;
  animate?: boolean;
  showImage?: boolean;
  showActions?: boolean;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  className = '',
  animate = true,
  showImage = true,
  showActions = true
}) => (
  <div className={`card bg-base-100 shadow-xl ${className}`}>
    {showImage && (
      <figure>
        <SkeletonRectangle width="100%" height="8rem" animate={animate} />
      </figure>
    )}
    <div className="card-body">
      <SkeletonText lines={1} width="75%" animate={animate} className="mb-2" />
      <SkeletonText lines={3} animate={animate} className="mb-4" />
      {showActions && (
        <div className="card-actions justify-end">
          <SkeletonRectangle width="5rem" height="2.5rem" animate={animate} />
          <SkeletonRectangle width="6rem" height="2.5rem" animate={animate} />
        </div>
      )}
    </div>
  </div>
);

interface SkeletonListProps {
  items?: number;
  className?: string;
  animate?: boolean;
  showAvatar?: boolean;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  items = 5,
  className = '',
  animate = true,
  showAvatar = false
}) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-4">
        {showAvatar && (
          <SkeletonCircle width="3rem" height="3rem" animate={animate} />
        )}
        <div className="flex-1 space-y-2">
          <SkeletonText lines={1} width="60%" animate={animate} />
          <SkeletonText lines={1} width="80%" animate={animate} />
        </div>
      </div>
    ))}
  </div>
);

export { SkeletonCard, SkeletonList };
export default Skeleton;