/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Toggle, Button } from '../DaisyUI';
import { MessageSquare, Bot, Users, Zap, Clock, AlertTriangle } from 'lucide-react';
import { apiService } from '../../services/api';

interface MessagingConfig {
  onlyWhenSpokenTo: boolean;
  allowBotToBot: boolean;
  unsolicitedAddressed: boolean;
  unsolicitedUnaddressed: boolean;
  baseChance: number;
  graceWindowMs: number;
}

const SettingsMessaging: React.FC = () => {
  const [settings, setSettings] = useState<MessagingConfig>({
    onlyWhenSpokenTo: true,
    allowBotToBot: false,
    unsolicitedAddressed: true,
    unsolicitedUnaddressed: false,
    baseChance: 5,
    graceWindowMs: 300000,
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning', message: string } | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getMessagingConfig();

      setSettings({
        onlyWhenSpokenTo: data.MESSAGE_ONLY_WHEN_SPOKEN_TO ?? true,
        allowBotToBot: data.MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED ?? false,
        unsolicitedAddressed: data.MESSAGE_UNSOLICITED_ADDRESSED ?? true,
        unsolicitedUnaddressed: data.MESSAGE_UNSOLICITED_UNADDRESSED ?? false,
        baseChance: (data.MESSAGE_UNSOLICITED_BASE_CHANCE ?? 0.01) * 100,
        graceWindowMs: data.MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS ?? 300000,
      });
    } catch (err) {
      console.error('Failed to load messaging settings:', err);
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
    setAlert(null);
    try {
      await apiService.updateMessagingConfig({
        MESSAGE_ONLY_WHEN_SPOKEN_TO: settings.onlyWhenSpokenTo,
        MESSAGE_ALLOW_BOT_TO_BOT_UNADDRESSED: settings.allowBotToBot,
        MESSAGE_UNSOLICITED_ADDRESSED: settings.unsolicitedAddressed,
        MESSAGE_UNSOLICITED_UNADDRESSED: settings.unsolicitedUnaddressed,
        MESSAGE_UNSOLICITED_BASE_CHANCE: settings.baseChance / 100,
        MESSAGE_ONLY_WHEN_SPOKEN_TO_GRACE_WINDOW_MS: settings.graceWindowMs,
      });

      setAlert({ type: 'success', message: 'Messaging settings saved successfully!' });
      setTimeout(() => setAlert(null), 5000);
    } catch (err) {
      console.error('Failed to save messaging settings:', err);
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
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <MessageSquare className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold">Messaging Behavior</h2>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Response Mode */}
        <div className="card bg-base-100 border border-base-200 shadow-sm">
          <div className="card-body p-5">
            <h3 className="card-title text-base flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-primary" />
              Response Mode
            </h3>

            <div className="form-control mb-6">
              <label className="label cursor-pointer justify-start gap-4">
                <Toggle
                  checked={settings.onlyWhenSpokenTo}
                  onChange={(e) => handleChange('onlyWhenSpokenTo', e.target.checked)}
                  color="primary"
                />
                <div>
                  <span className="label-text font-medium">Only When Spoken To</span>
                  <p className="text-xs text-base-content/60 mt-1">
                    Bot only replies when mentioned or replied to directly
                  </p>
                </div>
              </label>
            </div>

            <h3 className="card-title text-base flex items-center gap-2 mb-2 pt-4 border-t border-base-200">
              <Clock className="w-4 h-4 text-secondary" />
              Conversation Grace Window
            </h3>

            <div className="form-control mb-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium opacity-80">Duration</span>
                <span className="badge badge-ghost font-mono text-xs">
                  {settings.graceWindowMs >= 60000
                    ? `${Math.round(settings.graceWindowMs / 60000)}m`
                    : `${Math.round(settings.graceWindowMs / 1000)}s`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="600000"
                step="30000"
                value={settings.graceWindowMs}
                onChange={(e) => handleChange('graceWindowMs', parseInt(e.target.value))}
                className="range range-sm range-secondary"
                disabled={!settings.onlyWhenSpokenTo}
              />
              <div className="flex justify-between text-xs px-1 mt-1 opacity-50">
                <span>0</span>
                <span>5m</span>
                <span>10m</span>
              </div>
              <p className="text-xs text-base-content/60 mt-2">
                After speaking, bot can reply freely for this duration without being mentioned again.
              </p>
            </div>
          </div>
        </div>

        {/* Unsolicited & Bot-to-Bot */}
        <div className="card bg-base-100 border border-base-200 shadow-sm">
          <div className="card-body p-5">
            <h3 className="card-title text-base flex items-center gap-2 mb-4">
              <Bot className="w-4 h-4 text-accent" />
              Advanced Interactions
            </h3>

            <div className="form-control mb-4">
              <label className="label cursor-pointer justify-start gap-4">
                <Toggle
                  checked={settings.allowBotToBot}
                  onChange={(e) => handleChange('allowBotToBot', e.target.checked)}
                  color="accent"
                />
                <div>
                  <span className="label-text font-medium">Bot-to-Bot Replies</span>
                  <p className="text-xs text-base-content/60 mt-1">
                    Allow bots to reply to other bots spontaneously
                  </p>
                </div>
              </label>
              {settings.allowBotToBot && (
                <div className="alert alert-warning text-xs py-2 mt-2 flex gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Collision avoidance active to prevent loops</span>
                </div>
              )}
            </div>

            <div className="divider my-2"></div>

            <h3 className="card-title text-base flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-info" />
              Unsolicited Replies
            </h3>

            <div className="form-control mb-3">
              <label className="label cursor-pointer justify-start gap-4">
                <Toggle
                  checked={settings.unsolicitedAddressed}
                  onChange={(e) => handleChange('unsolicitedAddressed', e.target.checked)}
                  disabled={settings.onlyWhenSpokenTo}
                />
                <span className="label-text font-medium">Reply when others mentioned</span>
              </label>
            </div>

            <div className="form-control mb-4">
              <label className="label cursor-pointer justify-start gap-4">
                <Toggle
                  checked={settings.unsolicitedUnaddressed}
                  onChange={(e) => handleChange('unsolicitedUnaddressed', e.target.checked)}
                  disabled={settings.onlyWhenSpokenTo}
                />
                <span className="label-text font-medium">Reply to general chatter</span>
              </label>
            </div>

            <div className="form-control">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium opacity-80">Base Probability</span>
                <span className="badge badge-info font-mono">{settings.baseChance.toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={settings.baseChance}
                onChange={(e) => handleChange('baseChance', parseInt(e.target.value))}
                className="range range-info range-sm"
                disabled={settings.onlyWhenSpokenTo}
              />
              <p className="text-xs text-base-content/60 mt-2">
                Chance to intervene in a conversation unsolicited.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6 border-t border-base-200">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSaving}
          loading={isSaving}
          className="gap-2"
        >
          {isSaving ? 'Saving...' : 'Save Messaging Settings'}
        </Button>
      </div>
    </div>
  );
};

export default SettingsMessaging;
