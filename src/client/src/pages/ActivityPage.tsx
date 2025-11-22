import React from 'react';
import { Breadcrumbs } from '../components/DaisyUI';
import ActivityMonitor from '../components/ActivityMonitor';

const ActivityPage: React.FC = () => {
  const breadcrumbItems = [
    { label: 'Activity Monitor', href: '/admin/activity', isActive: true }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">
          Activity Monitor
        </h1>
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      <ActivityMonitor showPopoutButton={true} />
    </div>
  );
};

export default ActivityPage;