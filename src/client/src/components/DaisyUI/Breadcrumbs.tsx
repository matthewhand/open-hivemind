import React from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

interface BreadcrumbItem {
  label: string;
  href: string;
  isActive?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <div className="text-sm breadcrumbs">
      <ul>
        <li>
          <NavLink to="/" className="inline-flex items-center gap-2">
            <HomeIcon className="w-4 h-4" />
            Home
          </NavLink>
        </li>
        {items.map((item, index) => (
          <li key={index}>
            {item.isActive ? (
              <span className="inline-flex items-center gap-2">
                <ChevronRightIcon className="w-4 h-4" />
                {item.label}
              </span>
            ) : (
              <NavLink to={item.href} className="inline-flex items-center gap-2">
                <ChevronRightIcon className="w-4 h-4" />
                {item.label}
              </NavLink>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Breadcrumbs;