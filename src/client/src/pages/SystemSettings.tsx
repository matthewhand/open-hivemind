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
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Settings"
        description="Configure your Open-Hivemind instance settings and preferences"
        icon={Cog}
        gradient="primary"
      />

      <div className="flex justify-end mb-3 md:mb-4">
        <button
          className="btn btn-ghost btn-sm gap-2 text-base-content/60 hover:text-primary min-h-[44px]"
          onClick={handleRestartWizard}
        >
          <RotateCcw className="w-4 h-4" />
          <span className="hidden sm:inline">Restart Setup Wizard</span>
          <span className="sm:hidden">Setup Wizard</span>
        </button>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body p-3 sm:p-4 md:p-6">
          {/* Mobile: Dropdown, Desktop: Tabs */}
          <div className="hidden sm:block">
            <div className="tabs tabs-boxed mb-4 md:mb-6 flex-wrap gap-1">
              {tabs.map((tab) => (
                <a
                  key={tab.id}
                  className={`tab min-h-[44px] ${activeTabId === tab.id ? 'tab-active' : ''}`}
                  onClick={() => handleTabChange(tab.id)}
                >
                  {tab.label}
                </a>
              ))}
            </div>
          </div>

          {/* Mobile dropdown */}
          <div className="sm:hidden mb-4">
            <select
              className="select select-bordered w-full min-h-[44px]"
              value={activeTabId}
              onChange={(e) => handleTabChange(e.target.value)}
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2 sm:mt-4">
            {tabs[activeIndex].component}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
