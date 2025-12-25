import type { ReactNode } from 'react';
import React from 'react';

// Define the props for the Card component
interface CardProps {
  /**
   * The title of the card
   */
  title?: string;
  /**
   * The subtitle of the card
   */
  subtitle?: string;
  /**
   * The body content of the card
   */
  children?: ReactNode;
  /**
    * Actions to display in the card footer
    */
  actions?: ReactNode;
  /**
   * Optional image source for the card
   */
  imageSrc?: string;
  /**
    * Alt text for the image
    */
  imageAlt?: string;
  /**
   * Whether the card has an image overlay style
   */
  imageOverlay?: boolean;
  /**
   * Whether the card is compact
   */
  compact?: boolean;
  /**
   * Whether the card is horizontal (side-by-side)
   */
  side?: boolean;
  /**
   * Whether the image takes the full width of the card
   */
  imageFull?: boolean;
  /**
   * Background color variant (e.g., 'primary', 'secondary', 'accent')
   */
  bgVariant?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'ghost' | 'card';
  /**
   * Border color variant (e.g., 'primary', 'secondary', 'accent')
   */
  borderVariant?: 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
  /**
   * Whether the card is in a loading state
   */
  loading?: boolean;
  /**
   * Content to show when the card is in an empty state
   */
  emptyState?: ReactNode;
  /**
   * Whether to show hover effect with lift and glow
   */
  hover?: boolean;
  /**
   * Glow color variant for hover effect
   */
  glowColor?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';
  /**
   * Additional CSS classes to apply to the card
   */
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

/**
 * A reusable DaisyUI Card component.
 * Supports different styles, content sections, and states.
 */
const Card: React.FC<CardProps> = ({
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
}) => {
  // Construct CSS classes based on props
  let cardClasses = 'card bg-base-100';
  if (compact) {cardClasses += ' card-compact';}
  if (side) {cardClasses += ' card-side';}
  if (imageFull) {cardClasses += ' image-full';}
  if (bgVariant) {cardClasses += ` bg-${bgVariant}`;}
  if (borderVariant) {cardClasses += ` border border-${borderVariant}`;}

  // Enhanced hover effects
  if (hover) {
    cardClasses += ' transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl';
    if (glowColor && glowMap[glowColor]) {
      cardClasses += ` ${glowMap[glowColor]}`;
    }
  }

  if (className) {cardClasses += ` ${className}`;}


  // If loading, show skeleton loaders
  if (loading) {
    return (
      <div className={cardClasses}>
        {imageSrc && !imageOverlay && (
          <figure className="skeleton h-32 w-full"></figure>
        )}
        <div className="card-body">
          <div className="skeleton h-4 w-1/3 mb-2"></div>
          <div className="skeleton h-4 w-full mb-2"></div>
          <div className="skeleton h-4 w-full mb-4"></div>
          <div className="skeleton h-8 w-1/4 ml-auto"></div>
        </div>
      </div>
    );
  }

  // If empty state content is provided, show it
  if (emptyState) {
    return (
      <div className={cardClasses}>
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

  // Otherwise, render the full card
  return (
    <div className={cardClasses}>
      {/* Image section - if imageFull, it's the background; if imageOverlay, it's part of the body; otherwise, it's a figure */}
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
        {/* Title and subtitle */}
        {(title || subtitle) && (
          <div className="card-title">
            {title && <h2>{title}</h2>}
            {subtitle && <h3>{subtitle}</h3>}
          </div>
        )}

        {/* Body content */}
        {children}

        {/* Actions */}
        {actions && <div className="card-actions justify-end">{actions}</div>}
      </div>
    </div>
  );
};

export default Card;