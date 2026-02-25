import React from 'react';
import { SystemConfig } from './types';
import { Card, Input, Select, Button, Toggle } from '../DaisyUI';
import { Save, Settings } from 'lucide-react';

interface ConfigTabProps {
  config: SystemConfig;
  onUpdate: (key: keyof SystemConfig, value: any) => void;
  loading?: boolean;
}

const ConfigTab: React.FC<ConfigTabProps> = ({ config, onUpdate, loading }) => {
  return (
    <Card className="bg-base-100 shadow-sm border border-base-200">
      <div className="card-body">
        <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 opacity-70"/>
            <h3 className="text-lg font-bold">System Configuration</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Refresh Interval (ms)</span>
            </label>
            <Input
              type="number"
              value={config.refreshInterval}
              onChange={(e) => onUpdate('refreshInterval', Number(e.target.value))}
              min={1000}
              max={60000}
              bordered
            />
            <label className="label">
                <span className="label-text-alt opacity-70">Dashboard data poll rate</span>
            </label>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Log Level</span>
            </label>
            <Select
              value={config.logLevel}
              onChange={(e) => onUpdate('logLevel', e.target.value)}
              options={[
                  { value: 'debug', label: 'Debug' },
                  { value: 'info', label: 'Info' },
                  { value: 'warn', label: 'Warning' },
                  { value: 'error', label: 'Error' },
              ]}
              bordered
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Max Connections</span>
            </label>
            <Input
              type="number"
              value={config.maxConnections}
              onChange={(e) => onUpdate('maxConnections', Number(e.target.value))}
              min={100}
              max={10000}
              bordered
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Backup Interval (hours)</span>
            </label>
            <Input
              type="number"
              value={config.backupInterval / (1000 * 60 * 60)}
              onChange={(e) => onUpdate('backupInterval', Number(e.target.value) * 1000 * 60 * 60)}
              min={1}
              max={168}
              bordered
            />
          </div>

          <div className="form-control">
             <label className="label cursor-pointer justify-start gap-4">
                <span className="label-text font-medium">Enable Auto-Backup</span>
                <Toggle
                    checked={config.enableAutoBackup}
                    onChange={(e) => onUpdate('enableAutoBackup', e.target.checked)}
                />
             </label>
          </div>

           <div className="form-control">
             <label className="label cursor-pointer justify-start gap-4">
                <span className="label-text font-medium">Debug Mode</span>
                <Toggle
                    checked={config.enableDebugMode}
                    onChange={(e) => onUpdate('enableDebugMode', e.target.checked)}
                    color="warning"
                />
             </label>
          </div>
        </div>

        <div className="divider">Alert Thresholds</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">CPU Usage Threshold (%)</span>
            </label>
            <Input
              type="number"
              value={config.alertThresholds.cpu}
              onChange={(e) => onUpdate('alertThresholds', {
                ...config.alertThresholds,
                cpu: Number(e.target.value),
              })}
              min={50}
              max={95}
              bordered
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Memory Usage Threshold (%)</span>
            </label>
            <Input
              type="number"
              value={config.alertThresholds.memory}
              onChange={(e) => onUpdate('alertThresholds', {
                ...config.alertThresholds,
                memory: Number(e.target.value),
              })}
              min={50}
              max={95}
              bordered
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Disk Usage Threshold (%)</span>
            </label>
            <Input
              type="number"
              value={config.alertThresholds.disk}
              onChange={(e) => onUpdate('alertThresholds', {
                ...config.alertThresholds,
                disk: Number(e.target.value),
              })}
              min={50}
              max={95}
              bordered
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Response Time Threshold (ms)</span>
            </label>
            <Input
              type="number"
              value={config.alertThresholds.responseTime}
              onChange={(e) => onUpdate('alertThresholds', {
                ...config.alertThresholds,
                responseTime: Number(e.target.value),
              })}
              min={100}
              max={5000}
              bordered
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ConfigTab;
