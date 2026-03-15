import type { ReactNode } from 'react';
import React from 'react';
import { SkeletonRectangle, SkeletonText } from './Skeleton';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  actions?: ReactNode;
  imageSrc?: string;
  imageAlt?: string;
  imageOverlay?: boolean;
  compact?: boolean;
  side?: boolean;
  imageFull?: boolean;
  bgVariant?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'ghost' | 'card';
  borderVariant?: 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
  loading?: boolean;
  emptyState?: ReactNode;
  hover?: boolean;
  glowColor?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';
  className?: string;
}

const glowMap = {
  primary: 'hover:shadow-primary/20',
  secondary: 'hover:shadow-secondary/20',
  accent: 'hover:shadow-accent/20',
  success: 'hover:shadow-success/20',
  warning: 'hover:shadow-warning/20',
  error: 'hover:shadow-error/20',
};

interface CardBodyProps {
  children?: ReactNode;
  className?: string;
}

interface CardTitleProps {
  children?: ReactNode;
  className?: string;
  tag?: 'h2' | 'h3' | 'div' | 'span' | 'h4' | 'h5' | 'h6';
}

interface CardActionsProps {
  children?: ReactNode;
  className?: string;
}

const CardBody: React.FC<CardBodyProps> = ({ children, className = '' }) => {
  if (className) {
    return <div className={className}>{children}</div>;
  }
  return <>{children}</>;
};
CardBody.displayName = 'Card.Body';

const CardTitle: React.FC<CardTitleProps> = ({ children, className = '', tag: Tag = 'h2' }) => {
  return <Tag className={`card-title ${className}`}>{children}</Tag>;
};
CardTitle.displayName = 'Card.Title';

const CardActions: React.FC<CardActionsProps> = ({ children, className = '' }) => {
  return <div className={`card-actions justify-end ${className}`}>{children}</div>;
};
CardActions.displayName = 'Card.Actions';

const CardBase: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  actions,
  imageSrc,
  imageAlt = 'Card image',
  imageOverlay = false,
  compact = false,
  side = false,
  imageFull = false,
  bgVariant,
  borderVariant,
  loading = false,
  emptyState,
  hover = false,
  glowColor,
  className = '',
  ...props
}) => {
  let cardClasses = 'card bg-base-100';
  if (compact) { cardClasses += ' card-compact'; }
  if (side) { cardClasses += ' card-side'; }
  if (imageFull) { cardClasses += ' image-full'; }
  if (bgVariant) { cardClasses += ` bg-${bgVariant}`; }
  if (borderVariant) { cardClasses += ` border border-${borderVariant}`; }

  if (hover) {
    cardClasses += ' transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl';
    if (glowColor && glowMap[glowColor]) {
      cardClasses += ` ${glowMap[glowColor]}`;
    }
  }

  if (className) { cardClasses += ` ${className}`; }

  if (loading) {
    return (
      <div className={cardClasses} {...props}>
        {imageSrc && !imageOverlay && (
          <SkeletonRectangle height="8rem" width="100%" className="rounded-b-none" />
        )}
        <div className="card-body">
          <SkeletonText lines={1} height="1rem" width="33.333%" className="mb-2" />
          <SkeletonText lines={1} height="1rem" width="100%" className="mb-2" />
          <SkeletonText lines={1} height="1rem" width="100%" className="mb-4" />
          <SkeletonRectangle height="2rem" width="25%" className="ml-auto" />
        </div>
      </div>
    );
  }

  if (emptyState) {
    return (
      <div className={cardClasses} {...props}>
        {imageSrc && !imageOverlay && (
          <figure>
            <img src={imageSrc} alt={imageAlt} />
          </figure>
        )}
        <div className="card-body">
          {emptyState}
        </div>
      </div>
    );
  }

  return (
    <div className={cardClasses} {...props}>
      {imageSrc && imageFull && (
        <figure>
          <img src={imageSrc} alt={imageAlt} />
        </figure>
      )}
      {imageSrc && imageOverlay && (
        <figure className="absolute inset-0 z-0">
          <img src={imageSrc} alt={imageAlt} className="w-full h-full object-cover" />
        </figure>
      )}
      {imageSrc && !imageFull && !imageOverlay && (
        <figure>
          <img src={imageSrc} alt={imageAlt} />
        </figure>
      )}

      <div className="card-body relative z-10">
        {(title || subtitle) && (
          <div className="card-title">
            {title && <h2>{title}</h2>}
            {subtitle && <h3>{subtitle}</h3>}
          </div>
        )}

        {children}

        {actions && <div className="card-actions justify-end">{actions}</div>}
      </div>
    </div>
  );
};

const Card = CardBase as React.FC<CardProps> & {
  Body: typeof CardBody;
  Title: typeof CardTitle;
  Actions: typeof CardActions;
};

Card.Body = CardBody;
Card.Title = CardTitle;
Card.Actions = CardActions;

export default Card;
