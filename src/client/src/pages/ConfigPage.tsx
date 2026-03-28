import React from 'react';

import IntegrationsPanel from '../components/IntegrationsPanel';
import PageHeader from '../components/DaisyUI/PageHeader';
import { Plug } from 'lucide-react';

const ConfigPage: React.FC = () => {
  return (
    <div className="p-6">
      <PageHeader
        title="Integrations & Configuration"
        description="Manage system integrations and global defaults."
        icon={<Plug className="w-8 h-8" />}
        gradient="secondary"
      />

      <div className="mt-6">
        <IntegrationsPanel />
      </div>
    </div>
  );
};

export default ConfigPage;
