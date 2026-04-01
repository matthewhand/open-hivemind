/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import RangeSlider from '../../components/DaisyUI/RangeSlider';
import type { SystemConfig } from './types';

interface ConfigTabProps {
  systemConfig: SystemConfig;
  onConfigUpdate: (key: keyof SystemConfig, value: any) => void;
}

const ConfigTab: React.FC<ConfigTabProps> = ({ systemConfig, onConfigUpdate }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">System Configuration</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Refresh Interval (ms)</span>
          </label>
          <input
            type="number"
            className="input input-bordered"
            value={systemConfig.refreshInterval}
            onChange={(e) => onConfigUpdate('refreshInterval', Number(e.target.value))}
            min="1000"
            max="60000"
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Log Level</span>
          </label>
          <select
            className="select select-bordered"
            value={systemConfig.logLevel}
            onChange={(e) => onConfigUpdate('logLevel', e.target.value)}
          >
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Max Connections</span>
          </label>
          <input
            type="number"
            className="input input-bordered"
            value={systemConfig.maxConnections}
            onChange={(e) => onConfigUpdate('maxConnections', Number(e.target.value))}
            min="100"
            max="10000"
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Backup Interval (hours)</span>
          </label>
          <input
            type="number"
            className="input input-bordered"
            value={systemConfig.backupInterval / (1000 * 60 * 60)}
            onChange={(e) => onConfigUpdate('backupInterval', Number(e.target.value) * 1000 * 60 * 60)}
            min="1"
            max="168"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-lg font-semibold">Alert Thresholds</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="form-control pt-2">
            <RangeSlider
              label="CPU Usage Threshold"
              value={systemConfig.alertThresholds.cpu}
              onChange={(val) => onConfigUpdate('alertThresholds', {
                ...systemConfig.alertThresholds,
                cpu: val,
              })}
              min={0}
              max={100}
              step={5}
              valueFormatter={(v) => `${v}%`}
              variant="warning"
            />
          </div>

          <div className="form-control pt-2">
            <RangeSlider
              label="Memory Usage Threshold"
              value={systemConfig.alertThresholds.memory}
              onChange={(val) => onConfigUpdate('alertThresholds', {
                ...systemConfig.alertThresholds,
                memory: val,
              })}
              min={0}
              max={100}
              step={5}
              valueFormatter={(v) => `${v}%`}
              variant="warning"
            />
          </div>

          <div className="form-control pt-2">
            <RangeSlider
              label="Disk Usage Threshold"
              value={systemConfig.alertThresholds.disk}
              onChange={(val) => onConfigUpdate('alertThresholds', {
                ...systemConfig.alertThresholds,
                disk: val,
              })}
              min={0}
              max={100}
              step={5}
              valueFormatter={(v) => `${v}%`}
              variant="warning"
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Response Time Threshold (ms)</span>
            </label>
            <input
              type="number"
              className="input input-bordered"
              value={systemConfig.alertThresholds.responseTime}
              onChange={(e) => onConfigUpdate('alertThresholds', {
                ...systemConfig.alertThresholds,
                responseTime: Number(e.target.value),
              })}
              min="100"
              max="5000"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigTab;
