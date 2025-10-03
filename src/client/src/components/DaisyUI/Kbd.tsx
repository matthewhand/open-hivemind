import React from 'react';

interface KbdProps {
  children: React.ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  'aria-label'?: string;
}

const Kbd: React.FC<KbdProps> = ({ 
  children, 
  size = 'md', 
  className = '', 
  'aria-label': ariaLabel 
}) => {
  const sizeClasses = {
    xs: 'kbd-xs',
    sm: 'kbd-sm',
    md: 'kbd-md',
    lg: 'kbd-lg',
  };

  const kbdClass = `kbd ${sizeClasses[size]} ${className}`.trim();

  return (
    <kbd 
      className={kbdClass} 
      aria-label={ariaLabel}
    >
      {children}
    </kbd>
  );
};

export default Kbd;