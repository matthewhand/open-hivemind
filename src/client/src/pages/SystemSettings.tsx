import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

import SettingsGeneral from '../components/Settings/SettingsGeneral';
import SettingsSecurity from '../components/Settings/SettingsSecurity';
import SettingsMessaging from '../components/Settings/SettingsMessaging';
import SettingsLLM from '../components/Settings/SettingsLLM';
import Button from '../components/DaisyUI/Button';
import PageHeader from '../components/DaisyUI/PageHeader';
import Tabs from '../components/DaisyUI/Tabs';
import Card from '../components/DaisyUI/Card';
import { Cog, RotateCcw } from 'lucide-react';
import { apiService } from '../services/api';

const SystemSettings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentTab = searchParams.get('tab');

  const handleRestartWizard = async () => {
    try {
      await apiService.post('/api/onboarding/reset');
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
        <Button variant="ghost" size="sm" onClick={handleRestartWizard} className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Rerun Setup Wizard
        </Button>
      </div>

      <Card className="shadow-xl">
        <Tabs variant="lifted"
          tabs={tabs.map((tab) => ({ key: tab.id, label: tab.label }))}
          activeTab={activeTabId}
          onChange={handleTabChange}
          className="mb-6"
        />

        <div className="mt-4">
          {tabs[activeIndex].component}
        </div>
      </Card>
    </div>
  );
};

export default SystemSettings;
