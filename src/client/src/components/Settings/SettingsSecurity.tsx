
import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert } from '../DaisyUI/Alert';
import { Badge } from '../DaisyUI/Badge';
import Card from '../DaisyUI/Card';
import Button from '../DaisyUI/Button';
import Divider from '../DaisyUI/Divider';
import { SkeletonList } from '../DaisyUI/Skeleton';
import Input from '../DaisyUI/Input';
import { Shield, Plus, Trash2, Info } from 'lucide-react';
import Tooltip from '../DaisyUI/Tooltip';
import SecureConfigManager from '../SecureConfigManager';
import Debug from 'debug';
import { apiService } from '../../services/api';
import { useSavedStamp } from '../../contexts/SavedStampContext';
import { useToast } from '../DaisyUI/ToastNotification';
import { useDemoModeWarning } from '../../hooks/useDemoModeWarning';
const debug = Debug('app:client:components:Settings:SettingsSecurity');

/**
 * Only fields that are actually persisted and consumed by the server.
 *
 * CORS origins → `cors.origins` in user-config (read by src/server/corsOrigins.ts).
 *
 * Intentionally excluded (not global toggles / not persisted by this form):
 *  - 2FA: per-user via /api/auth/2fa/* (TotpService)
 *  - Account lockout: AUTH_MAX_LOGIN_ATTEMPTS / AUTH_LOCKOUT_DURATION_SECONDS env
 *  - Session timeout/idle: SESSION_MAX_AGE / SESSION_IDLE_TIMEOUT env
 *  - Rate limiting: RATE_LIMIT_* env + per-bot guard profiles
 *  - Security headers: always on via setupMiddleware
 *  - Audit logging / API key auth: not controlled by this form
 */
const securitySettingsSchema = z.object({
  corsOrigins: z.array(z.object({ value: z.string().min(1, 'Origin required') })),
});

type SecurityConfig = z.infer<typeof securitySettingsSchema>;

const defaultValues: SecurityConfig = {
  corsOrigins: [{ value: 'http://localhost:3000' }],
};

const SettingsSecurity: React.FC = () => {
  const {
    handleSubmit,
    control,
    reset,
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
  const { addToast } = useToast();
  const warnIfDemo = useDemoModeWarning(
    (type, title, message) => { addToast({ type, title, message }); }
  );

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data: any = await apiService.getGlobalConfig();

      const userSettings = data._userSettings?.values || {};
      const config = data.config || {};
      const rawOrigins =
        userSettings['cors.origins'] ??
        config.cors?.origins?.value ??
        ['http://localhost:3000'];
      const origins: string[] = Array.isArray(rawOrigins)
        ? rawOrigins
        : typeof rawOrigins === 'string'
          ? rawOrigins.split(',').map((s: string) => s.trim()).filter(Boolean)
          : ['http://localhost:3000'];

      reset({
        corsOrigins: (origins.length > 0 ? origins : ['http://localhost:3000']).map(
          (o: string) => ({ value: o })
        ),
      });
    } catch (error) {
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
    if (await warnIfDemo()) return;
    setIsSaving(true);
    try {
      await apiService.updateGlobalConfig({
        'cors.origins': values.corsOrigins.map((o) => o.value).filter(Boolean),
      });
      setAlert({ type: 'success', message: 'Security settings saved!' });
      showStamp();
      setTimeout(() => setAlert(null), 3000);
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Failed to save CORS origins. Check server logs and try again.',
      });
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
            <p className="text-sm text-base-content/70">
              Configure settings that persist and take effect at runtime
            </p>
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
          <Card className="bg-base-200/50 p-4 lg:col-span-2">
            <fieldset>
              <legend className="sr-only">CORS Configuration</legend>
              <h6 className="text-md font-semibold mb-4 flex items-center gap-2" aria-hidden="true">
                <span className="w-2 h-2 bg-accent rounded-full"></span>
                CORS Configuration
              </h6>
              <p className="text-xs text-base-content/60 mb-3">
                Saved to user config as <code className="text-xs">cors.origins</code> and applied
                by the server without restart. Localhost is always allowed for development.
              </p>

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
            {errors.corsOrigins && (
              <p className="text-error text-xs mt-2">
                {errors.corsOrigins.message || 'Invalid origins'}
              </p>
            )}
            </fieldset>
          </Card>

          <Card className="bg-base-200/50 p-4 lg:col-span-2">
            <div className="flex items-start gap-2 mb-3">
              <Info className="w-4 h-4 text-info mt-0.5 shrink-0" />
              <div>
                <h6 className="text-md font-semibold">Configured via environment / API</h6>
                <p className="text-xs text-base-content/60">
                  These controls are not toggles here because they are not global form fields.
                  Use the listed env vars or APIs so production policy is explicit.
                </p>
              </div>
            </div>
            <ul className="text-sm space-y-2 list-disc list-inside text-base-content/80">
              <li>
                <strong>Two-factor auth (TOTP)</strong> — per-user enrollment via{' '}
                <code className="text-xs">/api/auth/2fa/*</code> (not a global switch).
              </li>
              <li>
                <strong>Account lockout</strong> —{' '}
                <code className="text-xs">AUTH_MAX_LOGIN_ATTEMPTS</code>,{' '}
                <code className="text-xs">AUTH_LOCKOUT_DURATION_SECONDS</code>.
              </li>
              <li>
                <strong>Session lifetime / idle timeout</strong> —{' '}
                <code className="text-xs">SESSION_MAX_AGE</code>,{' '}
                <code className="text-xs">SESSION_IDLE_TIMEOUT</code>.
              </li>
              <li>
                <strong>HTTP rate limiting</strong> —{' '}
                <code className="text-xs">RATE_LIMIT_*</code> env vars and per-bot guard profiles.
              </li>
              <li>
                <strong>Security headers</strong> — always applied by the server middleware.
              </li>
              <li>
                <strong>Tenant isolation</strong> — opt-in via{' '}
                <code className="text-xs">TENANT_ISOLATION_ENABLED=true</code> (requires{' '}
                <code className="text-xs">X-Tenant-Id</code>).
              </li>
            </ul>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" variant="primary" loading={isSaving}>
            {isSaving ? 'Saving...' : 'Save Security Settings'}
          </Button>
        </div>
      </form>

      <Divider className="mt-8 mb-6" />

      <div className="mt-8">
        <SecureConfigManager />
      </div>
    </div>
  );
};

export default SettingsSecurity;
