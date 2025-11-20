import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Tabs, Loading } from '../components/DaisyUI';
import {
  BuildingOfficeIcon,
  CloudIcon,
  LinkIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';

interface EnterpriseMetric {
  id: string;
  name: string;
  value: number;
  status: 'normal' | 'warning' | 'critical';
}

const EnterpriseManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [metrics] = useState<EnterpriseMetric[]>([
    { id: '1', name: 'Compliance Score', value: 95, status: 'normal' },
    { id: '2', name: 'Cloud Resources', value: 12, status: 'normal' },
    { id: '3', name: 'Integrations', value: 8, status: 'normal' },
    { id: '4', name: 'Security Score', value: 88, status: 'warning' },
  ]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await apiService.get('/enterprise/overview');
      } catch (error) {
        console.error('Failed to load enterprise data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loading.Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card className="shadow-xl border-l-4 border-primary">
        <div className="p-6">
          <div className="flex items-center gap-4">
            <BuildingOfficeIcon className="w-8 h-8 text-primary" />
            <div>
              <h2 className="text-2xl font-bold">Enterprise Management</h2>
              <p className="text-sm opacity-70">Compliance, Cloud, Integrations & Monitoring</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {metrics.map(metric => (
          <Card key={metric.id} className="shadow-xl">
            <div className="p-6 text-center">
              <h3 className="text-4xl font-bold mb-2">{metric.value}</h3>
              <p className="text-sm opacity-70 mb-4">{metric.name}</p>
              {metric.status === 'normal' ? (
                <CheckCircleIcon className="w-8 h-8 mx-auto text-success" />
              ) : (
                <ExclamationTriangleIcon className="w-8 h-8 mx-auto text-warning" />
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { label: 'Compliance', icon: <CheckCircleIcon className="w-4 h-4" /> },
          { label: 'Cloud Providers', icon: <CloudIcon className="w-4 h-4" /> },
          { label: 'Integrations', icon: <LinkIcon className="w-4 h-4" /> },
          { label: 'Performance', icon: <ChartBarIcon className="w-4 h-4" /> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab Content */}
      <Card className="shadow-xl">
        <div className="p-6">
          {activeTab === 0 && (
            <div>
              <h3 className="text-lg font-bold mb-4">Compliance Rules</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border border-base-300 rounded-lg">
                  <div>
                    <p className="font-bold">GDPR Compliance</p>
                    <p className="text-sm opacity-70">Data protection & privacy</p>
                  </div>
                  <Badge variant="success">Compliant</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border border-base-300 rounded-lg">
                  <div>
                    <p className="font-bold">SOC 2 Type II</p>
                    <p className="text-sm opacity-70">Security & availability</p>
                  </div>
                  <Badge variant="warning">Checking</Badge>
                </div>
              </div>
            </div>
          )}

          {activeTab === 1 && (
            <div>
              <h3 className="text-lg font-bold mb-4">Cloud Providers</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border border-base-300 rounded-lg">
                  <div>
                    <p className="font-bold">AWS</p>
                    <p className="text-sm opacity-70">us-east-1</p>
                  </div>
                  <Badge variant="success">Connected</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border border-base-300 rounded-lg">
                  <div>
                    <p className="font-bold">Azure</p>
                    <p className="text-sm opacity-70">eastus</p>
                  </div>
                  <Badge variant="success">Connected</Badge>
                </div>
              </div>
            </div>
          )}

          {activeTab === 2 && (
            <div>
              <h3 className="text-lg font-bold mb-4">Active Integrations</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border border-base-300 rounded-lg">
                  <div>
                    <p className="font-bold">Slack Webhook</p>
                    <p className="text-sm opacity-70">Real-time notifications</p>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border border-base-300 rounded-lg">
                  <div>
                    <p className="font-bold">Datadog API</p>
                    <p className="text-sm opacity-70">Monitoring & logging</p>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              </div>
            </div>
          )}

          {activeTab === 3 && (
            <div>
              <h3 className="text-lg font-bold mb-4">Performance Metrics</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border border-base-300 rounded-lg">
                  <div>
                    <p className="font-bold">Response Time</p>
                    <p className="text-sm opacity-70">Average API latency</p>
                  </div>
                  <span className="font-bold text-success">45ms</span>
                </div>
                <div className="flex items-center justify-between p-3 border border-base-300 rounded-lg">
                  <div>
                    <p className="font-bold">Uptime</p>
                    <p className="text-sm opacity-70">Last 30 days</p>
                  </div>
                  <span className="font-bold text-success">99.9%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default EnterpriseManager;