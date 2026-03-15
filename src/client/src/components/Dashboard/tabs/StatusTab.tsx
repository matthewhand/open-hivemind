import React from 'react';
import Card from '../../DaisyUI/Card';
import { AgentGrid } from '../AgentGrid';
import { BotTableRow } from '../../UnifiedDashboard';

export interface StatusTabProps {
  bots: any[];
  statusBots: any[];
  botTableData: BotTableRow[];
}

export const StatusTab: React.FC<StatusTabProps> = ({ bots, statusBots, botTableData }) => {
  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-base-200">
        <div className="p-6 pb-2 border-b border-base-200 bg-base-100/50 flex justify-between items-center rounded-t-xl">
          <h2 className="text-xl font-bold flex items-center">
            <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center mr-3 text-primary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
            Active Bots Overview
          </h2>
          <span className="badge badge-primary">{bots.length} Active</span>
        </div>
        <div className="p-6 bg-base-100 rounded-b-xl">
          <AgentGrid bots={bots} statusBots={statusBots} />
        </div>
      </Card>
    </div>
  );
};
