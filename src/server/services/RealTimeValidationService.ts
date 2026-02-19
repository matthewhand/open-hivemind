import { ConfigurationValidator } from './ConfigurationValidator';
import { BotConfigService } from './BotConfigService';
import { ConfigurationTemplateService } from './ConfigurationTemplateService';
import { DatabaseManager } from '../../database/DatabaseManager';
import Debug from 'debug';
import { EventEmitter } from 'events';

const debug = Debug('app:RealTimeValidationService');

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: 'required' | 'format' | 'business' | 'security' | 'performance';
  severity: 'error' | 'warning' | 'info';
  validator: (config: any) => ValidationResult;
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
  value: any;
  expected?: any;
  suggestions?: string[];
  category: 'required' | 'format' | 'business' | 'security' | 'performance';
}

export interface ValidationWarning {
  id: string;
  ruleId: string;
  message: string;
  field: string;
  value: any;
  suggestions?: string[];
  category: 'required' | 'format' | 'business' | 'security' | 'performance';
}

export interface ValidationInfo {
  id: string;
  ruleId: string;
  message: string;
  field: string;
  value: any;
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

export class RealTimeValidationService extends EventEmitter {
  private static instance: RealTimeValidationService;
  private configValidator: ConfigurationValidator;
  private botConfigService: BotConfigService;
  private templateService: ConfigurationTemplateService;
  private dbManager: DatabaseManager;
  private rules: Map<string, ValidationRule> = new Map();
  private profiles: Map<string, ValidationProfile> = new Map();
  private subscriptions: Map<string, ValidationSubscription> = new Map();
  private validationHistory: ValidationReport[] = [];
  private maxHistorySize = 100;

  private constructor() {
    super();
    this.configValidator = new ConfigurationValidator();
    this.botConfigService = BotConfigService.getInstance();
    this.templateService = ConfigurationTemplateService.getInstance();
    this.dbManager = DatabaseManager.getInstance();
    this.initializeDefaultRules();
    this.initializeDefaultProfiles();
    this.setupEventHandlers();
  }

  public static getInstance(): RealTimeValidationService {
    if (!RealTimeValidationService.instance) {
      RealTimeValidationService.instance = new RealTimeValidationService();
    }
    return RealTimeValidationService.instance;
  }

  /**
   * Initialize default validation rules
   */
  private initializeDefaultRules(): void {
    // Required field validation rules
    this.addRule({
      id: 'required-name',
      name: 'Bot Name Required',
      description: 'Bot configuration must have a name',
      category: 'required',
      severity: 'error',
      validator: (config: any) => {
        const errors: ValidationError[] = [];
        if (!config.name || config.name.trim() === '') {
          errors.push({
            id: 'req-name-1',
            ruleId: 'required-name',
            message: 'Bot name is required',
            field: 'name',
            value: config.name,
            suggestions: ['Provide a unique name for your bot configuration'],
            category: 'required',
          });
        }
        return {
          isValid: errors.length === 0,
          errors,
          warnings: [],
          info: [],
          score: errors.length === 0 ? 100 : 0,
        };
      },
    });

    this.addRule({
      id: 'required-message-provider',
      name: 'Message Provider Required',
      description: 'Bot configuration must specify a message provider',
      category: 'required',
      severity: 'error',
      validator: (config: any) => {
        const errors: ValidationError[] = [];
        if (!config.messageProvider || config.messageProvider.trim() === '') {
          errors.push({
            id: 'req-msg-1',
            ruleId: 'required-message-provider',
            message: 'Message provider is required',
            field: 'messageProvider',
            value: config.messageProvider,
            suggestions: ['Select a message provider: discord, slack, mattermost, or webhook'],
            category: 'required',
          });
        }
        return {
          isValid: errors.length === 0,
          errors,
          warnings: [],
          info: [],
          score: errors.length === 0 ? 100 : 0,
        };
      },
    });

    this.addRule({
      id: 'required-llm-provider',
      name: 'LLM Provider Required',
      description: 'Bot configuration must specify an LLM provider',
      category: 'required',
      severity: 'error',
      validator: (config: any) => {
        const errors: ValidationError[] = [];
        if (!config.llmProvider || config.llmProvider.trim() === '') {
          errors.push({
            id: 'req-llm-1',
            ruleId: 'required-llm-provider',
            message: 'LLM provider is required',
            field: 'llmProvider',
            value: config.llmProvider,
            suggestions: ['Select an LLM provider: openai, flowise, or openwebui'],
            category: 'required',
          });
        }
        return {
          isValid: errors.length === 0,
          errors,
          warnings: [],
          info: [],
          score: errors.length === 0 ? 100 : 0,
        };
      },
    });

    // Format validation rules
    this.addRule({
      id: 'format-bot-name',
      name: 'Bot Name Format',
      description: 'Bot name must follow naming conventions',
      category: 'format',
      severity: 'error',
      validator: (config: any) => {
        const errors: ValidationError[] = [];
        if (config.name && !/^[a-zA-Z0-9_-]{1,100}$/.test(config.name)) {
          errors.push({
            id: 'fmt-name-1',
            ruleId: 'format-bot-name',
            message: 'Bot name must be 1-100 characters and contain only letters, numbers, underscores, and hyphens',
            field: 'name',
            value: config.name,
            expected: '^[a-zA-Z0-9_-]{1,100}$',
            suggestions: ['Use only alphanumeric characters, underscores, and hyphens'],
            category: 'format',
          });
        }
        return {
          isValid: errors.length === 0,
          errors,
          warnings: [],
          info: [],
          score: errors.length === 0 ? 100 : 0,
        };
      },
    });

    // Discord-specific validation rules
    this.addRule({
      id: 'discord-token',
      name: 'Discord Token',
      description: 'Discord bot token must be provided when using Discord as message provider',
      category: 'required',
      severity: 'error',
      validator: (config: any) => {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        
        if (config.messageProvider === 'discord') {
          if (!config.discord || !config.discord.token) {
            errors.push({
              id: 'discord-token-1',
              ruleId: 'discord-token',
              message: 'Discord bot token is required when using Discord as message provider',
              field: 'discord.token',
              value: config.discord?.token,
              suggestions: ['Provide your Discord bot token from the Discord Developer Portal'],
              category: 'required',
            });
          } else if (!/^[\w-]+\.[\w-]+\.[\w-]+$/.test(config.discord.token)) {
            warnings.push({
              id: 'discord-token-2',
              ruleId: 'discord-token',
              message: 'Discord token format appears invalid',
              field: 'discord.token',
              value: '***REDACTED***',
              suggestions: ['Verify your Discord token format: it should be "BotToken.AppID.Secret"'],
              category: 'required',
            });
          }
        }
        
        return {
          isValid: errors.length === 0,
          errors,
          warnings,
          info: [],
          score: errors.length === 0 ? (warnings.length === 0 ? 100 : 80) : 0,
        };
      },
    });

    // OpenAI-specific validation rules
    this.addRule({
      id: 'openai-api-key',
      name: 'OpenAI API Key',
      description: 'OpenAI API key must be provided when using OpenAI as LLM provider',
      category: 'required',
      severity: 'error',
      validator: (config: any) => {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        
        if (config.llmProvider === 'openai') {
          if (!config.openai || !config.openai.apiKey) {
            errors.push({
              id: 'openai-key-1',
              ruleId: 'openai-api-key',
              message: 'OpenAI API key is required when using OpenAI as LLM provider',
              field: 'openai.apiKey',
              value: config.openai?.apiKey,
              suggestions: ['Provide your OpenAI API key from the OpenAI dashboard'],
              category: 'required',
            });
          } else if (!/^sk-[A-Za-z0-9]+$/.test(config.openai.apiKey)) {
            warnings.push({
              id: 'openai-key-2',
              ruleId: 'openai-api-key',
              message: 'OpenAI API key format appears invalid',
              field: 'openai.apiKey',
              value: '***REDACTED***',
              suggestions: ['Verify your OpenAI API key format: it should start with "sk-"'],
              category: 'required',
            });
          }
        }
        
        return {
          isValid: errors.length === 0,
          errors,
          warnings,
          info: [],
          score: errors.length === 0 ? (warnings.length === 0 ? 100 : 80) : 0,
        };
      },
    });

    // Business logic validation rules
    this.addRule({
      id: 'business-unique-name',
      name: 'Unique Bot Name',
      description: 'Bot name must be unique across all configurations',
      category: 'business',
      severity: 'error',
      validator: (config: any) => {
        const errors: ValidationError[] = [];
        
        if (config.name) {
          // This is a synchronous validator for simplicity
          // In a real implementation, you would make this async
          errors.push({
            id: 'biz-name-1',
            ruleId: 'business-unique-name',
            message: `Bot name "${config.name}" must be unique`,
            field: 'name',
            value: config.name,
            suggestions: [`Consider using "${config.name}-2" or a different name`],
            category: 'business',
          });
        }
        
        return {
          isValid: errors.length === 0,
          errors,
          warnings: [],
          info: [],
          score: errors.length === 0 ? 100 : 0,
        };
      },
    });

    // Security validation rules
    this.addRule({
      id: 'security-no-hardcoded-secrets',
      name: 'No Hardcoded Secrets',
      description: 'Configuration should not contain hardcoded secrets or API keys',
      category: 'security',
      severity: 'warning',
      validator: (config: any) => {
        const warnings: ValidationWarning[] = [];
        const configStr = JSON.stringify(config);
        
        // Check for potential hardcoded secrets
        const secretPatterns = [
          /"apiKey":\s*"[^${]+"/,
          /"token":\s*"[^${]+"/,
          /"secret":\s*"[^${]+"/,
          /"password":\s*"[^${]+"/,
        ];
        
        for (const pattern of secretPatterns) {
          if (pattern.test(configStr)) {
            warnings.push({
              id: 'sec-secrets-1',
              ruleId: 'security-no-hardcoded-secrets',
              message: 'Potential hardcoded secret detected in configuration',
              field: 'config',
              value: '***REDACTED***',
              suggestions: [
                'Use environment variables with ${VAR_NAME} syntax',
                'Store secrets in a secure configuration management system',
              ],
              category: 'security',
            });
            break;
          }
        }
        
        return {
          isValid: true,
          errors: [],
          warnings,
          info: [],
          score: warnings.length === 0 ? 100 : 70,
        };
      },
    });

    // Performance validation rules
    this.addRule({
      id: 'performance-model-selection',
      name: 'Model Performance',
      description: 'Check if selected LLM model is appropriate for the use case',
      category: 'performance',
      severity: 'info',
      validator: (config: any) => {
        const info: ValidationInfo[] = [];
        
        if (config.llmProvider === 'openai' && config.openai?.model) {
          const model = config.openai.model;
          
          if (model === 'gpt-4') {
            info.push({
              id: 'perf-model-1',
              ruleId: 'performance-model-selection',
              message: 'Using GPT-4 model - consider performance implications',
              field: 'openai.model',
              value: model,
              suggestions: [
                'GPT-4 is powerful but slower and more expensive',
                'Consider GPT-3.5-turbo for faster responses and lower cost',
              ],
              category: 'performance',
            });
          } else if (model === 'gpt-3.5-turbo') {
            info.push({
              id: 'perf-model-2',
              ruleId: 'performance-model-selection',
              message: 'Using GPT-3.5-turbo - good balance of performance and cost',
              field: 'openai.model',
              value: model,
              suggestions: [
                'GPT-3.5-turbo offers fast responses at a lower cost',
                'Consider GPT-4 for complex reasoning tasks',
              ],
              category: 'performance',
            });
          }
        }
        
        return {
          isValid: true,
          errors: [],
          warnings: [],
          info,
          score: 100,
        };
      },
    });

    debug(`Initialized ${this.rules.size} validation rules`);
  }

  /**
   * Initialize default validation profiles
   */
  private initializeDefaultProfiles(): void {
    // Strict profile - all rules enabled
    this.addProfile({
      id: 'strict',
      name: 'Strict Validation',
      description: 'All validation rules enabled, maximum security and compliance',
      ruleIds: Array.from(this.rules.keys()),
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Standard profile - most rules enabled
    const standardRuleIds = Array.from(this.rules.keys()).filter(id => 
      !id.startsWith('performance-'), // Exclude performance rules
    );
    
    this.addProfile({
      id: 'standard',
      name: 'Standard Validation',
      description: 'Standard validation with essential security and business rules',
      ruleIds: standardRuleIds,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Quick profile - only required fields
    const quickRuleIds = Array.from(this.rules.keys()).filter(id => 
      id.startsWith('required-'), // Only required field rules
    );
    
    this.addProfile({
      id: 'quick',
      name: 'Quick Validation',
      description: 'Basic validation of required fields only',
      ruleIds: quickRuleIds,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    debug(`Initialized ${this.profiles.size} validation profiles`);
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Periodic validation for subscribed configurations
    setInterval(() => {
      this.validateSubscribedConfigurations().catch((error: any) => {
        debug('Error in periodic validation:', error);
      });
    }, 60000); // Validate every minute
  }

  /**
   * Add a validation rule
   */
  public addRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule);
    debug(`Added validation rule: ${rule.name}`);
  }

  /**
   * Remove a validation rule
   */
  public removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      debug(`Removed validation rule: ${ruleId}`);
      
      // Remove from all profiles
      for (const profile of this.profiles.values()) {
        profile.ruleIds = profile.ruleIds.filter(id => id !== ruleId);
      }
    }
    return removed;
  }

  /**
   * Get a validation rule
   */
  public getRule(ruleId: string): ValidationRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all validation rules
   */
  public getAllRules(): ValidationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Add a validation profile
   */
  public addProfile(profile: ValidationProfile): void {
    this.profiles.set(profile.id, profile);
    debug(`Added validation profile: ${profile.name}`);
  }

  /**
   * Remove a validation profile
   */
  public removeProfile(profileId: string): boolean {
    const removed = this.profiles.delete(profileId);
    if (removed) {
      debug(`Removed validation profile: ${profileId}`);
      
      // Remove related subscriptions
      for (const [subId, sub] of this.subscriptions) {
        if (sub.profileId === profileId) {
          this.subscriptions.delete(subId);
        }
      }
    }
    return removed;
  }

  /**
   * Get a validation profile
   */
  public getProfile(profileId: string): ValidationProfile | undefined {
    return this.profiles.get(profileId);
  }

  /**
   * Get all validation profiles
   */
  public getAllProfiles(): ValidationProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Validate a configuration
   */
  public async validateConfiguration(
    configId: number,
    profileId: string = 'standard',
    clientId?: string,
  ): Promise<ValidationReport> {
    const startTime = Date.now();
    
    try {
      // Get configuration
      const config = await this.botConfigService.getBotConfig(configId);
      if (!config) {
        throw new Error(`Configuration with ID ${configId} not found`);
      }

      // Get validation profile
      const profile = this.profiles.get(profileId);
      if (!profile) {
        throw new Error(`Validation profile with ID ${profileId} not found`);
      }

      // Execute validation rules
      const allErrors: ValidationError[] = [];
      const allWarnings: ValidationWarning[] = [];
      const allInfo: ValidationInfo[] = [];
      let rulesExecuted = 0;

      for (const ruleId of profile.ruleIds) {
        const rule = this.rules.get(ruleId);
        if (rule) {
          try {
            const result = rule.validator(config);
            allErrors.push(...result.errors);
            allWarnings.push(...result.warnings);
            allInfo.push(...result.info);
            rulesExecuted++;
          } catch (error) {
            debug(`Error executing rule ${ruleId}:`, error);
            
            // Add error for failed rule execution
            allErrors.push({
              id: `rule-error-${ruleId}`,
              ruleId,
              message: `Validation rule execution failed: ${(error as any).message}`,
              field: 'system',
              value: null,
              category: 'required',
            });
          }
        }
      }

      // Calculate overall score
      const errorWeight = 10;
      const warningWeight = 3;
      const infoWeight = 1;
      const totalDeductions = (allErrors.length * errorWeight) + 
                             (allWarnings.length * warningWeight) + 
                             (allInfo.length * infoWeight);
      const maxPossibleDeductions = rulesExecuted * errorWeight;
      const score = maxPossibleDeductions > 0 ? 
        Math.max(0, 100 - (totalDeductions / maxPossibleDeductions) * 100) : 100;

      // Create validation result
      const result: ValidationResult = {
        isValid: allErrors.length === 0,
        errors: allErrors,
        warnings: allWarnings,
        info: allInfo,
        score: Math.round(score),
      };

      // Create validation report
      const report: ValidationReport = {
        id: this.generateReportId(),
        timestamp: new Date(),
        configId,
        configName: config.name,
        result,
        executionTime: Date.now() - startTime,
        rulesExecuted,
      };

      // Store in history
      this.addToHistory(report);

      // Update subscription if provided
      if (clientId) {
        const subId = this.getSubscriptionId(configId, clientId);
        const sub = this.subscriptions.get(subId);
        if (sub) {
          sub.lastValidated = new Date();
        }
      }

      // Emit events
      this.emit('validationCompleted', report);
      if (!result.isValid) {
        this.emit('validationFailed', report);
      }

      debug(`Validated configuration ${config.name} (${configId}): ${result.isValid ? 'VALID' : 'INVALID'} (${result.score}/100)`);
      
      return report;
    } catch (error) {
      debug('Error validating configuration:', error);
      
      // Create error report
      const report: ValidationReport = {
        id: this.generateReportId(),
        timestamp: new Date(),
        configId,
        result: {
          isValid: false,
          errors: [{
            id: 'validation-error',
            ruleId: 'system',
            message: `Validation failed: ${(error as any).message}`,
            field: 'system',
            value: null,
            category: 'required',
          }],
          warnings: [],
          info: [],
          score: 0,
        },
        executionTime: Date.now() - startTime,
        rulesExecuted: 0,
      };

      this.addToHistory(report);
      this.emit('validationError', report);
      
      return report;
    }
  }

  /**
   * Validate configuration data directly
   */
  public validateConfigurationData(
    configData: any,
    profileId: string = 'standard',
  ): ValidationResult {
    try {
      // Get validation profile
      const profile = this.profiles.get(profileId);
      if (!profile) {
        throw new Error(`Validation profile with ID ${profileId} not found`);
      }

      // Execute validation rules
      const allErrors: ValidationError[] = [];
      const allWarnings: ValidationWarning[] = [];
      const allInfo: ValidationInfo[] = [];
      let rulesExecuted = 0;

      for (const ruleId of profile.ruleIds) {
        const rule = this.rules.get(ruleId);
        if (rule) {
          try {
            const result = rule.validator(configData);
            allErrors.push(...result.errors);
            allWarnings.push(...result.warnings);
            allInfo.push(...result.info);
            rulesExecuted++;
          } catch (error) {
            debug(`Error executing rule ${ruleId}:`, error);
            
            // Add error for failed rule execution
            allErrors.push({
              id: `rule-error-${ruleId}`,
              ruleId,
              message: `Validation rule execution failed: ${(error as any).message}`,
              field: 'system',
              value: null,
              category: 'required',
            });
          }
        }
      }

      // Calculate overall score
      const errorWeight = 10;
      const warningWeight = 3;
      const infoWeight = 1;
      const totalDeductions = (allErrors.length * errorWeight) + 
                             (allWarnings.length * warningWeight) + 
                             (allInfo.length * infoWeight);
      const maxPossibleDeductions = rulesExecuted * errorWeight;
      const score = maxPossibleDeductions > 0 ? 
        Math.max(0, 100 - (totalDeductions / maxPossibleDeductions) * 100) : 100;

      return {
        isValid: allErrors.length === 0,
        errors: allErrors,
        warnings: allWarnings,
        info: allInfo,
        score: Math.round(score),
      };
    } catch (error) {
      debug('Error validating configuration data:', error);
      
      return {
        isValid: false,
        errors: [{
          id: 'validation-error',
          ruleId: 'system',
          message: `Validation failed: ${(error as any).message}`,
          field: 'system',
          value: null,
          category: 'required',
        }],
        warnings: [],
        info: [],
        score: 0,
      };
    }
  }

  /**
   * Subscribe to real-time validation for a configuration
   */
  public subscribe(
    configId: number,
    clientId: string,
    profileId: string = 'standard',
  ): ValidationSubscription {
    const subId = this.getSubscriptionId(configId, clientId);
    
    let subscription = this.subscriptions.get(subId);
    if (subscription) {
      // Update existing subscription
      subscription.profileId = profileId;
      subscription.isActive = true;
    } else {
      // Create new subscription
      subscription = {
        id: subId,
        configId,
        clientId,
        profileId,
        isActive: true,
        createdAt: new Date(),
      };
      this.subscriptions.set(subId, subscription);
    }

    debug(`Subscribed client ${clientId} to validation for config ${configId}`);
    
    // Perform initial validation
    this.validateConfiguration(configId, profileId, clientId).catch((error: any) => {
      debug('Error in initial validation for subscription:', error);
    });

    return subscription;
  }

  /**
   * Unsubscribe from real-time validation
   */
  public unsubscribe(configId: number, clientId: string): boolean {
    const subId = this.getSubscriptionId(configId, clientId);
    const removed = this.subscriptions.delete(subId);
    
    if (removed) {
      debug(`Unsubscribed client ${clientId} from validation for config ${configId}`);
    }
    
    return removed;
  }

  /**
   * Get validation history
   */
  public getValidationHistory(
    configId?: number,
    limit: number = 50,
  ): ValidationReport[] {
    let history = this.validationHistory;
    
    if (configId) {
      history = history.filter(report => report.configId === configId);
    }
    
    return history.slice(0, limit);
  }

  /**
   * Get validation statistics
   */
  public getValidationStatistics(): {
    totalReports: number;
    validReports: number;
    invalidReports: number;
    averageScore: number;
    averageExecutionTime: number;
    rulesCount: number;
    profilesCount: number;
    activeSubscriptions: number;
    } {
    const totalReports = this.validationHistory.length;
    const validReports = this.validationHistory.filter(r => r.result.isValid).length;
    const invalidReports = totalReports - validReports;
    
    const averageScore = totalReports > 0 ?
      this.validationHistory.reduce((sum, r) => sum + r.result.score, 0) / totalReports : 0;
    
    const averageExecutionTime = totalReports > 0 ?
      this.validationHistory.reduce((sum, r) => sum + r.executionTime, 0) / totalReports : 0;

    const activeSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.isActive).length;

    return {
      totalReports,
      validReports,
      invalidReports,
      averageScore: Math.round(averageScore),
      averageExecutionTime: Math.round(averageExecutionTime),
      rulesCount: this.rules.size,
      profilesCount: this.profiles.size,
      activeSubscriptions,
    };
  }

  /**
   * Validate all subscribed configurations
   */
  private async validateSubscribedConfigurations(): Promise<void> {
    const activeSubs = Array.from(this.subscriptions.values())
      .filter(sub => sub.isActive);

    for (const sub of activeSubs) {
      try {
        await this.validateConfiguration(sub.configId, sub.profileId, sub.clientId);
      } catch (error) {
        debug(`Error validating subscribed config ${sub.configId}:`, error);
      }
    }
  }

  /**
   * Add report to history
   */
  private addToHistory(report: ValidationReport): void {
    this.validationHistory.unshift(report);
    
    // Limit history size
    if (this.validationHistory.length > this.maxHistorySize) {
      this.validationHistory = this.validationHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Generate report ID
   */
  private generateReportId(): string {
    return 'val-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get subscription ID
   */
  private getSubscriptionId(configId: number, clientId: string): string {
    return `sub-${configId}-${clientId}`;
  }
}