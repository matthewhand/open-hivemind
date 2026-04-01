/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiService } from './core';

export function adminMixin(api: ApiService) {
  return {
    clearCache(): Promise<{ success: boolean; message: string }> {
      return api.request('/api/cache/clear', { method: 'POST' });
    },

    getSystemInfo(): Promise<any> {
      return api.request('/api/admin/system-info');
    },

    getEnvOverrides(): Promise<any> {
      return api.request('/api/admin/env-overrides');
    },

    // Import/Export Backup Methods
    listSystemBackups(): Promise<any[]> {
      return api.request<{ success: boolean; data: any[] }>('/api/import-export/backups')
        .then(res => res.data || []);
    },

    createSystemBackup(options: {
      name: string;
      description?: string;
      encrypt?: boolean;
      encryptionKey?: string;
    }): Promise<{ success: boolean; message: string; data: any }> {
      return api.request('/api/import-export/backup', {
        method: 'POST',
        body: JSON.stringify(options),
      });
    },

    restoreSystemBackup(backupId: string, options: {
      overwrite?: boolean;
      decryptionKey?: string;
    } = {}): Promise<{ success: boolean; message: string }> {
      return api.request(`/api/import-export/backups/${backupId}/restore`, {
        method: 'POST',
        body: JSON.stringify(options),
      });
    },

    deleteSystemBackup(backupId: string): Promise<{ success: boolean; message: string }> {
      return api.request(`/api/import-export/backups/${backupId}`, {
        method: 'DELETE',
      });
    },

    downloadSystemBackup(backupId: string): Promise<Blob> {
      return api.getBlob(`/api/import-export/backups/${backupId}/download`);
    },
  };
}
