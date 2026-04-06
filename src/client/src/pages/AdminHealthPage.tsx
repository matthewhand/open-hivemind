/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React from 'react';
import HealthCheckWidget from '../components/Dashboard/HealthCheckWidget';
import SystemHealth from '../components/SystemHealth';
import PageHeader from '../components/DaisyUI/PageHeader';
import { Activity } from 'lucide-react';

const AdminHealthPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="System Health"
        description="Real-time service status and infrastructure health monitoring"
        icon={Activity}
        gradient="success"
      />

      {/* Service-level health widget with 15s refresh for detailed view */}
      <HealthCheckWidget refreshInterval={15000} compact={false} />

      {/* Full infrastructure health (existing component) */}
      <SystemHealth refreshInterval={30000} />
    </div>
  );
};

export default AdminHealthPage;
