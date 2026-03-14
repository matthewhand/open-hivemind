import React from 'react';
import Card from '../../DaisyUI/Card';
import { LLMUsageChart } from '../LLMUsageChart';
import { MessageVolumeChart } from '../MessageVolumeChart';
import { ActivityLog } from '../ActivityLog';

export interface PerformanceTabProps {
  performanceMetrics: any;
}

export const PerformanceTab: React.FC<PerformanceTabProps> = ({ performanceMetrics }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg border-base-200">
          <div className="p-6 pb-2 border-b border-base-200 bg-base-100/50 flex items-center rounded-t-xl">
            <h2 className="text-xl font-bold flex items-center">
              <span className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center mr-3 text-secondary">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </span>
              Message Volume
            </h2>
          </div>
          <div className="p-6 bg-base-100 rounded-b-xl">
            <MessageVolumeChart data={performanceMetrics.messageVolume} />
          </div>
        </Card>

        <Card className="shadow-lg border-base-200">
          <div className="p-6 pb-2 border-b border-base-200 bg-base-100/50 flex items-center rounded-t-xl">
            <h2 className="text-xl font-bold flex items-center">
              <span className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center mr-3 text-accent">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </span>
              LLM Usage & Costs
            </h2>
          </div>
          <div className="p-6 bg-base-100 rounded-b-xl">
            <LLMUsageChart data={performanceMetrics.llmUsage} />
          </div>
        </Card>
      </div>

      <Card className="shadow-lg border-base-200 mt-6">
        <div className="p-6 pb-2 border-b border-base-200 bg-base-100/50 flex justify-between items-center rounded-t-xl">
          <h2 className="text-xl font-bold flex items-center">
            <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center mr-3 text-primary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            System Activity Log
          </h2>
          <span className="text-sm text-base-content/60 bg-base-200 px-3 py-1 rounded-full border border-base-300">Live feed</span>
        </div>
        <div className="p-0 bg-base-100 rounded-b-xl overflow-hidden">
          <ActivityLog logs={performanceMetrics.recentActivity} />
        </div>
      </Card>
    </div>
  );
};
