import { baseClient, buildUrl } from './baseClient';

export const systemApi = {
  listSystemBackups: async (): Promise<any[]> => {
    const res = await baseClient.get<{ success: boolean; data: any[] }>('/api/import-export/backups');
    return res.data || [];
  },

  createSystemBackup: async (options: {
    name: string;
    description?: string;
    encrypt?: boolean;
    encryptionKey?: string;
  }): Promise<{ success: boolean; message: string; data: any }> => {
    return baseClient.post('/api/import-export/backup', options);
  },

  restoreSystemBackup: async (backupId: string, options: {
    overwrite?: boolean;
    decryptionKey?: string;
  } = {}): Promise<{ success: boolean; message: string }> => {
    return baseClient.post(`/api/import-export/backups/${backupId}/restore`, options);
  },

  deleteSystemBackup: async (backupId: string): Promise<{ success: boolean; message: string }> => {
    return baseClient.delete(`/api/import-export/backups/${backupId}`);
  },

  downloadSystemBackup: async (backupId: string): Promise<Blob> => {
    const url = buildUrl(`/api/import-export/backups/${backupId}/download`);
    const headers = baseClient.getAuthHeaders();

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    return response.blob();
  },

  getSystemInfo: async (): Promise<any> => {
    return baseClient.get('/api/admin/system-info');
  },

  getEnvOverrides: async (): Promise<any> => {
    return baseClient.get('/api/admin/env-overrides');
  }
};
