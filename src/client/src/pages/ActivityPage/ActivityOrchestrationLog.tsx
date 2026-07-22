/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import Card from '../../components/DaisyUI/Card';

interface ActivityOrchestrationLogProps {
  orchestrationLogs: any[];
}

export const ActivityOrchestrationLog: React.FC<ActivityOrchestrationLogProps> = ({
  orchestrationLogs,
}) => {
  return (
    <Card title="Live Orchestration Log">
      <div className="max-h-60 overflow-y-auto bg-base-300 rounded-lg p-4 font-mono text-xs space-y-1">
        {orchestrationLogs.length === 0 ? (
          <div className="text-base-content/80 italic">Waiting for orchestration events...</div>
        ) : (
          orchestrationLogs.map((log, i) => (
            <div key={i} className="flex gap-4 border-b border-base-100/10 pb-1">
              <span className="text-base-content/40 w-24 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
              <span className="text-secondary w-20 shrink-0 font-bold">[{log.botName}]</span>
              <span className={`w-16 shrink-0 ${log.shouldReply ? 'text-success' : 'text-error'}`}>
                {log.shouldReply ? 'REPLY' : 'IGNORE'}
              </span>
              <span className="text-base-content/70">{log.reason}</span>
              {log.claimedBy && (
                <span className="text-warning shrink-0">
                  (Claimed by: {log.claimedBy})
                </span>
              )}
              {log.probabilityRoll !== undefined && log.threshold !== undefined && (
                <span className="text-base-content/40 ml-auto">
                  (Roll: {(log.probabilityRoll * 100).toFixed(0)}% / Thr: {(log.threshold * 100).toFixed(0)}%)
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
