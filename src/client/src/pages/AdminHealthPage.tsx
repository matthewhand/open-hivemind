/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React from 'react';
import HealthCheckWidget from '../components/Dashboard/HealthCheckWidget';
import SystemHealth from '../components/SystemHealth';
import { Activity } from 'lucide-react';

const AdminHealthPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">System Health</h1>
          <p className="text-sm text-base-content/60">
            Real-time service status and infrastructure health monitoring
          </p>
        </div>
      </div>

      {/* Service-level health widget with 15s refresh for detailed view */}
      <HealthCheckWidget refreshInterval={15000} compact={false} />

      {/* Full infrastructure health (existing component) */}
      <SystemHealth refreshInterval={30000} />
    </div>
  );
};

export default AdminHealthPage;
