/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Toggle, Button } from '../DaisyUI';
import { MessageSquare, Bot, Users, Zap } from 'lucide-react';

interface MessagingConfig {
  onlyWhenSpokenTo: boolean;
  allowBotToBot: boolean;
  unsolicitedAddressed: boolean;
  unsolicitedUnaddressed: boolean;
  baseChance: number;
  graceWindowMs: number;
  /** Whether the bot injects the user's identity hint when mentioned (MESSAGE_ADD_USER_HINT). */
  addUserHint: boolean;
}

const SettingsMessaging: React.FC = () => {
  const [settings, setSettings] = useState<MessagingConfig>({
    onlyWhenSpokenTo: true,
    allowBotToBot: false,
    unsolicitedAddressed: true,
    unsolicitedUnaddressed: false,
    baseChance: 5,
    graceWindowMs: 300000,
    addUserHint: false,
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning', message: string } | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/config/global');
      if (!response.ok) {
        setAlert({
          type: 'warning',
          message: 'Messaging config API not available. Settings shown are defaults. Configure via environment variables.',
        });
        return;
      }
      const raw = await response.json();
      // Global config wraps message settings under message.values
      const data = raw?.message?.values ?? raw;

      setSettings({
        onlyWhenSpokenTo: data.MESSAGE_ONLY_WHEN_SPOKEN_TO ?? true,
        allowBotToBot: data.MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED ?? false,
        unsolicitedAddressed: data.MESSAGE_UNSOLICITED_ADDRESSED ?? true,
        unsolicitedUnaddressed: data.MESSAGE_UNSOLICITED_UNADDRESSED ?? false,
        baseChance: (data.MESSAGE_UNSOLICITED_BASE_CHANCE ?? 0.01) * 100,
        graceWindowMs: data.MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS ?? 300000,
        addUserHint: data.MESSAGE_ADD_USER_HINT ?? false,
      });
    } catch {
      setAlert({
        type: 'warning',
        message: 'Could not load messaging settings. Using defaults.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleChange = (field: keyof MessagingConfig, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/config/global', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            MESSAGE_ONLY_WHEN_SPOKEN_TO: settings.onlyWhenSpokenTo,
            MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED: settings.allowBotToBot,
            MESSAGE_UNSOLICITED_ADDRESSED: settings.unsolicitedAddressed,
            MESSAGE_UNSOLICITED_UNADDRESSED: settings.unsolicitedUnaddressed,
            MESSAGE_UNSOLICITED_BASE_CHANCE: settings.baseChance / 100,
            MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS: settings.graceWindowMs,
            MESSAGE_ADD_USER_HINT: settings.addUserHint,
          },
        }),
      });

      if (!response.ok) { throw new Error('Failed to save settings'); }
      setAlert({ type: 'success', message: 'Messaging settings saved! Restart may be required.' });
      setTimeout(() => setAlert(null), 5000);
    } catch {
      setAlert({
        type: 'error',
        message: 'Failed to save. These settings require environment variables to persist.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <MessageSquare className="w-5 h-5 text-primary" />
        <div>
          <h5 className="text-lg font-bold">Messaging Behavior</h5>
          <p className="text-sm text-base-content/70">Configure how bots decide when to respond</p>
        </div>
      </div>

      {alert && (
        <Alert
          status={alert.type === 'success' ? 'success' : alert.type === 'warning' ? 'warning' : 'error'}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Mode */}
        <div className="card bg-base-200/50 p-4">
          <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-primary rounded-full"></span>
            Response Mode
          </h6>

          <div className="form-control mb-4">
            <label className="label cursor-pointer py-2">
              <div>
                <span className="label-text font-medium">Only When Spoken To</span>
                <p className="text-xs text-base-content/60 mt-1">
                  Bot only replies when directly mentioned, replied to, or wakeword used
                </p>
              </div>
              <Toggle
                checked={settings.onlyWhenSpokenTo}
                onChange={(e) => handleChange('onlyWhenSpokenTo', e.target.checked)}
                color="primary"
              />
            </label>
          </div>

          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-sm font-medium">Grace Window</span>
              <span className="badge badge-ghost font-mono text-xs">
                {settings.graceWindowMs >= 60000
                  ? `${Math.round(settings.graceWindowMs / 60000)}m`
                  : `${Math.round(settings.graceWindowMs / 1000)}s`}
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="600000"
              step="30000"
              value={settings.graceWindowMs}
              onChange={(e) => handleChange('graceWindowMs', parseInt(e.target.value))}
              className="range range-sm range-primary"
              disabled={!settings.onlyWhenSpokenTo}
            />
            <p className="text-xs text-base-content/60 mt-1">
              After speaking, bot can reply freely for this duration
            </p>
          </div>
        </div>

        {/* Bot-to-Bot */}
        <div className="card bg-base-200/50 p-4">
          <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Bot-to-Bot Interaction
          </h6>

          <div className="form-control">
            <label className="label cursor-pointer py-2">
              <div>
                <span className="label-text font-medium">Allow Bot-to-Bot Replies</span>
                <p className="text-xs text-base-content/60 mt-1">
                  Allow spontaneous replies to other bots (not just direct mentions)
                </p>
              </div>
              <Toggle
                checked={settings.allowBotToBot}
                onChange={(e) => handleChange('allowBotToBot', e.target.checked)}
                color="secondary"
              />
            </label>
          </div>

          {settings.allowBotToBot && (
            <div className="alert alert-warning mt-3 py-2">
              <Zap className="w-4 h-4" />
              <span className="text-sm">Collision avoidance is active to prevent bot storms</span>
            </div>
          )}
        </div>

        {/* Unsolicited Replies */}
        <div className="card bg-base-200/50 p-4">
          <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Unsolicited Replies
          </h6>

          <div className="form-control mb-3">
            <label className="label cursor-pointer py-2">
              <div>
                <span className="label-text font-medium">Reply to @mentions (others)</span>
                <p className="text-xs text-base-content/60 mt-1">
                  Join conversations where others are mentioned
                </p>
              </div>
              <Toggle
                checked={settings.unsolicitedAddressed}
                onChange={(e) => handleChange('unsolicitedAddressed', e.target.checked)}
                disabled={settings.onlyWhenSpokenTo}
              />
            </label>
          </div>

          <div className="form-control">
            <label className="label cursor-pointer py-2">
              <div>
                <span className="label-text font-medium">Reply to general messages</span>
                <p className="text-xs text-base-content/60 mt-1">
                  Spontaneously join unaddressed conversations
                </p>
              </div>
              <Toggle
                checked={settings.unsolicitedUnaddressed}
                onChange={(e) => handleChange('unsolicitedUnaddressed', e.target.checked)}
                disabled={settings.onlyWhenSpokenTo}
              />
            </label>
          </div>
        </div>

        {/* Context & Additions */}
        <div className="card bg-base-200/50 p-4">
          <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-info rounded-full"></span>
            Context &amp; Additions
          </h6>

          <div className="form-control">
            <label className="label cursor-pointer py-2">
              <div>
                <span className="label-text font-medium">Add User Hint</span>
                <p className="text-xs text-base-content/60 mt-1">
                  Inject the original user's identity when the bot is mentioned (MESSAGE_ADD_USER_HINT)
                </p>
              </div>
              <Toggle
                checked={settings.addUserHint}
                onChange={(e) => handleChange('addUserHint', e.target.checked)}
                color="info"
              />
            </label>
          </div>
        </div>

        {/* Probability */}
        <div className="card bg-base-200/50 p-4">
          <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-accent rounded-full"></span>
            Response Probability
          </h6>

          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-sm font-medium">Base Chance</span>
              <span className="badge badge-accent font-mono">{settings.baseChance.toFixed(0)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={settings.baseChance}
              onChange={(e) => handleChange('baseChance', parseInt(e.target.value))}
              className="range range-accent"
              disabled={settings.onlyWhenSpokenTo}
            />
            <div className="w-full flex justify-between text-xs px-2 mt-1 text-base-content/50">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
            <p className="text-xs text-base-content/60 mt-2">
              Chance to reply to unsolicited messages that look like opportunities
            </p>
          </div>
        </div>
      </div>

      {/* Environment Variables Reference */}
      <div className="collapse collapse-arrow bg-base-200/30">
        <input type="checkbox" />
        <div className="collapse-title text-sm font-medium">
          Environment Variables Reference
        </div>
        <div className="collapse-content">
          <div className="overflow-x-auto">
            <table className="table table-xs">
              <thead>
                <tr>
                  <th>Setting</th>
                  <th>Environment Variable</th>
                  <th>Current</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                <tr>
                  <td>Only When Spoken To</td>
                  <td>MESSAGE_ONLY_WHEN_SPOKEN_TO</td>
                  <td>{settings.onlyWhenSpokenTo ? '✅ true' : '➖ false'}</td>
                </tr>
                <tr>
                  <td>Allow Bot-to-Bot</td>
                  <td>MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED</td>
                  <td>{settings.allowBotToBot ? '✅ true' : '➖ false'}</td>
                </tr>
                <tr>
                  <td>Unsolicited Addressed</td>
                  <td>MESSAGE_UNSOLICITED_ADDRESSED</td>
                  <td>{settings.unsolicitedAddressed ? '✅ true' : '➖ false'}</td>
                </tr>
                <tr>
                  <td>Unsolicited Unaddressed</td>
                  <td>MESSAGE_UNSOLICITED_UNADDRESSED</td>
                  <td>{settings.unsolicitedUnaddressed ? '✅ true' : '➖ false'}</td>
                </tr>
                <tr>
                  <td>Base Chance</td>
                  <td>MESSAGE_UNSOLICITED_BASE_CHANCE</td>
                  <td>{(settings.baseChance / 100).toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Grace Window</td>
                  <td>MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS</td>
                  <td>{settings.graceWindowMs}ms</td>
                </tr>
                <tr>
                  <td>Add User Hint</td>
                  <td>MESSAGE_ADD_USER_HINT</td>
                  <td>{settings.addUserHint ? '✅ true' : '➖ false'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          variant="primary"
          loading={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};

export default SettingsMessaging;
