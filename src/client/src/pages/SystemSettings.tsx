import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/DaisyUI';
import SettingsGeneral from '../components/Settings/SettingsGeneral';
import SettingsSecurity from '../components/Settings/SettingsSecurity';
import SettingsMessaging from '../components/Settings/SettingsMessaging';
import PageHeader from '../components/DaisyUI/PageHeader';
import { Cog } from 'lucide-react';

const SystemSettings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'general';

  const breadcrumbItems = [
    { label: 'Settings', href: '/admin/settings', isActive: true },
  ];

  const tabs = useMemo(() => [
    { id: 'general', label: 'General', component: <SettingsGeneral /> },
    { id: 'messaging', label: 'Messaging', component: <SettingsMessaging /> },
    { id: 'security', label: 'Security', component: <SettingsSecurity /> },
  ], []);

  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId });
  };

  const activeTabComponent = tabs.find(t => t.id === currentTab)?.component || <SettingsGeneral />;

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
                className={`tab ${currentTab === tab.id ? 'tab-active' : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
              </a>
            ))}
          </div>

          <div className="mt-4">
            {activeTabComponent}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
