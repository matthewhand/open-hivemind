import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

import SettingsGeneral from '../components/Settings/SettingsGeneral';
import SettingsSecurity from '../components/Settings/SettingsSecurity';
import Button from '../components/DaisyUI/Button';
import { Alert } from '../components/DaisyUI/Alert';
import PageHeader from '../components/DaisyUI/PageHeader';
import Tabs from '../components/DaisyUI/Tabs';
import Card from '../components/DaisyUI/Card';
import { Cog, RotateCw, Info } from 'lucide-react';
import { apiService } from '../services/api';

const SystemSettings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentTab = searchParams.get('tab');

  // Detect stale deep-links from old Settings page tabs
  const staleRedirects = currentTab === 'llm' || currentTab === 'messaging';

  const handleRestartWizard = async () => {
    try {
      await apiService.post('/api/onboarding/reset');
    } catch {
      // best-effort
    }
    navigate('/onboarding');
  };

  // LLM and Messaging settings live in their respective provider pages
  // (LLM > Settings, Messaging > Settings) to avoid duplication.
  // Settings page only covers cross-cutting concerns.
  const tabs = [
    { id: 'general', label: 'General', component: <SettingsGeneral /> },
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
    <div className="p-6 space-y-4">
      <PageHeader
        title="Settings"
        description="Configure your Open-Hivemind instance settings and preferences"
        icon={Cog}
        gradient="primary"
      />

      {/* Stale deep-link redirect banner */}
      {staleRedirects && (
        <Alert status="info" icon={<Info className="w-5 h-5" />}>
          <div className="flex-1">
            <strong>Provider settings moved</strong> — LLM settings are now under{' '}
            <button className="link link-primary" onClick={() => navigate('/admin/llm?tab=settings')}>LLM &gt; Settings</button>.
            Messaging settings are under{' '}
            <button className="link link-primary" onClick={() => navigate('/admin/message?tab=settings')}>Messaging &gt; Settings</button>.
          </div>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={handleRestartWizard} className="gap-2">
          <RotateCw className="w-4 h-4" />
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
