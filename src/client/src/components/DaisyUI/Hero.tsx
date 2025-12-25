import React from 'react';

export interface HeroProps {
  /** Hero style variant */
  variant?: 'normal' | 'overlay' | 'content';
  /** Background color class */
  bgColor?: string;
  /** Background image URL */
  bgImage?: string;
  /** Title text */
  title?: string;
  /** Subtitle text */
  subtitle?: string;
  /** Content alignment */
  alignment?: 'center' | 'left';
  /** Show gradient overlay */
  gradient?: boolean;
  /** Custom CSS classes */
  className?: string;
  /** Children components */
  children?: React.ReactNode;
  /** Call-to-action buttons or content */
  actions?: React.ReactNode;
  /** Minimum height */
  minHeight?: 'screen' | 'lg' | 'md' | 'sm';
  /** Text color for title */
  titleColor?: string;
  /** Text color for subtitle */
  subtitleColor?: string;
  /** ARIA label for accessibility */
  'aria-label'?: string;
  /** Test ID for testing */
  'data-testid'?: string;
}

export const Hero: React.FC<HeroProps> = ({
  variant = 'normal',
  bgColor = 'bg-base-200',
  bgImage,
  title,
  subtitle,
  alignment = 'center',
  gradient = false,
  className = '',
  children,
  actions,
  minHeight = 'lg',
  titleColor = 'text-primary',
  subtitleColor = 'text-base-content',
  'aria-label': ariaLabel,
  'data-testid': testId,
}) => {
  const getHeroClasses = () => {
    const baseClasses = ['hero'];
    
    // Add minimum height
    switch (minHeight) {
    case 'screen':
      baseClasses.push('min-h-screen');
      break;
    case 'lg':
      baseClasses.push('min-h-96');
      break;
    case 'md':
      baseClasses.push('min-h-64');
      break;
    case 'sm':
      baseClasses.push('min-h-32');
      break;
    }

    // Add background color if no image
    if (!bgImage) {
      baseClasses.push(bgColor);
    }

    return baseClasses.join(' ');
  };

  const getContentClasses = () => {
    const contentClasses = ['hero-content'];
    
    // Add alignment
    if (alignment === 'center') {
      contentClasses.push('text-center');
    } else {
      contentClasses.push('text-left');
    }

    // Add variant-specific classes
    if (variant === 'content') {
      contentClasses.push('flex-col', 'lg:flex-row');
    }

    return contentClasses.join(' ');
  };

  const heroStyle: React.CSSProperties = bgImage
    ? {
      backgroundImage: `url(${bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }
    : {};

  const renderOverlay = () => {
    if (variant === 'overlay' || gradient) {
      return (
        <div 
          className="hero-overlay bg-opacity-60"
          aria-hidden="true"
        />
      );
    }
    return null;
  };

  const renderContent = () => {
    if (children) {
      return (
        <div className={getContentClasses()}>
          {children}
        </div>
      );
    }

    return (
      <div className={getContentClasses()}>
        <div className="max-w-md">
          {title && (
            <h1 
              className={`text-5xl font-bold ${titleColor}`}
              data-testid={testId ? `${testId}-title` : undefined}
            >
              {title}
            </h1>
          )}
          {subtitle && (
            <p 
              className={`py-6 ${subtitleColor}`}
              data-testid={testId ? `${testId}-subtitle` : undefined}
            >
              {subtitle}
            </p>
          )}
          {actions && (
            <div 
              className="mt-6"
              data-testid={testId ? `${testId}-actions` : undefined}
            >
              {actions}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`${getHeroClasses()} ${className}`}
      style={heroStyle}
      aria-label={ariaLabel}
      data-testid={testId}
      role="banner"
    >
      {renderOverlay()}
      {renderContent()}
    </div>
  );
};

export default Hero;