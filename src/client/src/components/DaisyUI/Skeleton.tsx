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
  animate = true,
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
              width: width || (index === lines - 1 && lines > 1 ? '66.67%' : '100%'),
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

// Alias for Avatar usage
export const SkeletonAvatar: React.FC<Omit<SkeletonProps, 'shape'>> = (props) => (
  <Skeleton {...props} shape="circle" />
);

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
  showActions = true,
}) => (
  <div className={`card bg-base-100 shadow-xl ${className}`}>
    {showImage && (
      <figure className="px-4 pt-4">
        <SkeletonRectangle width="100%" height="8rem" animate={animate} className="rounded-xl" />
      </figure>
    )}
    <div className="card-body">
      <SkeletonText lines={1} width="75%" animate={animate} className="mb-2 h-4" />
      <SkeletonText lines={3} animate={animate} className="mb-4 h-3" />
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
  showAvatar = false,
}) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-4">
        {showAvatar && (
          <SkeletonCircle width="3rem" height="3rem" animate={animate} className="shrink-0" />
        )}
        <div className="flex-1 space-y-2">
          <SkeletonText lines={1} width="60%" animate={animate} className="h-4" />
          <SkeletonText lines={1} width="80%" animate={animate} className="h-4" />
        </div>
      </div>
    ))}
  </div>
);

// Skeleton table for data-heavy pages
interface SkeletonTableLayoutProps {
  rows?: number;
  columns?: number;
  className?: string;
  animate?: boolean;
}

export const SkeletonTableLayout: React.FC<SkeletonTableLayoutProps> = ({
  rows = 5,
  columns = 4,
  className = '',
  animate = true,
}) => (
  <div className={`overflow-x-auto ${className}`}>
    <table className="table">
      <thead>
        <tr>
          {Array.from({ length: columns }).map((_, i) => (
            <th key={i}>
              <SkeletonRectangle width="6rem" height="1rem" animate={animate} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <tr key={rowIdx}>
            {Array.from({ length: columns }).map((_, colIdx) => (
              <td key={colIdx}>
                <SkeletonRectangle width="8rem" height="1rem" animate={animate} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Skeleton grid of cards (e.g. BotsPage)
interface SkeletonGridProps {
  count?: number;
  columns?: string;
  className?: string;
  animate?: boolean;
  showImage?: boolean;
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({
  count = 6,
  columns = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  className = '',
  animate = true,
  showImage = false,
}) => (
  <div className={`grid ${columns} gap-6 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} animate={animate} showImage={showImage} showActions={true} />
    ))}
  </div>
);

// Skeleton timeline for activity feeds
interface SkeletonTimelineProps {
  items?: number;
  className?: string;
  animate?: boolean;
}

export const SkeletonTimeline: React.FC<SkeletonTimelineProps> = ({
  items = 6,
  className = '',
  animate = true,
}) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex gap-4">
        <div className="flex flex-col items-center">
          <SkeletonCircle width="2.5rem" height="2.5rem" animate={animate} />
          {i < items - 1 && <div className="skeleton w-0.5 flex-1 mt-2" />}
        </div>
        <div className="flex-1 pb-4">
          <SkeletonRectangle width="40%" height="1rem" animate={animate} className="mb-2" />
          <SkeletonText lines={2} animate={animate} className="h-3" />
        </div>
      </div>
    ))}
  </div>
);

// Skeleton for chat message list
interface SkeletonMessageListProps {
  messages?: number;
  className?: string;
  animate?: boolean;
}

export const SkeletonMessageList: React.FC<SkeletonMessageListProps> = ({
  messages = 5,
  className = '',
  animate = true,
}) => (
  <div className={`space-y-6 p-4 ${className}`}>
    {Array.from({ length: messages }).map((_, i) => {
      const isUser = i % 2 === 0;
      return (
        <div key={i} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
          {!isUser && <SkeletonCircle width="2rem" height="2rem" animate={animate} className="shrink-0" />}
          <div className={`space-y-2 ${isUser ? 'items-end' : 'items-start'} max-w-[60%]`}>
            <SkeletonRectangle width="100%" height={isUser ? '2.5rem' : '4rem'} animate={animate} className="rounded-2xl" />
          </div>
          {isUser && <SkeletonCircle width="2rem" height="2rem" animate={animate} className="shrink-0" />}
        </div>
      );
    })}
  </div>
);

// Stats cards skeleton (matches StatsCards layout)
interface SkeletonStatsCardsProps {
  count?: number;
  className?: string;
  animate?: boolean;
}

export const SkeletonStatsCards: React.FC<SkeletonStatsCardsProps> = ({
  count = 4,
  className = '',
  animate = true,
}) => (
  <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="card bg-base-100 shadow-sm p-4">
        <SkeletonRectangle width="3rem" height="0.75rem" animate={animate} className="mb-2" />
        <SkeletonRectangle width="4rem" height="1.5rem" animate={animate} className="mb-1" />
        <SkeletonRectangle width="5rem" height="0.625rem" animate={animate} />
      </div>
    ))}
  </div>
);

// Full-page skeleton combining header + stats + content area
interface SkeletonPageProps {
  /** Type of content skeleton to show */
  variant?: 'cards' | 'table' | 'list' | 'timeline';
  /** Number of stats cards */
  statsCount?: number;
  /** Show search/filter bar skeleton */
  showFilters?: boolean;
  className?: string;
  animate?: boolean;
}

export const SkeletonPage: React.FC<SkeletonPageProps> = ({
  variant = 'table',
  statsCount = 4,
  showFilters = true,
  className = '',
  animate = true,
}) => (
  <div className={`space-y-6 ${className}`} role="status" aria-label="Loading page content">
    {/* Header skeleton */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <SkeletonRectangle width="12rem" height="1.75rem" animate={animate} />
        <SkeletonRectangle width="20rem" height="1rem" animate={animate} />
      </div>
      <div className="flex gap-2">
        <SkeletonRectangle width="5rem" height="2.5rem" animate={animate} />
        <SkeletonRectangle width="7rem" height="2.5rem" animate={animate} />
      </div>
    </div>

    {/* Stats skeleton */}
    {statsCount > 0 && <SkeletonStatsCards count={statsCount} animate={animate} />}

    {/* Filter bar skeleton */}
    {showFilters && (
      <div className="flex gap-3 items-center">
        <SkeletonRectangle width="16rem" height="2.5rem" animate={animate} />
        <SkeletonRectangle width="8rem" height="2.5rem" animate={animate} />
      </div>
    )}

    {/* Content skeleton */}
    {variant === 'cards' && <SkeletonGrid count={6} animate={animate} />}
    {variant === 'table' && <SkeletonTableLayout rows={8} columns={5} animate={animate} />}
    {variant === 'list' && <SkeletonList items={8} showAvatar animate={animate} />}
    {variant === 'timeline' && <SkeletonTimeline items={6} animate={animate} />}
  </div>
);

export default Skeleton;
