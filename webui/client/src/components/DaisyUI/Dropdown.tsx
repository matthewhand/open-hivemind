import React, { useState, useRef, useEffect } from 'react';

// Inline chevron icon to avoid external @heroicons dependency in tests
const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
  </svg>
);

type DropdownProps = {
  trigger: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  color?: 'primary' | 'secondary' | 'accent' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
};

const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  position = 'bottom',
  color = 'ghost',
  size = 'md',
  isOpen: controlledIsOpen,
  onToggle,
}) => {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isOpen = controlledIsOpen ?? uncontrolledIsOpen;
  const setIsOpen = onToggle ? () => onToggle(!isOpen) : setUncontrolledIsOpen;

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setIsOpen]);

  const positionClasses = {
    top: 'dropdown-top',
    bottom: 'dropdown-bottom',
    left: 'dropdown-left',
    right: 'dropdown-right',
  };

  const sizeClasses = {
    xs: 'btn-xs',
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg',
  };

  const colorClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    accent: 'btn-accent',
    ghost: 'btn-ghost',
  };

  return (
    <div className={`dropdown ${positionClasses[position]}`} ref={dropdownRef}>
      <div tabIndex={0} role="button" className={`btn ${sizeClasses[size]} ${colorClasses[color]}`} onClick={handleToggle}>
        {trigger}
        <ChevronDownIcon className="h-5 w-5" />
      </div>
      {isOpen && (
        <ul tabIndex={0} className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
          {children}
        </ul>
      )}
    </div>
  );
};

export default Dropdown;