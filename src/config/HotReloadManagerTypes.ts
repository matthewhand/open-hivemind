
export interface ConfigurationChange {
  id: string;
  timestamp: string;
  type: 'create' | 'update' | 'delete';
  botName?: string;
  changes: Record<string, unknown>;
  previousConfig?: Record<string, unknown>;
  userId?: string;
  validated: boolean;
  applied: boolean;
  rollbackAvailable: boolean;
}

export interface HotReloadResult {
  success: boolean;
  message: string;
  affectedBots: string[];
  warnings: string[];
  errors: string[];
  rollbackId?: string;
}
