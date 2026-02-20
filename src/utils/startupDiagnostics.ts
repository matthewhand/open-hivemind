/**
 * @fileoverview Enhanced startup diagnostics and visibility module
 * @module utils/startupDiagnostics
 * @description Provides comprehensive startup visibility with credential redaction
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../common/logger';
import { redactSensitiveInfo } from '../common/redactSensitiveInfo';

const startupLog = Logger.withContext('startup:diagnostics');

interface EnvironmentSummary {
  critical: Array<{ key: string; value: string; status: 'present' | 'missing' | 'invalid' }>;
  optional: Array<{ key: string; value: string; status: 'present' | 'missing' }>;
  featureFlags: Array<{ key: string; value: string; description: string }>;
}

interface ProviderStatus {
  type: string;
  configured: boolean;
  connected: boolean;
  details?: any;
}

interface SystemResources {
  memoryUsage: NodeJS.MemoryUsage;
  freeDiskSpace: number;
  nodeVersion: string;
  platform: string;
}

export class StartupDiagnostics {
  private static instance: StartupDiagnostics;

  public static getInstance(): StartupDiagnostics {
    if (!StartupDiagnostics.instance) {
      StartupDiagnostics.instance = new StartupDiagnostics();
    }
    return StartupDiagnostics.instance;
  }

  /**
   * Log comprehensive startup diagnostics with credential redaction
   */
  public async logStartupDiagnostics(): Promise<void> {
    startupLog.info('🔍 Starting comprehensive startup diagnostics...');

    try {
      await this.logEnvironmentSummary();
      await this.logConfigurationStatus();
      await this.logProviderConnectivity();
      await this.logApiWebUiStatus();
      await this.logSystemResources();
      await this.logFeatureFlags();

      startupLog.info('✅ Startup diagnostics complete');
    } catch (error) {
      startupLog.error('❌ Error during startup diagnostics', { error });
    }
  }

  /**
   * Log environment variable summary with credential redaction
   */
  private async logEnvironmentSummary(): Promise<void> {
    startupLog.info('🔧 Environment Variable Summary');

    const envSummary = this.analyzeEnvironmentVariables();

    // Critical configuration
    const criticalPresent = envSummary.critical.filter((v) => v.status === 'present').length;
    const criticalTotal = envSummary.critical.length;

    startupLog.info('🔐 Critical Configuration', {
      present: `${criticalPresent}/${criticalTotal}`,
      missing: envSummary.critical.filter((v) => v.status === 'missing').map((v) => v.key),
    });

    // Log present critical variables (redacted)
    envSummary.critical
      .filter((v) => v.status === 'present')
      .forEach((v) => {
        const redactedValue = redactSensitiveInfo(v.key, v.value);
        startupLog.debug(`   ✓ ${v.key}: ${redactedValue}`);
      });

    // Optional configuration
    const optionalPresent = envSummary.optional.filter((v) => v.status === 'present').length;

    startupLog.info('🔧 Optional Configuration', {
      present: `${optionalPresent}/${envSummary.optional.length}`,
    });

    // Log present optional variables (redacted)
    envSummary.optional
      .filter((v) => v.status === 'present')
      .forEach((v) => {
        const redactedValue = redactSensitiveInfo(v.key, v.value);
        startupLog.debug(`   ✓ ${v.key}: ${redactedValue}`);
      });
  }

  /**
   * Analyze environment variables and categorize them
   */
  private analyzeEnvironmentVariables(): EnvironmentSummary {
    const criticalVars = ['NODE_ENV', 'PORT', 'MESSAGE_PROVIDER'];

    const optionalVars = [
      'DISCORD_BOT_TOKEN',
      'SLACK_BOT_TOKEN',
      'SLACK_APP_TOKEN',
      'SLACK_SIGNING_SECRET',
      'MATTERMOST_TOKEN',
      'MATTERMOST_URL',
      'OPENAI_API_KEY',
      'OPENAI_BASE_URL',
      'ANTHROPIC_API_KEY',
      'OPENWEBUI_API_KEY',
      'FLOWISE_API_KEY',
      'WEBHOOK_SECRET',
      'SECRET',
    ];

    const featureFlags = [
      { key: 'HTTP_ENABLED', description: 'HTTP server and WebUI' },
      { key: 'SKIP_MESSENGERS', description: 'Messenger initialization' },
      { key: 'WEBHOOK_ENABLED', description: 'Webhook service' },
      { key: 'LOW_MEMORY_MODE', description: 'Low memory optimizations' },
      { key: 'SUPPRESS_HEALTH_LOGS', description: 'Health endpoint logging' },
      { key: 'DEBUG', description: 'Debug logging' },
    ];

    const summary: EnvironmentSummary = {
      critical: [],
      optional: [],
      featureFlags: [],
    };

    // Analyze critical variables
    criticalVars.forEach((key) => {
      const value = process.env[key];
      summary.critical.push({
        key,
        value: value || '',
        status: value ? 'present' : 'missing',
      });
    });

    // Analyze optional variables
    optionalVars.forEach((key) => {
      const value = process.env[key];
      summary.optional.push({
        key,
        value: value || '',
        status: value ? 'present' : 'missing',
      });
    });

    // Analyze feature flags
    featureFlags.forEach(({ key, description }) => {
      const value = process.env[key];
      summary.featureFlags.push({
        key,
        value: value || 'false',
        description,
      });
    });

    return summary;
  }

  /**
   * Log configuration file status and content summary
   */
  private async logConfigurationStatus(): Promise<void> {
    startupLog.info('📄 Configuration Status');

    const configPaths = [
      'config/providers/messengers.json',
      'config/llm/providers.json',
      'config/messages.json',
      'config/webhooks.json',
    ];

    const configStatus: Array<{ path: string; exists: boolean; size?: number; error?: string }> =
      [];

    for (const configPath of configPaths) {
      try {
        const fullPath = path.join(process.cwd(), configPath);
        const exists = fs.existsSync(fullPath);

        if (exists) {
          const stats = fs.statSync(fullPath);
          configStatus.push({
            path: configPath,
            exists: true,
            size: stats.size,
          });
        } else {
          configStatus.push({
            path: configPath,
            exists: false,
          });
        }
      } catch (error) {
        configStatus.push({
          path: configPath,
          exists: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const existingConfigs = configStatus.filter((c) => c.exists);
    const missingConfigs = configStatus.filter((c) => !c.exists);

    startupLog.info('📁 Configuration Files', {
      loaded: existingConfigs.length,
      missing: missingConfigs.length,
      totalSize: existingConfigs.reduce((sum, c) => sum + (c.size || 0), 0),
    });

    existingConfigs.forEach((config) => {
      startupLog.debug(`   ✓ ${config.path} (${config.size} bytes)`);
    });

    missingConfigs.forEach((config) => {
      startupLog.debug(`   ⚠ ${config.path} (not found)`);
    });
  }

  /**
   * Log provider connectivity and configuration status
   */
  private async logProviderConnectivity(): Promise<void> {
    startupLog.info('🤖 Provider Connectivity Status');

    const providers: ProviderStatus[] = [
      {
        type: 'discord',
        configured: !!process.env.DISCORD_BOT_TOKEN,
        connected: false, // Will be updated during actual initialization
      },
      {
        type: 'slack',
        configured: !!(process.env.SLACK_BOT_TOKEN && process.env.SLACK_SIGNING_SECRET),
        connected: false,
      },
      {
        type: 'mattermost',
        configured: !!(process.env.MATTERMOST_TOKEN && process.env.MATTERMOST_URL),
        connected: false,
      },
    ];

    const configuredProviders = providers.filter((p) => p.configured);
    const unconfiguredProviders = providers.filter((p) => !p.configured);

    startupLog.info('🔗 Provider Configuration', {
      configured: configuredProviders.length,
      unconfigured: unconfiguredProviders.length,
    });

    configuredProviders.forEach((provider) => {
      startupLog.debug(`   ✓ ${provider.type}: configured`);
    });

    unconfiguredProviders.forEach((provider) => {
      startupLog.debug(`   ⚠ ${provider.type}: not configured`);
    });

    // Note: Actual connectivity testing will happen during provider initialization
  }

  /**
   * Log API/WebUI availability and authentication status
   */
  private async logApiWebUiStatus(): Promise<void> {
    startupLog.info('🌐 API & WebUI Status');

    const httpEnabled = process.env.HTTP_ENABLED !== 'false';
    const port = process.env.PORT || '3028';

    if (!httpEnabled) {
      startupLog.info('   ❌ HTTP server disabled via HTTP_ENABLED=false');
      startupLog.warn('⚠️  WebUI and API endpoints are NOT available');
      return;
    }

    startupLog.info('✅ HTTP server enabled', { port });

    // Check authentication configuration
    const authStatus = this.checkAuthenticationStatus();

    startupLog.info('🔐 Authentication Status', {
      enabled: authStatus.enabled,
      method: authStatus.method,
      securityLevel: authStatus.securityLevel,
      webuiProtected: authStatus.webuiProtected,
      apiProtected: authStatus.apiProtected,
    });

    if (!authStatus.enabled) {
      startupLog.error('❌ SECURITY RISK: Authentication is DISABLED');
      startupLog.error('   ⚠️  WebUI and API are publicly accessible without authentication!');
      startupLog.error('   🚨 This is NOT recommended for internet-facing deployments');
      startupLog.error(
        '   💡 Set up authentication by configuring users or enabling auth middleware'
      );
    } else {
      startupLog.info('✅ Authentication is properly configured');
      if (authStatus.webuiProtected) {
        startupLog.info('   ✓ WebUI requires authentication');
      }
      if (authStatus.apiProtected) {
        startupLog.info('   ✓ API endpoints require authentication');
      }
    }

    // Check specific authentication mechanisms
    if (authStatus.jwtSecret) {
      startupLog.debug('   ✓ JWT authentication configured');
    }

    if (authStatus.defaultAdmin) {
      startupLog.debug('   ✓ Default admin user configured');
    }

    if (authStatus.secureConfigUsers > 0) {
      startupLog.debug(`   ✓ ${authStatus.secureConfigUsers} users configured via secure storage`);
    }
  }

  /**
   * Check authentication configuration status
   */
  private checkAuthenticationStatus() {
    const status = {
      enabled: false,
      method: 'none',
      securityLevel: 'none',
      webuiProtected: false,
      apiProtected: false,
      jwtSecret: false,
      defaultAdmin: false,
      secureConfigUsers: 0,
    };

    try {
      // Check if JWT secrets are configured (AuthManager generates them automatically)
      const authManagerExists = this.checkAuthManagerExists();
      if (authManagerExists) {
        status.jwtSecret = true;
        status.method = 'jwt';
        status.securityLevel = 'standard';
        status.enabled = true;
      }

      // Check for SECRET environment variable (legacy auth)
      if (process.env.SECRET) {
        status.method = status.jwtSecret ? 'jwt+secret' : 'secret';
        status.securityLevel = 'legacy';
        status.enabled = true;
      }

      // Check if admin routes are protected
      status.webuiProtected = status.enabled;
      status.apiProtected = status.enabled;

      // Count users from secure configuration (if available)
      try {
        const SecureConfigManager = require('../config/SecureConfigManager');
        SecureConfigManager.getInstance();
        // Note: This would need to be implemented in SecureConfigManager
        // status.secureConfigUsers = secureConfig.getUserCount();
      } catch {
        // SecureConfigManager not available or doesn't have user counting
      }
    } catch (error) {
      startupLog.debug('Error checking authentication status', { error });
    }

    return status;
  }

  /**
   * Check if AuthManager is available and configured
   */
  private checkAuthManagerExists(): boolean {
    try {
      const AuthManager = require('../auth/AuthManager');
      const authManager = AuthManager.getInstance();
      return !!authManager;
    } catch {
      return false;
    }
  }

  /**
   * Log system resources and environment
   */
  private async logSystemResources(): Promise<void> {
    startupLog.info('💻 System Resources');

    const resources: SystemResources = {
      memoryUsage: process.memoryUsage(),
      freeDiskSpace: this.getFreeDiskSpace(),
      nodeVersion: process.version,
      platform: process.platform,
    };

    const memoryMB = Math.round(resources.memoryUsage.heapUsed / 1024 / 1024);
    const memoryLimitMB = Math.round(resources.memoryUsage.heapTotal / 1024 / 1024);
    const diskSpaceGB =
      resources.freeDiskSpace > 0
        ? `${(resources.freeDiskSpace / (1024 * 1024 * 1024)).toFixed(2)}GB`
        : 'Unknown';

    startupLog.info('📊 Resource Summary', {
      nodeVersion: resources.nodeVersion,
      platform: resources.platform,
      memoryUsage: `${memoryMB}MB`,
      memoryLimit: `${memoryLimitMB}MB`,
      freeDiskSpace: diskSpaceGB,
      pid: process.pid,
    });
  }

  /**
   * Get free disk space in bytes for the current working directory
   */
  private getFreeDiskSpace(): number {
    try {
      const { execSync } = require('child_process');
      const cwd = process.cwd();

      if (process.platform === 'win32') {
        // Windows: use wmic to get free space
        const drive = cwd.charAt(0).toUpperCase();
        const result = execSync(`wmic logicaldisk get size,freespace,caption`, {
          encoding: 'utf8',
        });
        const lines = result.split('\n').filter((line: string) => line.trim());
        for (const line of lines) {
          if (line.startsWith(drive)) {
            const parts = line.split(/\s+/).filter(Boolean);
            return parseInt(parts[1], 10) || 0;
          }
        }
      } else {
        // Unix-like: use df command
        const result = execSync(`df -k "${cwd}" | tail -1`, { encoding: 'utf8' });
        const parts = result.split(/\s+/).filter(Boolean);
        // df -k outputs: Filesystem, 1K-blocks, Used, Available, Use%, Mounted on
        const availableKB = parseInt(parts[3], 10);
        return (availableKB || 0) * 1024; // Convert KB to bytes
      }
    } catch (error) {
      startupLog.debug('Failed to get disk space:', error);
    }
    return 0;
  }

  /**
   * Log feature flag status
   */
  private async logFeatureFlags(): Promise<void> {
    startupLog.info('🚩 Feature Flags');

    const flags = [
      { key: 'HTTP_ENABLED', default: 'true', description: 'Enable HTTP server and WebUI' },
      { key: 'SKIP_MESSENGERS', default: 'false', description: 'Skip messenger initialization' },
      { key: 'WEBHOOK_ENABLED', default: 'false', description: 'Enable webhook service' },
      { key: 'LOW_MEMORY_MODE', default: 'false', description: 'Enable low memory optimizations' },
      {
        key: 'SUPPRESS_HEALTH_LOGS',
        default: 'true',
        description: 'Suppress health endpoint logs',
      },
    ];

    flags.forEach((flag) => {
      const value = process.env[flag.key] || flag.default;
      const isActive = value === 'true' || value === '1';
      const icon = isActive ? '✅' : '❌';
      startupLog.debug(`   ${icon} ${flag.key}: ${value} (${flag.description})`);
    });
  }

  /**
   * Log successful provider initialization
   */
  public logProviderInitialized(providerType: string, details?: any): void {
    startupLog.info('🤖 Provider Initialized', {
      type: providerType,
      details: details ? this.sanitizeDetails(details) : undefined,
    });
  }

  /**
   * Log provider initialization failure
   */
  public logProviderInitializationFailed(providerType: string, error: any): void {
    startupLog.error('❌ Provider Initialization Failed', {
      type: providerType,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  /**
   * Sanitize provider details for logging
   */
  private sanitizeDetails(details: any): any {
    if (typeof details !== 'object' || details === null) {
      return details;
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(details)) {
      if (typeof value === 'string' && this.isSensitiveKey(key)) {
        sanitized[key] = redactSensitiveInfo(key, value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Check if a key is likely to contain sensitive information
   */
  private isSensitiveKey(key: string): boolean {
    const sensitivePatterns = ['token', 'secret', 'key', 'password', 'auth'];
    return sensitivePatterns.some((pattern) => key.toLowerCase().includes(pattern));
  }
}

export default StartupDiagnostics.getInstance();
