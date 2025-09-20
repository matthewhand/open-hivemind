import fs from 'fs';
import path from 'path';

/**
 * Utility functions for detecting and handling environment variable overrides
 */

/**
 * Redact sensitive values by showing only first 4 and last 4 characters
 * @param value The value to redact
 * @returns Redacted value or original if too short
 */
export function redactSensitiveValue(value: string): string {
  if (!value || value.length <= 8) {
    return '*'.repeat(value?.length || 0);
  }
  return `${value.substring(0, 4)}****${value.substring(value.length - 4)}`;
}

/**
 * Check if a configuration value is overridden by an environment variable
 * @param envVarName The environment variable name to check
 * @returns Object with isOverridden flag and redacted value if overridden
 */
export function checkEnvOverride(envVarName: string): { 
  isOverridden: boolean; 
  redactedValue?: string;
  rawValue?: string;
} {
  const rawValue = process.env[envVarName];
  if (rawValue === undefined) {
    return { isOverridden: false };
  }
  
  return {
    isOverridden: true,
    redactedValue: redactSensitiveValue(rawValue),
    rawValue
  };
}

/**
 * Get all environment variables that match our configuration patterns
 * @returns Map of environment variable names to their redacted values
 */
export function getRelevantEnvVars(): Record<string, string> {
  const relevantEnvVars: Record<string, string> = {};
  
  // Common configuration prefixes
  const prefixes = [
    'BOTS_',
    'DISCORD_',
    'SLACK_',
    'MATTERMOST_',
    'OPENAI_',
    'FLOWISE_',
    'OPENWEBUI_',
    'OPENSWARM_',
    'MESSAGE_',
    'LLM_'
  ];
  
  Object.keys(process.env).forEach(envVar => {
    if (prefixes.some(prefix => envVar.startsWith(prefix))) {
      const rawValue = process.env[envVar] || '';
      // Redact sensitive values (assume anything with 'KEY', 'SECRET', 'TOKEN' is sensitive)
      if (envVar.includes('KEY') || envVar.includes('SECRET') || envVar.includes('TOKEN')) {
        relevantEnvVars[envVar] = redactSensitiveValue(rawValue);
      } else {
        relevantEnvVars[envVar] = rawValue;
      }
    }
  });
  
  return relevantEnvVars;
}

/**
 * Check if a specific bot configuration is overridden by environment variables
 * @param botName The name of the bot to check
 * @returns Object mapping configuration keys to their override status
 */
export function checkBotEnvOverrides(botName: string): Record<string, { 
  isOverridden: boolean; 
  redactedValue?: string;
}> {
  const overrides: Record<string, { isOverridden: boolean; redactedValue?: string }> = {};
  const upperName = botName.toUpperCase();
  
  // Common bot configuration keys
  const configKeys = [
    `BOTS_${upperName}_MESSAGE_PROVIDER`,
    `BOTS_${upperName}_LLM_PROVIDER`,
    `BOTS_${upperName}_DISCORD_BOT_TOKEN`,
    `BOTS_${upperName}_SLACK_BOT_TOKEN`,
    `BOTS_${upperName}_MATTERMOST_TOKEN`,
    `BOTS_${upperName}_OPENAI_API_KEY`,
    `BOTS_${upperName}_FLOWISE_API_KEY`,
    `BOTS_${upperName}_OPENWEBUI_API_KEY`,
    `BOTS_${upperName}_PERSONA`,
    `BOTS_${upperName}_SYSTEM_INSTRUCTION`
  ];
  
  configKeys.forEach(key => {
    const result = checkEnvOverride(key);
    if (result.isOverridden) {
      overrides[key] = {
        isOverridden: true,
        redactedValue: result.redactedValue
      };
    }
  });
  
  return overrides;
}