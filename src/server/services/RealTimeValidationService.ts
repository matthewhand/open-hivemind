import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import Debug from 'debug';
import { inject, injectable, singleton, container } from 'tsyringe';
import { DatabaseManager } from '../../database/DatabaseManager';
import { BotConfigService } from './BotConfigService';
import { ConfigurationTemplateService } from './ConfigurationTemplateService';
import { ConfigurationValidator } from './ConfigurationValidator';
import {
  ValidationRule,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationInfo,
  ValidationReport,
  ValidationProfile,
  ValidationSubscription,
} from './validation/types';
import { basicRules } from './validation/rules/basicRules';
import { providerRules } from './validation/rules/providerRules';
import { securityRules, businessRules, performanceRules } from './validation/rules/securityRules';

const debug = Debug('app:RealTimeValidationService');

// Re-export types for backward compatibility
export {
  ValidationRule,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationInfo,
  ValidationReport,
  ValidationProfile,
  ValidationSubscription,
};

@singleton()
@injectable()
export class RealTimeValidationService extends EventEmitter {
  private static instance: RealTimeValidationService;
  private validationHistory: ValidationReport[] = [];
  private maxHistorySize = 100;
  private validationInterval: NodeJS.Timeout | null = null;
  private rules = new Map<string, ValidationRule>();
  private profiles = new Map<string, ValidationProfile>();
  private subscriptions = new Map<string, ValidationSubscription>();

  public constructor(
    @inject(ConfigurationValidator) private configValidator: ConfigurationValidator,
    @inject(BotConfigService) private botConfigService: BotConfigService,
    @inject(ConfigurationTemplateService) private templateService: ConfigurationTemplateService,
    @inject(DatabaseManager) private dbManager: DatabaseManager
  ) {
    super();
    this.initializeDefaultRules();
    this.initializeDefaultProfiles();
    this.setupEventHandlers();
  }

  public static getInstance(): RealTimeValidationService {
    return container.resolve(RealTimeValidationService);
  }

  /**
   * Initialize default validation rules
   */
  private initializeDefaultRules(): void {
    [...basicRules, ...providerRules, ...securityRules, ...businessRules, ...performanceRules].forEach(
      (rule) => this.addRule(rule)
    );
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
    const standardRuleIds = Array.from(this.rules.keys()).filter(
      (id) => !id.startsWith('performance-') // Exclude performance rules
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
    const quickRuleIds = Array.from(this.rules.keys()).filter(
      (id) => id.startsWith('required-') // Only required field rules
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
    this.validationInterval = setInterval(() => {
      this.validateSubscribedConfigurations().catch((error: unknown) => {
        debug('Error in periodic validation:', error);
      });
    }, 60000); // Validate every minute
  }

  /**
   * Clean up resources
   */
  public shutdown(): void {
    if (this.validationInterval) {
      if (typeof clearInterval === 'function') {
        clearInterval(this.validationInterval);
      }
      this.validationInterval = null;
    }
    this.removeAllListeners();
    debug('RealTimeValidationService shutdown completed');
  }

  public addRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule);
  }

  public removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      for (const profile of this.profiles.values()) {
        profile.ruleIds = profile.ruleIds.filter((id) => id !== ruleId);
      }
    }
    return removed;
  }

  public getRule(ruleId: string): ValidationRule | undefined {
    return this.rules.get(ruleId);
  }

  public getAllRules(): ValidationRule[] {
    return Array.from(this.rules.values());
  }

  public addProfile(profile: ValidationProfile): void {
    this.profiles.set(profile.id, profile);
  }

  public removeProfile(profileId: string): boolean {
    return this.profiles.delete(profileId);
  }

  public getProfile(profileId: string): ValidationProfile | undefined {
    return this.profiles.get(profileId);
  }

  public getAllProfiles(): ValidationProfile[] {
    return Array.from(this.profiles.values());
  }

  public async subscribe(configId: number, clientId: string, profileId = 'standard'): Promise<string> {
    const id = randomUUID();
    const subscription: ValidationSubscription = {
      id,
      configId,
      clientId,
      profileId,
      isActive: true,
      createdAt: new Date(),
    };
    this.subscriptions.set(id, subscription);
    return id;
  }

  public unsubscribe(configId: number, clientId: string): boolean {
    // In new API we use subscriptionId, but route still passes configId/clientId
    // Find subscription by configId and clientId
    const sub = Array.from(this.subscriptions.values()).find(
      (s) => s.configId === configId && s.clientId === clientId
    );
    if (sub) {
      return this.subscriptions.delete(sub.id);
    }
    return false;
  }

  public async validateConfig(
    config: Record<string, unknown>,
    profileId = 'standard'
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const profile = this.getProfile(profileId) || this.getProfile('standard');

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: ValidationInfo[] = [];

    if (profile) {
      for (const ruleId of profile.ruleIds) {
        const rule = this.getRule(ruleId);
        if (rule) {
          const result = rule.validator(config);
          errors.push(...result.errors);
          warnings.push(...result.warnings);
          info.push(...result.info);
        }
      }
    }

    const totalProblems = errors.length * 2 + warnings.length;
    const score = Math.max(0, 100 - totalProblems * 5);

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      info,
      score,
    };

    const report: ValidationReport = {
      id: randomUUID(),
      timestamp: new Date(),
      result,
      executionTime: Date.now() - startTime,
      rulesExecuted: profile?.ruleIds.length || 0,
    };

    this.addToHistory(report);
    return result;
  }

  private addToHistory(report: ValidationReport): void {
    this.validationHistory.unshift(report);
    if (this.validationHistory.length > this.maxHistorySize) {
      this.validationHistory.pop();
    }
    this.emit('validation:report', report);
  }

  public getHistory(): ValidationReport[] {
    return this.validationHistory;
  }

  // --- Backward compatibility aliases ---

  public async validateConfiguration(
    configId: number,
    profileId = 'standard',
    _clientId?: string
  ): Promise<ValidationReport> {
    const config = await this.dbManager.getBotConfiguration(configId);
    if (!config) throw new Error(`Configuration ${configId} not found`);

    const result = await this.validateConfig(config as any, profileId);
    return {
      id: randomUUID(),
      timestamp: new Date(),
      configId,
      result,
      executionTime: 0,
      rulesExecuted: 0,
    };
  }

  public validateConfigurationData(
    config: Record<string, unknown>,
    profileId = 'standard'
  ): ValidationResult {
    // Hack: route should be async, but if it calls this sync, we have a problem.
    // For now we'll return a placeholder or throw if not awaited properly.
    throw new Error('validateConfigurationData is deprecated, use validateConfig instead');
  }

  public getValidationHistory(_configId?: number, _limit = 20): ValidationReport[] {
    return this.getHistory();
  }

  public getValidationStatistics(): any {
    return {
      totalValidations: this.validationHistory.length,
      recentReport: this.validationHistory[0] || null,
    };
  }

  private async validateSubscribedConfigurations(): Promise<void> {
    for (const sub of this.subscriptions.values()) {
      if (sub.isActive) {
        try {
          const config = await this.dbManager.getBotConfiguration(sub.configId);
          if (config) {
            const result = await this.validateConfig(config as any, sub.profileId);
            this.emit('subscription:validated', {
              subscriptionId: sub.id,
              configId: sub.configId,
              result,
            });
            sub.lastValidated = new Date();
          }
        } catch (error) {
          debug(`Error validating subscription ${sub.id}:`, error);
        }
      }
    }
  }
}
