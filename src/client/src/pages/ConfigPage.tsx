import React from 'react';
import Breadcrumbs from '../components/DaisyUI/Breadcrumbs';
import IntegrationsPanel from '../components/IntegrationsPanel';
import PageHeader from '../components/DaisyUI/PageHeader';
import { Plug } from 'lucide-react';
// import ComprehensiveConfigPanel from '../components/ComprehensiveConfigPanel'; // Kept for reference but unused

const ConfigPage: React.FC = () => {
  const breadcrumbItems = [
    { label: 'Admin', href: '/admin/overview' },
    { label: 'Config', href: '/admin/config', isActive: true }
  ];

  return (
    <div className="p-6">
      <Breadcrumbs items={breadcrumbItems} />

      <PageHeader
        title="Integrations & Configuration"
        description="Manage system integrations and global defaults."
        icon={Plug}
        gradient="secondary"
      />

      <div className="mt-6">
        <IntegrationsPanel />
      </div>
    </div>
  );
};

export default ConfigPage;
