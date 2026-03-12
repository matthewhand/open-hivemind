import React from 'react';
import Card from '../DaisyUI/Card';

interface SystemTabProps {
  environment: string;
  systemVersion: string;
}

export const SystemTab: React.FC<SystemTabProps> = ({ environment, systemVersion }) => {
  return (
    <Card className="bg-base-100 shadow-xl border border-base-200">
      <Card.Body>
        <Card.Title className="mb-6">System Information</Card.Title>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-base-200 p-4 rounded-xl">
            <h3 className="text-sm font-semibold opacity-70 mb-1">Environment</h3>
            <div className="flex items-center gap-2">
              <span className="text-lg capitalize">{environment}</span>
              <span className={`w-2 h-2 rounded-full ${
                environment === 'production' ? 'bg-error' :
                environment === 'staging' ? 'bg-warning' : 'bg-success'
              }`}></span>
            </div>
          </div>
          <div className="bg-base-200 p-4 rounded-xl">
            <h3 className="text-sm font-semibold opacity-70 mb-1">Version</h3>
            <span className="text-lg font-mono">{systemVersion}</span>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};
