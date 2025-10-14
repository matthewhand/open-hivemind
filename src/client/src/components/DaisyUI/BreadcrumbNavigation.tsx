import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { getActiveItem } from '../../config/navigation';

interface BreadcrumbItem {
  label: string;
  path: string;
  isActive: boolean;
}

const BreadcrumbNavigation: React.FC = () => {
  const location = useLocation();

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Add home
    breadcrumbs.push({
      label: 'Home',
      path: '/',
      isActive: location.pathname === '/',
    });

    // Build breadcrumb path
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Skip adding breadcrumb for 'admin' as it's the main section
      if (segment === 'admin') {
        breadcrumbs.push({
          label: 'Admin',
          path: currentPath,
          isActive: index === pathSegments.length - 1,
        });
        return;
      }

      // Format segment name
      const formattedName = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      breadcrumbs.push({
        label: formattedName,
        path: currentPath,
        isActive: index === pathSegments.length - 1,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <div className="breadcrumbs text-sm">
      <ul>
        {breadcrumbs.map((breadcrumb, index) => (
          <li key={index}>
            {breadcrumb.isActive ? (
              <span className="text-base-content/80 font-medium">
                {breadcrumb.label}
              </span>
            ) : (
              <Link 
                to={breadcrumb.path}
                className="text-base-content/60 hover:text-primary transition-colors"
              >
                {breadcrumb.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BreadcrumbNavigation;