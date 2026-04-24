/**
 * Types for Real-Time Validation Service
 */

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: 'required' | 'format' | 'business' | 'security' | 'performance';
  severity: 'error' | 'warning' | 'info';
  validator: (config: Record<string, unknown>) => ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  info: ValidationInfo[];
  score: number; // 0-100, higher is better
}

export interface ValidationError {
  id: string;
  ruleId: string;
  message: string;
  field: string;
  value: unknown;
  expected?: unknown;
  suggestions?: string[];
  category: 'required' | 'format' | 'business' | 'security' | 'performance';
}

export interface ValidationWarning {
  id: string;
  ruleId: string;
  message: string;
  field: string;
  value: unknown;
  suggestions?: string[];
  category: 'required' | 'format' | 'business' | 'security' | 'performance';
}

export interface ValidationInfo {
  id: string;
  ruleId: string;
  message: string;
  field: string;
  value: unknown;
  suggestions?: string[];
  category: 'required' | 'format' | 'business' | 'security' | 'performance';
}

export interface ValidationReport {
  id: string;
  timestamp: Date;
  configId?: number;
  configName?: string;
  configVersion?: string;
  result: ValidationResult;
  executionTime: number;
  rulesExecuted: number;
}

export interface ValidationProfile {
  id: string;
  name: string;
  description: string;
  ruleIds: string[];
  isDefault: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ValidationSubscription {
  id: string;
  configId: number;
  clientId: string;
  profileId: string;
  isActive: boolean;
  lastValidated?: Date;
  createdAt: Date;
}
