import React, { useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ResponsiveNavigation from '../components/DaisyUI/ResponsiveNavigation';
import { hivemindNavItems, NavItem } from '../config/navigation';
import { useHealthBadges } from '../hooks/useHealthBadges';

const UberLayout: React.FC = () => {
  const location = useLocation();
  const { monitoringBadge } = useHealthBadges();

  // Inject dynamic badges into nav items
  const navItemsWithBadges: NavItem[] = useMemo(() => {
    return hivemindNavItems.map(item => {
      // Add status badge to Monitoring item if there are issues
      if (item.id === 'monitoring' && monitoringBadge) {
        return { ...item, badge: monitoringBadge };
      }
      return item;
    });
  }, [monitoringBadge]);

  return (
    <ResponsiveNavigation navItems={navItemsWithBadges}>
      <div key={location.pathname}>
        <Outlet />
      </div>
    </ResponsiveNavigation>
  );
};

export default UberLayout;