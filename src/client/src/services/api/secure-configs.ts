import type { ApiService } from './core';
import type { SecureConfig } from './types';

export function secureConfigsMixin(api: ApiService) {
  return {
    getSecureConfigs(): Promise<{ configs: SecureConfig[] }> {
      return api.request('/api/secure-configs');
    },

    getSecureConfig(name: string): Promise<{ config: SecureConfig }> {
      return api.request(`/api/secure-configs/${name}`);
    },

    saveSecureConfig(name: string, data: Record<string, unknown>, encryptSensitive = true): Promise<{ success: boolean; message: string; config: SecureConfig }> {
      return api.request('/api/secure-configs', {
        method: 'POST',
        body: JSON.stringify({ name, data, encryptSensitive }),
      });
    },

    deleteSecureConfig(name: string): Promise<{ success: boolean; message: string }> {
      return api.request(`/api/secure-configs/${name}`, { method: 'DELETE' });
    },

    backupSecureConfigs(): Promise<{ success: boolean; message: string; backupFile: string }> {
      return api.request('/api/secure-configs/backup', { method: 'POST' });
    },

    restoreSecureConfigs(backupFile: string): Promise<{ success: boolean; message: string }> {
      return api.request('/api/secure-configs/restore', {
        method: 'POST',
        body: JSON.stringify({ backupFile }),
      });
    },

    getSecureConfigInfo(): Promise<{
      configDirectory: string;
      totalConfigs: number;
      directorySize: number;
      lastModified: string;
    }> {
      return api.request('/api/secure-configs/info');
    },
  };
}
