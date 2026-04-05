import React from 'react';
import Swap from './Swap';

interface HamburgerMenuProps {
  onClick: () => void;
  isOpen?: boolean;
  className?: string;
}

const HamburgerIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 6h16M4 12h16M4 18h16"
    />
  </svg>
);

const CloseIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  onClick,
  isOpen = false,
  className = '',
}) => {
  return (
    <div
      className={`btn btn-ghost btn-circle lg:hidden min-h-[44px] min-w-[44px] ${className}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    >
      <Swap
        checked={isOpen}
        onContent={<CloseIcon />}
        offContent={<HamburgerIcon />}
        rotate
        className="swap-active-inherit"
      />
    </div>
  );
};

export default HamburgerMenu;