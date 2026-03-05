import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import GlobalConfigSection from '../components/GlobalConfigSection';
import Breadcrumbs from '../components/DaisyUI/Breadcrumbs';

const IntegrationsPage: React.FC = () => {
  const { type } = useParams<{ type: string }>();

  if (!type) {
    return <Navigate to="/admin/settings" replace />;
  }

  const breadcrumbItems = [
    { label: 'Admin', href: '/admin/overview' },
    { label: 'General', href: '/admin/settings' },
    { label: type.charAt(0).toUpperCase() + type.slice(1), href: `/admin/integrations/${type}`, isActive: true },
  ];

  return (
    <div className="p-6">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="mt-6">
        <GlobalConfigSection section={type} />
      </div>
    </div>
  );
};

export default IntegrationsPage;
