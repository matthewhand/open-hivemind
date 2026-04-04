
import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert } from '../DaisyUI/Alert';
import { Badge } from '../DaisyUI/Badge';
import Card from '../DaisyUI/Card';
import Button from '../DaisyUI/Button';
import Divider from '../DaisyUI/Divider';
import { SkeletonList } from '../DaisyUI/Skeleton';
import Input from '../DaisyUI/Input';
import Toggle from '../DaisyUI/Toggle';
import FormField from '../DaisyUI/FormField';
import { Shield, Plus, Trash2 } from 'lucide-react';
import Tooltip from '../DaisyUI/Tooltip';
import SecureConfigManager from '../SecureConfigManager';
import Debug from 'debug';
import { apiService } from '../../services/api';
import { useSavedStamp } from '../../contexts/SavedStampContext';
const debug = Debug('app:client:components:Settings:SettingsSecurity');

const securitySettingsSchema = z.object({
  enableAuthentication: z.boolean(),
  sessionTimeout: z.coerce.number().int().min(300, 'Must be at least 300 seconds').max(86400, 'Must be 86400 seconds or fewer'),
  maxLoginAttempts: z.coerce.number().int().min(1, 'Must be at least 1').max(100, 'Must be 100 or fewer'),
  lockoutDuration: z.coerce.number().int().min(60, 'Must be at least 60 seconds').max(86400, 'Must be 86400 seconds or fewer'),
  enableTwoFactor: z.boolean(),
  enableAuditLogging: z.boolean(),
  enableRateLimit: z.boolean(),
  rateLimitWindow: z.coerce.number().int().min(10, 'Must be at least 10 seconds').max(3600, 'Must be 3600 seconds or fewer'),
  rateLimitMax: z.coerce.number().int().min(10, 'Must be at least 10').max(10000, 'Must be 10000 or fewer'),
  enableCors: z.boolean(),
  corsOrigins: z.array(z.object({ value: z.string() })),
  enableSecurityHeaders: z.boolean(),
  enableApiKeyAuth: z.boolean(),
});

type SecurityConfig = z.infer<typeof securitySettingsSchema>;

const defaultValues: SecurityConfig = {
  enableAuthentication: true,
  sessionTimeout: 3600,
  maxLoginAttempts: 5,
  lockoutDuration: 900,
  enableTwoFactor: false,
  enableAuditLogging: true,
  enableRateLimit: true,
  rateLimitWindow: 60,
  rateLimitMax: 100,
  enableCors: true,
  corsOrigins: [{ value: 'http://localhost:3000' }],
  enableSecurityHeaders: true,
  enableApiKeyAuth: true,
};

const SettingsSecurity: React.FC = () => {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<SecurityConfig>({
    resolver: zodResolver(securitySettingsSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'corsOrigins',
  });

  const [newOrigin, setNewOrigin] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const { showStamp } = useSavedStamp();

  const enableAuthentication = watch('enableAuthentication');
  const enableRateLimit = watch('enableRateLimit');

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data: any = await apiService.getGlobalConfig();

      const config = data.config || {};
      reset({
        enableAuthentication: config.auth?.enabled?.value !== false,
        sessionTimeout: 3600,
        maxLoginAttempts: 5,
        lockoutDuration: 900,
        enableTwoFactor: false,
        enableAuditLogging: true,
        enableRateLimit: config.rateLimit?.enabled?.value !== false,
        rateLimitMax: config.rateLimit?.maxRequests?.value || 100,
        rateLimitWindow: config.rateLimit?.windowMs?.value ? config.rateLimit.windowMs.value / 1000 : 60,
        enableCors: true,
        corsOrigins: (config.cors?.origins?.value || ['http://localhost:3000']).map((o: string) => ({ value: o })),
        enableSecurityHeaders: true,
        enableApiKeyAuth: true,
      });
    } catch (_error) {
      debug('ERROR:', 'Failed to load security settings:', error);
    } finally {
      setLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleAddOrigin = () => {
    if (newOrigin && !fields.some(f => f.value === newOrigin)) {
      append({ value: newOrigin });
      setNewOrigin('');
    }
  };

  const onSubmit = async (values: SecurityConfig) => {
    setIsSaving(true);
    try {
      await apiService.updateGlobalConfig({
        'auth.enabled': values.enableAuthentication,
        'rateLimit.enabled': values.enableRateLimit,
        'rateLimit.maxRequests': values.rateLimitMax,
        'rateLimit.windowMs': values.rateLimitWindow * 1000,
      });
      setAlert({ type: 'success', message: 'Security settings saved!' });
      showStamp();
      setTimeout(() => setAlert(null), 3000);
    } catch (_error) {
      setAlert({ type: 'error', message: 'Failed to save. Some settings require environment variables.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-6 px-4">
        <SkeletonList items={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <div>
            <h5 className="text-lg font-bold">Security Settings</h5>
            <p className="text-sm text-base-content/70">Configure authentication and security policies</p>
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
          {/* Authentication */}
          <Card className="bg-base-200/50 p-4">
            <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-primary rounded-full"></span>
              Authentication
            </h6>

            <div className="space-y-3">
              <div className="form-control">
                <label className="label cursor-pointer py-1">
                  <span className="label-text text-sm">Enable authentication</span>
                  <Controller
                    name="enableAuthentication"
                    control={control}
                    render={({ field }) => (
                      <Toggle
                        checked={field.value}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.checked)}
                        size="sm"
                      />
                    )}
                  />
                </label>
              </div>

              <div className={`form-control transition-all duration-200 ${!enableAuthentication ? 'opacity-50 pointer-events-none' : ''}`}>
                <FormField label="Session Timeout (seconds)" error={errors.sessionTimeout}>
                  <Input
                    type="number"
                    {...register('sessionTimeout')}
                    disabled={!enableAuthentication}
                    size="sm"
                    aria-label="Session timeout in seconds"
                  />
                </FormField>
              </div>

              <div className={`form-control transition-all duration-200 ${!enableAuthentication ? 'opacity-50 pointer-events-none' : ''}`}>
                <label className="label cursor-pointer py-1">
                  <span className="label-text text-sm">Two-factor authentication</span>
                  <Controller
                    name="enableTwoFactor"
                    control={control}
                    render={({ field }) => (
                      <Toggle
                        checked={field.value}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.checked)}
                        disabled={!enableAuthentication}
                        size="sm"
                        aria-label="Enable two-factor authentication"
                      />
                    )}
                  />
                </label>
              </div>
            </div>
          </Card>

          {/* Rate Limiting */}
          <Card className="bg-base-200/50 p-4">
            <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-warning rounded-full"></span>
              Rate Limiting
            </h6>

            <div className="space-y-3">
              <div className="form-control">
                <label className="label cursor-pointer py-1">
                  <span className="label-text text-sm">Enable rate limiting</span>
                  <Controller
                    name="enableRateLimit"
                    control={control}
                    render={({ field }) => (
                      <Toggle
                        checked={field.value}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.checked)}
                        size="sm"
                      />
                    )}
                  />
                </label>
              </div>

              <div className={`form-control transition-all duration-200 ${!enableRateLimit ? 'opacity-50 pointer-events-none' : ''}`}>
                <FormField label="Time Window (seconds)" error={errors.rateLimitWindow}>
                  <Input
                    type="number"
                    {...register('rateLimitWindow')}
                    disabled={!enableRateLimit}
                    size="sm"
                    aria-label="Rate limit time window in seconds"
                  />
                </FormField>
              </div>

              <div className={`form-control transition-all duration-200 ${!enableRateLimit ? 'opacity-50 pointer-events-none' : ''}`}>
                <FormField label="Max Requests per Window" error={errors.rateLimitMax}>
                  <Input
                    type="number"
                    {...register('rateLimitMax')}
                    disabled={!enableRateLimit}
                    size="sm"
                    aria-label="Maximum requests per time window"
                  />
                </FormField>
              </div>
            </div>
          </Card>

          {/* CORS */}
          <Card className="bg-base-200/50 p-4 lg:col-span-2">
            <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-accent rounded-full"></span>
              CORS Configuration
            </h6>

            <div className="flex gap-2 mb-3">
              <Input
                value={newOrigin}
                onChange={(e) => setNewOrigin(e.target.value)}
                placeholder="https://example.com"
                size="sm"
                className="flex-grow"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddOrigin}
                disabled={!newOrigin}
              >
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {fields.map((field, index) => (
                <Badge key={field.id} size="lg" className="gap-2 bg-base-300">
                  {field.value}
                  <Tooltip content={`Remove ${field.value}`}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => remove(index)}
                      className="hover:text-error hover:bg-transparent h-auto min-h-0 p-1 rounded-full"
                      aria-label={`Remove origin ${field.value}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </Tooltip>
                </Badge>
              ))}
              {fields.length === 0 && (
                <span className="text-base-content/50 text-sm italic">No origins configured</span>
              )}
            </div>
          </Card>

          {/* Security Features */}
          <Card className="bg-base-200/50 p-4 lg:col-span-2">
            <h6 className="text-md font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-success rounded-full"></span>
              Security Features
            </h6>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-control">
                <label className="label cursor-pointer py-1">
                  <span className="label-text text-sm">Security headers</span>
                  <Controller
                    name="enableSecurityHeaders"
                    control={control}
                    render={({ field }) => (
                      <Toggle
                        checked={field.value}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.checked)}
                        size="sm"
                      />
                    )}
                  />
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer py-1">
                  <span className="label-text text-sm">Audit logging</span>
                  <Controller
                    name="enableAuditLogging"
                    control={control}
                    render={({ field }) => (
                      <Toggle
                        checked={field.value}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.checked)}
                        size="sm"
                      />
                    )}
                  />
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer py-1">
                  <span className="label-text text-sm">API key auth</span>
                  <Controller
                    name="enableApiKeyAuth"
                    control={control}
                    render={({ field }) => (
                      <Toggle
                        checked={field.value}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.checked)}
                        size="sm"
                      />
                    )}
                  />
                </label>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            variant="primary"
            loading={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Security Settings'}
          </Button>
        </div>
      </form>

      <Divider className="mt-8 mb-6" />

      {/* Secure Configuration Management Section */}
      <div className="mt-8">
        <SecureConfigManager />
      </div>
    </div>
  );
};

export default SettingsSecurity;
