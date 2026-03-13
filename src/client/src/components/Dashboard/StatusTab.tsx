import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Card from '../DaisyUI/Card';

import StatsCards from '../DaisyUI/StatsCards';
import StatusCard from '../Monitoring/StatusCard';
import { StatusResponse } from '../../types';

interface StatusTabProps {
  status: StatusResponse | null;
  warnings: string[];
  statsCards: any[];
  loading: boolean;
}

export const StatusTab: React.FC<StatusTabProps> = ({ status, warnings, statsCards, loading }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-base-100 shadow-xl border border-base-200">
          <Card.Body>
            <StatsCards stats={statsCards} isLoading={loading} />
          </Card.Body>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatusCard
          title="Database"
          status={status?.database?.status || 'unknown'}
          latency={status?.database?.latency}
          details={status?.database?.details}
          metrics={[]}
        />
        <StatusCard
          title="Message Queue"
          status={status?.messageQueue?.status || 'unknown'}
          latency={status?.messageQueue?.latency}
          details={status?.messageQueue?.details}
          metrics={[]}
        />
      </div>

      {warnings.length > 0 && (
        <Card className="bg-warning/10 border border-warning/20">
          <Card.Body>
            <div className="flex items-center gap-2 mb-4">
              <ExclamationTriangleIcon className="w-6 h-6 text-warning" />
              <Card.Title className="text-warning m-0">System Warnings</Card.Title>
            </div>
            <ul className="list-disc list-inside space-y-2 text-warning-content ml-4">
              {warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};
