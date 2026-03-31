export interface ExportOptions {
  format: 'json' | 'yaml' | 'csv';
  includeVersions?: boolean;
  includeAuditLogs?: boolean;
  includeTemplates?: boolean;
  compress?: boolean;
  encrypt?: boolean;
  encryptionKey?: string;
}

export interface ImportOptions {
  format: 'json' | 'yaml' | 'csv';
  overwrite?: boolean;
  validateOnly?: boolean;
  skipValidation?: boolean;
  decryptionKey?: string;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  size?: number;
  checksum?: string;
  error?: string;
}

export interface ImportResult {
  success: boolean;
  importedCount?: number;
  skippedCount?: number;
  errorCount?: number;
  errors?: string[];
  warnings?: string[];
}

export interface BackupMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  createdBy: string;
  configCount: number;
  versionCount: number;
  templateCount: number;
  size: number;
  checksum: string;
  encrypted: boolean;
  compressed: boolean;
}
