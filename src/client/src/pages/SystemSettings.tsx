import React, { useState } from 'react';
import { Breadcrumbs } from '../components/DaisyUI';
import SettingsGeneral from '../components/Settings/SettingsGeneral';
import SettingsSecurity from '../components/Settings/SettingsSecurity';
import SettingsMessaging from '../components/Settings/SettingsMessaging';
import PageHeader from '../components/DaisyUI/PageHeader';
import { Cog } from 'lucide-react';

const SystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const breadcrumbItems = [
    { label: 'Settings', href: '/uber/settings', isActive: true },
  ];

  const tabs = [
    { label: 'General', component: <SettingsGeneral /> },
    { label: 'Messaging', component: <SettingsMessaging /> },
    { label: 'Security', component: <SettingsSecurity /> },
  ];

  return (
    <div className="p-6">
      <Breadcrumbs items={breadcrumbItems} />

      <PageHeader
        title="Settings"
        description="Configure your Open-Hivemind instance settings and preferences"
        icon={Cog}
        gradient="primary"
      />

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="tabs tabs-boxed mb-6">
            {tabs.map((tab, index) => (
              <a
                key={index}
                className={`tab ${activeTab === index ? 'tab-active' : ''}`}
                onClick={() => setActiveTab(index)}
              >
                {tab.label}
              </a>
            ))}
          </div>

          <div className="mt-4">
            {tabs[activeTab].component}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;