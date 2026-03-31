import React from 'react';
import PropTypes from 'prop-types';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'square';
  online?: boolean;
  placeholder?: boolean;
  children?: React.ReactNode;
  className?: string;
  innerClassName?: string;
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'avatar',
  size = 'md',
  shape = 'circle',
  online,
  placeholder,
  children,
  className = '',
  innerClassName = '',
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const shapeClasses = {
    circle: 'rounded-full',
    square: 'rounded',
  };

  const defaultPlaceholderClasses = 'bg-neutral-focus text-neutral-content';

  return (
    <div
      className={`avatar ${online ? 'online' : ''} ${
        placeholder ? 'placeholder' : ''
      } ${className}`.trim()}
    >
      <div
        className={`${sizeClasses[size] || ''} ${shapeClasses[shape] || ''} ${
          innerClassName ? innerClassName : (placeholder ? defaultPlaceholderClasses : '')
        }`.trim()}
      >
        {placeholder ? (
          <span>{children}</span>
        ) : (
          <img src={src} alt={alt} />
        )}
      </div>
    </div>
  );
};

Avatar.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  shape: PropTypes.oneOf(['circle', 'square']),
  online: PropTypes.bool,
  placeholder: PropTypes.bool,
  children: PropTypes.node,
  className: PropTypes.string,
  innerClassName: PropTypes.string,
};

export default Avatar;
