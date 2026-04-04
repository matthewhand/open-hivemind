
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert } from '../DaisyUI/Alert';
import Card from '../DaisyUI/Card';
import Input from '../DaisyUI/Input';
import Select from '../DaisyUI/Select';
import Toggle from '../DaisyUI/Toggle';
import Button from '../DaisyUI/Button';
import FormField from '../DaisyUI/FormField';
import { Settings as SettingsIcon, ShieldCheck, Activity } from 'lucide-react';
import Debug from 'debug';
import { apiService } from '../../services/api';
import { useSavedStamp } from '../../contexts/SavedStampContext';
const debug = Debug('app:client:components:Settings:SettingsGeneral');

const generalSettingsSchema = z.object({
  instanceName: z.string().min(1, 'Instance name is required').max(100, 'Instance name must be 100 characters or fewer'),
  description: z.string().max(500, 'Description must be 500 characters or fewer'),
  timezone: z.string().min(1, 'Timezone is required'),
  language: z.string().min(1, 'Language is required'),
  theme: z.enum(['auto', 'light', 'dark']),
  enableNotifications: z.boolean(),
  enableLogging: z.boolean(),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']),
  maxConcurrentBots: z.coerce.number().int().min(1, 'Must be at least 1').max(100, 'Must be 100 or fewer'),
  defaultResponseTimeout: z.coerce.number().int().min(1, 'Must be at least 1 second').max(300, 'Must be 300 seconds or fewer'),
  enableHealthChecks: z.boolean(),
  healthCheckInterval: z.coerce.number().int().min(10, 'Must be at least 10 seconds').max(3600, 'Must be 3600 seconds or fewer'),
  advancedMode: z.boolean(),
});

type GeneralConfig = z.infer<typeof generalSettingsSchema>;

const defaultValues: GeneralConfig = {
  instanceName: '',
  description: '',
  timezone: 'UTC',
  language: 'en',
  theme: 'auto',
  enableNotifications: true,
  enableLogging: true,
  logLevel: 'info',
  maxConcurrentBots: 10,
  defaultResponseTimeout: 30,
  enableHealthChecks: true,
  healthCheckInterval: 60,
  advancedMode: false,
};

const SettingsGeneral: React.FC = () => {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<GeneralConfig>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues,
  });

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { showStamp } = useSavedStamp();

  const enableHealthChecks = watch('enableHealthChecks');

  // Generate timezone options dynamically
  const timezoneOptions = useMemo(() => {
    try {
      // @ts-ignore - Intl.supportedValuesOf is available in modern environments
      if (typeof Intl !== 'undefined' && Intl.supportedValuesOf) {
        // @ts-ignore
        const timezones = Intl.supportedValuesOf('timeZone');
        return timezones.map((tz: string) => ({
          value: tz,
          label: tz.replace(/_/g, ' '),
        }));
      }
    } catch (e) {
      debug('WARN:', 'Failed to load timezones:', e);
    }
    // Fallback options
    return [
      { value: 'UTC', label: 'UTC' },
      { value: 'America/New_York', label: 'Eastern Time' },
      { value: 'America/Los_Angeles', label: 'Pacific Time' },
      { value: 'Europe/London', label: 'London' },
      { value: 'Asia/Tokyo', label: 'Tokyo' },
      { value: 'Australia/Sydney', label: 'Sydney' },
    ];
  }, []);


  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const data: any = await apiService.getGlobalConfig();

      // Extract relevant settings from user-saved config first, then fall back to defaults
      const userSettings = data._userSettings?.values || {};
      const config = data.config || {};
      reset({
        instanceName: userSettings['app.name'] || config.app?.name?.value || 'Open-Hivemind Instance',
        description: userSettings['app.description'] || config.app?.description?.value || 'Multi-agent AI coordination platform',
        timezone: userSettings['app.timezone'] || config.app?.timezone?.value || 'UTC',
        language: userSettings['app.language'] || config.app?.language?.value || 'en',
        theme: userSettings['webui.theme'] || config.webui?.theme?.value || 'auto',
        enableNotifications: userSettings['webui.notifications'] ?? (config.webui?.notifications?.value !== false),
        enableLogging: userSettings['logging.enabled'] ?? (config.logging?.enabled?.value !== false),
        logLevel: userSettings['logging.level'] || config.logging?.level?.value || 'info',
        maxConcurrentBots: userSettings['limits.maxBots'] || config.limits?.maxBots?.value || 10,
        defaultResponseTimeout: userSettings['limits.timeout'] || config.limits?.timeout?.value || 30,
        enableHealthChecks: userSettings['health.enabled'] ?? (config.health?.enabled?.value !== false),
        healthCheckInterval: userSettings['health.interval'] || config.health?.interval?.value || 60,
        advancedMode: userSettings['webui.advancedMode'] || false,
      });
    } catch (_error) {
      setFetchError(error instanceof Error ? error.message : 'An unknown error occurred while fetching settings.');
      setAlert({ type: 'error', message: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const onSubmit = async (values: GeneralConfig) => {
    setIsSaving(true);
    try {
      await apiService.updateGlobalConfig({
        'app.name': values.instanceName,
        'app.description': values.description,
        'app.timezone': values.timezone,
        'app.language': values.language,
        'webui.theme': values.theme,
        'webui.notifications': values.enableNotifications,
        'logging.level': values.logLevel,
        'logging.enabled': values.enableLogging,
        'limits.maxBots': values.maxConcurrentBots,
        'limits.timeout': values.defaultResponseTimeout,
        'health.enabled': values.enableHealthChecks,
        'health.interval': values.healthCheckInterval,
        'webui.advancedMode': values.advancedMode,
      });
      setAlert({ type: 'success', message: 'Settings saved successfully!' });
      showStamp();
      setTimeout(() => setAlert(null), 3000);
    } catch (_error) {
      setAlert({ type: 'error', message: 'Failed to save settings. Some settings may require environment variables.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-5 w-5 bg-base-300 rounded animate-pulse"></div>
          <div>
            <div className="h-5 w-48 bg-base-300 rounded mb-1 animate-pulse" style={{ animationDelay: '0ms' }}></div>
            <div className="h-4 w-64 bg-base-300 rounded animate-pulse" style={{ animationDelay: '100ms' }}></div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i, index) => (
            <Card key={i} className="bg-base-100 border border-base-300 shadow-sm p-4 h-full">
              <div className="h-6 bg-base-300 rounded w-1/3 mb-4 animate-pulse" style={{ animationDelay: `${index * 150}ms` }}></div>
              <div className="space-y-4">
                <div>
                  <div className="h-4 bg-base-300 rounded w-1/4 mb-2 animate-pulse" style={{ animationDelay: `${index * 150 + 50}ms` }}></div>
                  <div className="h-10 bg-base-300 rounded w-full animate-pulse" style={{ animationDelay: `${index * 150 + 100}ms` }}></div>
                </div>
                <div>
                  <div className="h-4 bg-base-300 rounded w-1/4 mb-2 animate-pulse" style={{ animationDelay: `${index * 150 + 150}ms` }}></div>
                  <div className="h-24 bg-base-300 rounded w-full animate-pulse" style={{ animationDelay: `${index * 150 + 200}ms` }}></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="text-error mb-2">
          <ShieldCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="font-semibold text-lg text-center">{fetchError}</p>
        </div>
        <Button variant="primary" onClick={fetchSettings} className="gap-2">
          <Activity className="w-4 h-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <SettingsIcon className="w-5 h-5 text-primary" />
        <div>
          <h5 className="text-lg font-bold">General Settings</h5>
          <p className="text-sm text-base-content/70">Configure basic instance settings and preferences</p>
        </div>
      </div>

      {alert && (
        <Alert
          status={alert.type === 'success' ? 'success' : 'error'}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Instance Information */}
        <Card className="bg-base-100 border border-base-300 shadow-sm p-4 h-full">
          <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-primary rounded-full"></span>
            Instance Information
          </h6>

          <FormField label="Instance Name" error={errors.instanceName} required>
            <Input
              {...register('instanceName')}
              placeholder="Display name for this Open-Hivemind instance"
              size="sm"
            />
          </FormField>

          <FormField label="Description" error={errors.description}>
            <textarea
              className="textarea textarea-bordered textarea-sm w-full"
              {...register('description')}
              placeholder="Brief description of this instance's purpose"
              rows={2}
            />
          </FormField>
        </Card>

        {/* Localization */}
        <Card className="bg-base-100 border border-base-300 shadow-sm p-4 h-full">
          <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-secondary rounded-full"></span>
            Localization & Appearance
          </h6>

          <FormField label="Timezone" error={errors.timezone}>
            <Select
              {...register('timezone')}
              size="sm"
              options={timezoneOptions}
            />
          </FormField>

          <FormField label="Theme" error={errors.theme}>
            <Select
              {...register('theme')}
              size="sm"
              options={[
                { value: 'auto', label: 'Auto (System)' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </FormField>
        </Card>

        {/* Logging */}
        <Card className="bg-base-100 border border-base-300 shadow-sm p-4 h-full">
          <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-accent rounded-full"></span>
            Logging & Notifications
          </h6>

          <FormField label="Log Level" error={errors.logLevel}>
            <Select
              {...register('logLevel')}
              size="sm"
              options={[
                { value: 'debug', label: 'Debug' },
                { value: 'info', label: 'Info' },
                { value: 'warn', label: 'Warning' },
                { value: 'error', label: 'Error' },
              ]}
            />
          </FormField>

          <div className="space-y-3">
            <Controller
              name="enableLogging"
              control={control}
              render={({ field }) => (
                <Toggle
                  label="Enable Detailed Logging"
                  checked={field.value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.checked)}
                  size="sm"
                />
              )}
            />
            <Controller
              name="enableNotifications"
              control={control}
              render={({ field }) => (
                <Toggle
                  label="Enable Desktop Notifications"
                  checked={field.value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.checked)}
                  size="sm"
                />
              )}
            />
          </div>
        </Card>

        {/* System Limits */}
        <Card className="bg-base-100 border border-base-300 shadow-sm p-4 h-full">
          <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-warning rounded-full"></span>
            System Limits & Health
          </h6>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <FormField label="Max Bots" error={errors.maxConcurrentBots}>
              <Input
                type="number"
                {...register('maxConcurrentBots')}
                size="sm"
              />
            </FormField>
            <FormField label="Timeout (s)" error={errors.defaultResponseTimeout}>
              <Input
                type="number"
                {...register('defaultResponseTimeout')}
                size="sm"
              />
            </FormField>
          </div>

          <div className="space-y-3">
            <Controller
              name="enableHealthChecks"
              control={control}
              render={({ field }) => (
                <Toggle
                  label="Enable Background Health Checks"
                  checked={field.value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.checked)}
                  size="sm"
                />
              )}
            />
            {enableHealthChecks && (
              <div className="form-control mt-2 pl-4 border-l-2 border-base-300">
                <FormField label="Interval (seconds)" error={errors.healthCheckInterval}>
                  <Input
                    type="number"
                    {...register('healthCheckInterval')}
                    size="xs"
                  />
                </FormField>
              </div>
            )}
            <Controller
              name="advancedMode"
              control={control}
              render={({ field }) => (
                <Toggle
                  label="Advanced Mode (Show all options)"
                  checked={field.value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.checked)}
                  size="sm"
                />
              )}
            />
          </div>
        </Card>
      </div>

      <div className="flex justify-end pt-4 border-t border-base-300">
        <Button
          type="submit"
          variant="primary"
          loading={isSaving}
          className="min-w-[120px]"
        >
          <SettingsIcon className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </form>
  );
};

export default SettingsGeneral;
