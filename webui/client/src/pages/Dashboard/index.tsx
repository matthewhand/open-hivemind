import React from 'react';
import Dashboard from '../../components/Dashboard';
import { Breadcrumbs } from '../../components/DaisyUI';

const DashboardPage: React.FC = () => {
  const breadcrumbItems = [{ label: 'Dashboard', href: '/dashboard', isActive: true }];

  return (
    <div>
      <Breadcrumbs items={breadcrumbItems} />
      <Dashboard />
    </div>
  );
};

export default DashboardPage;
