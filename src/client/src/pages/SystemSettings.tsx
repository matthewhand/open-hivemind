import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/DaisyUI';
import SettingsGeneral from '../components/Settings/SettingsGeneral';
import SettingsSecurity from '../components/Settings/SettingsSecurity';
import SettingsMessaging from '../components/Settings/SettingsMessaging';
import PageHeader from '../components/DaisyUI/PageHeader';
import { Cog } from 'lucide-react';

const SystemSettings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTabId = searchParams.get('tab');

  const tabs = [
    { id: 'general', label: 'General', component: <SettingsGeneral /> },
    { id: 'messaging', label: 'Messaging', component: <SettingsMessaging /> },
    { id: 'security', label: 'Security', component: <SettingsSecurity /> },
  ];

  const activeTabId = tabs.find(t => t.id === rawTabId) ? rawTabId : 'general';
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const breadcrumbItems = [
    { label: 'Settings', href: '/admin/settings', isActive: true },
  ];

  const handleTabChange = (id: string) => {
    setSearchParams({ tab: id });
  };

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
            {tabs.map((tab) => (
              <a
                key={tab.id}
                className={`tab ${activeTabId === tab.id ? 'tab-active' : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
              </a>
            ))}
          </div>

          <div className="mt-4">
            {activeTab.component}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
