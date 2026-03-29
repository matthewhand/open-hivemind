import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

import SettingsGeneral from '../components/Settings/SettingsGeneral';
import SettingsSecurity from '../components/Settings/SettingsSecurity';
import SettingsMessaging from '../components/Settings/SettingsMessaging';
import SettingsLLM from '../components/Settings/SettingsLLM';
import PageHeader from '../components/DaisyUI/PageHeader';
import { Cog, RotateCcw } from 'lucide-react';

const SystemSettings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentTab = searchParams.get('tab');

  const handleRestartWizard = async () => {
    try {
      await fetch('/api/onboarding/reset', { method: 'POST' });
    } catch {
      // best-effort
    }
    navigate('/onboarding');
  };


  const tabs = [
    { id: 'general', label: 'General', component: <SettingsGeneral /> },
    { id: 'messaging', label: 'Messaging', component: <SettingsMessaging /> },
    { id: 'llm', label: 'LLM', component: <SettingsLLM /> },
    { id: 'security', label: 'Security', component: <SettingsSecurity /> },
  ];

  // Determine active tab index, default to 0 (General) if not found or not specified
  const activeTabIndex = tabs.findIndex((t) => t.id === currentTab);
  const activeIndex = activeTabIndex >= 0 ? activeTabIndex : 0;
  const activeTabId = tabs[activeIndex].id;

  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId });
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Settings"
        description="Configure your Open-Hivemind instance settings and preferences"
        icon={Cog}
        gradient="primary"
      />

      <div className="flex justify-end mb-4">
        <button
          className="btn btn-ghost btn-sm gap-2 text-base-content/60 hover:text-primary"
          onClick={handleRestartWizard}
        >
          <RotateCcw className="w-4 h-4" />
          Restart Setup Wizard
        </button>
      </div>

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
            {tabs[activeIndex].component}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
