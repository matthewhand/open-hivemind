import React from 'react';
import Breadcrumbs from '../components/DaisyUI/Breadcrumbs';
import IntegrationsPanel from '../components/IntegrationsPanel';
// import ComprehensiveConfigPanel from '../components/ComprehensiveConfigPanel'; // Kept for reference but unused

const ConfigPage: React.FC = () => {
  const breadcrumbItems = [
    { label: 'Admin', href: '/admin/overview' },
    { label: 'Config', href: '/admin/config', isActive: true }
  ];

  return (
    <div className="p-6">
      <Breadcrumbs items={breadcrumbItems} />
      
      <div className="mt-4 mb-8">
        <h1 className="text-3xl font-bold mb-2">Integrations & Configuration</h1>
        <p className="text-base-content/70">
          Manage system integrations and global defaults.
        </p>
      </div>

      <div className="mt-6">
        <IntegrationsPanel />
      </div>
    </div>
  );
};

export default ConfigPage;
