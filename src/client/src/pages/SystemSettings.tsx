import React, { useState } from 'react';
import { Breadcrumbs } from '../components/DaisyUI';
import SettingsGeneral from '../components/Settings/SettingsGeneral';
import SettingsSecurity from '../components/Settings/SettingsSecurity';

const SystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const breadcrumbItems = [
    { label: 'Settings', href: '/uber/settings', isActive: true }
  ];

  const tabs = [
    { label: 'General', component: <SettingsGeneral /> },
    { label: 'Security', component: <SettingsSecurity /> }
  ];

  return (
    <div className="p-6">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-4 mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Settings
        </h1>
        <p className="text-base-content/70">
          Configure your Open-Hivemind instance settings and preferences
        </p>
      </div>

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