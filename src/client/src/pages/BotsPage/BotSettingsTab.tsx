import { Info } from 'lucide-react';
import React, { useState } from 'react';
import { Alert } from '../../components/DaisyUI/Alert';
import Card from '../../components/DaisyUI/Card';
import Select from '../../components/DaisyUI/Select';
import Toggle from '../../components/DaisyUI/Toggle';

const BotSettingsTab: React.FC = () => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-6">
      <Alert status="info" icon={<Info className="w-5 h-5" />}>
        <span>Bot settings API coming soon — these controls are placeholders.</span>
      </Alert>

      {/* Basic Settings */}
      <Card title="Basic Settings">
        <div className="space-y-4">
          <Toggle
            label="Auto-start on creation"
            disabled
            checked={false}
            onChange={() => {}}
          />
          <div className="form-control w-full max-w-xs">
            <label className="label">
              <span className="label-text">Default LLM Profile</span>
            </label>
            <Select disabled className="select-bordered" size="sm">
              <option>Select LLM profile...</option>
            </Select>
          </div>
          <div className="form-control w-full max-w-xs">
            <label className="label">
              <span className="label-text">Default Persona</span>
            </label>
            <Select disabled className="select-bordered" size="sm">
              <option>Select persona...</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Advanced Toggle */}
      <div className="flex items-center gap-2">
        <Toggle
          label="Advanced"
          checked={showAdvanced}
          onChange={() => setShowAdvanced((v) => !v)}
        />
      </div>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="space-y-4">
          <Card title="Startup Greeting">
            <p className="text-base-content/60 text-sm">
              Configure the default greeting message sent when a bot starts up.
            </p>
            <textarea
              className="textarea textarea-bordered w-full mt-2"
              placeholder="Hello! I'm ready to help."
              disabled
              rows={3}
            />
          </Card>

          <Card title="Reconnection Settings">
            <div className="space-y-3">
              <Toggle
                label="Auto-reconnect on disconnect"
                disabled
                checked={false}
                onChange={() => {}}
              />
              <div className="form-control w-full max-w-xs">
                <label className="label">
                  <span className="label-text">Max retry attempts</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered input-sm w-full max-w-xs"
                  placeholder="3"
                  disabled
                />
              </div>
            </div>
          </Card>

          <Card title="Duplicate Response Suppression">
            <div className="space-y-3">
              <Toggle
                label="Suppress duplicate responses"
                disabled
                checked={false}
                onChange={() => {}}
              />
              <div className="form-control w-full max-w-xs">
                <label className="label">
                  <span className="label-text">Dedup window (seconds)</span>
                </label>
                <input
                  type="number"
                  className="input input-bordered input-sm w-full max-w-xs"
                  placeholder="5"
                  disabled
                />
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BotSettingsTab;
