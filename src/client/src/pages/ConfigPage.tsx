import React from 'react';
import Breadcrumbs from '../components/DaisyUI/Breadcrumbs';
import IntegrationsPanel from '../components/IntegrationsPanel';
import PageHeader from '../components/DaisyUI/PageHeader';
import { Plug } from 'lucide-react';

const ConfigPage: React.FC = () => {
  const breadcrumbItems = [
    { label: 'Admin', href: '/admin/overview' },
    { label: 'Config', href: '/admin/config', isActive: true },
  ];

  return (
    <div className="p-6">
      <Breadcrumbs items={breadcrumbItems} />

      <PageHeader
        title="Integrations & Configuration"
        description="Manage system integrations and global defaults."
<<<<<<< HEAD
        icon={<Plug className="w-6 h-6" />}
=======
        icon={Plug}
>>>>>>> origin/jules-responsive-layout-consistency-5760872167389438897
        gradient="secondary"
      />

      <div className="mt-6">
        <IntegrationsPanel />
      </div>
    </div>
  );
};

export default ConfigPage;
