/**
 * Collapse Component - DaisyUI collapsible content container
 */

import React, { useState } from 'react';

interface CollapseProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'arrow' | 'plus';
}

const Collapse: React.FC<CollapseProps> = ({
  title,
  children,
  defaultOpen = false,
  className = '',
  icon,
  variant = 'default'
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const getVariantClasses = () => {
    switch (variant) {
      case 'arrow':
        return 'collapse-arrow';
      case 'plus':
        return 'collapse-plus';
      default:
        return '';
    }
  };

  return (
    <div className={`collapse bg-base-200 ${getVariantClasses()} ${className}`}>
      <input
        type="checkbox"
        checked={isOpen}
        onChange={(e) => setIsOpen(e.target.checked)}
        className="collapse-checkbox"
      />
      <div className="collapse-title text-xl font-medium flex items-center gap-2">
        {icon && <span>{icon}</span>}
        {title}
      </div>
      <div className="collapse-content">
        {children}
      </div>
    </div>
  );
};

export default Collapse;