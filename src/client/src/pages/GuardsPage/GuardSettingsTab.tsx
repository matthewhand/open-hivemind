import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { Settings } from 'lucide-react';
import { useToast } from '../../components/DaisyUI/ToastNotification';
import { authFetch } from '../../utils/authFetch';
import Card from '../../components/DaisyUI/Card';
import Divider from '../../components/DaisyUI/Divider';
import Input from '../../components/DaisyUI/Input';
import Button from '../../components/DaisyUI/Button';
import Toggle from '../../components/DaisyUI/Toggle';
import Select from '../../components/DaisyUI/Select';
import {
  coerceGuardSettings,
  settingsEqual,
  windowSecondsToMs,
  clampMaxRequests,
  formatWindow,
  DEFAULT_GUARD_SETTINGS,
  type GuardSettings,
} from '../guardSettings';

export const GuardSettingsTab: React.FC = () => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [showAdvanced, setShowAdvanced] = useLocalStorage('ui.guardSettings.showAdvanced', false);
  const [draft, setDraft] = useState<GuardSettings>(DEFAULT_GUARD_SETTINGS);

  const { data: settings, isLoading } = useQuery<GuardSettings>({
    queryKey: ['guardSettings'],
    queryFn: async () => {
      const res = await authFetch('/api/admin/guard-profiles/settings');
      if (!res.ok) throw new Error('Failed to fetch guard settings');
      const json = await res.json();
      return coerceGuardSettings(json?.data);
    },
  });

  // Sync the server value into the local draft once it loads / changes.
  React.useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (next: GuardSettings) => {
      const res = await authFetch('/api/admin/guard-profiles/settings', {
        method: 'PUT',
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error('Failed to save guard settings');
      const json = await res.json();
      return coerceGuardSettings(json?.data);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(['guardSettings'], saved);
      setDraft(saved);
      addToast({ type: 'success', title: 'Saved', message: 'Guard settings updated' });
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save guard settings',
      });
    },
  });

  const dirty = !settings || !settingsEqual(draft, settings);
  const windowSeconds = Math.round(draft.defaultRateLimit.windowMs / 1000);

  return (
    <div className="space-y-6">
      <Card className="shadow-md border border-base-200">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Global Guard Defaults</h3>
        </div>

        <div className="space-y-4">
          {/* Default rate limit */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Default Rate Limit</span></label>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Max Requests"
                type="number"
                min={1}
                max={1000000}
                value={draft.defaultRateLimit.maxRequests}
                disabled={isLoading}
                onChange={e =>
                  setDraft(d => ({
                    ...d,
                    defaultRateLimit: {
                      ...d.defaultRateLimit,
                      maxRequests: clampMaxRequests(parseInt(e.target.value, 10) || 1),
                    },
                  }))
                }
              />
              <Input
                label="Window (seconds)"
                type="number"
                min={1}
                max={3600}
                value={windowSeconds}
                disabled={isLoading}
                helperText={formatWindow(draft.defaultRateLimit.windowMs)}
                onChange={e =>
                  setDraft(d => ({
                    ...d,
                    defaultRateLimit: {
                      ...d.defaultRateLimit,
                      windowMs: windowSecondsToMs(parseInt(e.target.value, 10) || 1),
                    },
                  }))
                }
              />
            </div>
            <label className="label">
              <span className="label-text-alt text-base-content/50">
                Applied to new guard profiles by default.
              </span>
            </label>
          </div>

          <Divider>Content Filtering</Divider>

          {/* Default content filter level */}
          <div className="form-control">
            <label className="label"><span className="label-text font-medium">Default Content Filter Level</span></label>
            <Select
              disabled={isLoading}
              value={draft.defaultContentFilterStrictness}
              onChange={e =>
                setDraft(d => ({
                  ...d,
                  defaultContentFilterStrictness: e.target.value as GuardSettings['defaultContentFilterStrictness'],
                }))
              }
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
              ]}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            variant="primary"
            loading={saveMutation.isPending}
            disabled={!dirty || isLoading}
            onClick={() => saveMutation.mutate(draft)}
          >
            Save Settings
          </Button>
        </div>
      </Card>

      {/* Advanced toggle */}
      <Card className="shadow-md border border-base-200">
        <Toggle
          label="Advanced"
          checked={showAdvanced}
          onChange={() => setShowAdvanced(v => !v)}
          color="primary"
        />
        {showAdvanced && (
          <div className="mt-4 space-y-4 animate-fadeIn">
            <Divider>Advanced Guard Settings</Divider>
            <div className="form-control">
              <label className="label" htmlFor="guard-evaluation-order"><span className="label-text">Guard Evaluation Order</span></label>
              <Select
                id="guard-evaluation-order"
                disabled={isLoading}
                value={draft.evaluationOrder}
                onChange={e =>
                  setDraft(d => ({
                    ...d,
                    evaluationOrder: e.target.value as GuardSettings['evaluationOrder'],
                  }))
                }
                options={[
                  { value: 'sequential', label: 'Sequential (all guards run in order)' },
                  { value: 'parallel', label: 'Parallel (all guards run simultaneously)' },
                  { value: 'fail-fast', label: 'Fail-Fast (stop on first failure)' },
                ]}
              />
              <label className="label">
                <span className="label-text-alt text-base-content/50">
                  Controls how multiple guards are evaluated for a request.
                </span>
              </label>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
