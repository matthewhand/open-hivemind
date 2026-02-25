import React, { useState, useEffect } from 'react';
import { Breadcrumbs } from '../components/DaisyUI';
import SettingsGeneral from '../components/Settings/SettingsGeneral';
import SettingsSecurity from '../components/Settings/SettingsSecurity';
import SettingsMessaging from '../components/Settings/SettingsMessaging';
import PageHeader from '../components/DaisyUI/PageHeader';
import StatsCards from '../components/DaisyUI/StatsCards';
import { Cog, MessageSquare, Shield, Activity, Server, Clock } from 'lucide-react';
import { apiService } from '../services/api';

const SystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  const breadcrumbItems = [
    { label: 'Settings', href: '/admin/settings', isActive: true },
  ];

  const tabs = [
    { label: 'General', icon: Cog, component: <SettingsGeneral /> },
    { label: 'Messaging', icon: MessageSquare, component: <SettingsMessaging /> },
    { label: 'Security', icon: Shield, component: <SettingsSecurity /> },
  ];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true);
        // Fetch real status
        const status = await apiService.getStatus();

        // Construct stats for the cards
        const newStats = [
          {
            id: 'uptime',
            title: 'System Uptime',
            value: formatUptime(status.uptime || 0),
            icon: <Clock className="w-8 h-8" />,
            color: 'primary' as const,
          },
          {
            id: 'active-bots',
            title: 'Active Bots',
            value: status.bots?.filter((b: any) => b.status === 'active').length || 0,
            icon: <Activity className="w-8 h-8" />,
            color: 'success' as const,
          },
          {
            id: 'providers',
            title: 'Providers',
            value: new Set(status.bots?.map((b: any) => b.provider)).size || 0,
            icon: <Server className="w-8 h-8" />,
            color: 'info' as const,
          }
        ];

        setStats(newStats);
      } catch (err) {
        console.error('Failed to fetch system stats:', err);
        // Fallback to simple stats if API fails
        setStats([
            { id: 'err', title: 'System Status', value: 'Unknown', icon: <Activity className="w-8 h-8" />, color: 'neutral' as const }
        ]);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  const formatUptime = (seconds: number) => {
    if (!seconds) return '0s';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="p-6 space-y-6">
      <Breadcrumbs items={breadcrumbItems} />

      <PageHeader
        title="Settings"
        description="Configure your Open-Hivemind instance settings and preferences"
        icon={Cog}
        gradient="primary"
      />

      <StatsCards stats={stats} isLoading={loadingStats} />

      <div className="card bg-base-100 shadow-xl border border-base-300">
        <div className="card-body p-0">
            {/* Custom Tab Header */}
            <div className="border-b border-base-200 bg-base-200/30 rounded-t-xl px-4 pt-4">
                <div className="tabs tabs-lifted">
                    {tabs.map((tab, index) => (
                    <a
                        key={index}
                        role="tab"
                        className={`tab tab-lg gap-2 ${activeTab === index ? 'tab-active font-bold' : ''}`}
                        onClick={() => setActiveTab(index)}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </a>
                    ))}
                </div>
            </div>

          <div className="p-6 bg-base-100 rounded-b-xl min-h-[400px]">
            {tabs[activeTab].component}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
