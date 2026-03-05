import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/solid';

interface BreadcrumbItem {
  label: string;
  href: string;
  isActive?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  const location = useLocation();
  const canonicalUrl = `${window.location.origin}${location.pathname}`;

  // Build schema.org BreadcrumbList structured data
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: window.location.origin,
      },
      ...items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 2,
        name: item.label,
        item: item.isActive ? canonicalUrl : `${window.location.origin}${item.href}`,
      })),
    ],
  };

  return (
    <>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>
      <nav className="text-sm breadcrumbs" aria-label="Breadcrumb">
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
              <span className="inline-flex items-center gap-2" aria-current="page">
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
    </nav>
    </>
  );
};

export default Breadcrumbs;
