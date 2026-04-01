import { isMCPProviderType } from '../../types/mcp';
import type { MCPProviderConfig, MCPProviderValidationResult } from '../../types/mcp';

export class ConfigLoader {
  validateProviderConfig(config: Partial<MCPProviderConfig>): MCPProviderValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Required fields
    if (!config.name || (config.name as string).trim().length < 2) {
      errors.push('Provider name is required and must be at least 2 characters');
    }

    if (!config.command || (config.command as string).trim().length === 0) {
      errors.push('Command is required');
    }

    if (!config.type || !isMCPProviderType(config.type)) {
      errors.push('Provider type must be either "desktop" or "cloud"');
    }

    // Command validation
    if (config.command) {
      const command = (config.command as string).trim();

      // Security validation: Block dangerous shell commands
      const blockedCommands = [
        'sh', 'bash', 'zsh', 'dash', 'csh', 'ksh', 'tcsh',
        'cmd', 'cmd.exe', 'powershell', 'powershell.exe', 'pwsh',
      ];

      const isBlocked = blockedCommands.some(blocked => {
        const lowerCommand = command.toLowerCase();
        // Check exact match
        if (lowerCommand === blocked) return true;
        // Check if it ends with the blocked command (e.g. /bin/sh)
        // using forward slash or backslash as separator
        // blocked commands are lowercase in the list
        const pattern = new RegExp(`[\\/\\\\]${blocked}$`);
        return pattern.test(lowerCommand);
      });

      if (isBlocked) {
        errors.push('Command is not allowed for security reasons');
      }

      const validCommandPatterns = [
        /^[a-zA-Z0-9\-_]+$/,
        /^\.\/[a-zA-Z0-9\-_\/.]+$/,
        /^\/[a-zA-Z0-9\-_\/.]+$/,
        /^[a-zA-Z]:\\[a-zA-Z0-9\-_\/.\\]+$/,
        /^npx [a-zA-Z0-9\-@/.]+$/,
        /^npm run [a-zA-Z0-9\-_]+$/,
      ];

      const isValidCommand = validCommandPatterns.some(pattern => pattern.test(command));
      if (!isValidCommand) {
        errors.push('Invalid command format');
      }
    }

    // Args validation
    if (config.args && typeof config.args === 'string') {
      try {
        // Try to parse as JSON array
        JSON.parse(config.args);
      } catch {
        // If not valid JSON, it's treated as space-separated
        if ((config.args as string).trim().length === 0) {
          warnings.push('Arguments field is empty');
        }
      }
    }

    // Cloud provider warnings
    if (config.type === 'cloud') {
      const envVars = config.env || {};
      const hasConnectionConfig = Object.keys(envVars).some(key =>
        key.toLowerCase().includes('url') ||
        key.toLowerCase().includes('endpoint') ||
        key.toLowerCase().includes('key') ||
        key.toLowerCase().includes('token'),
      );

      if (!hasConnectionConfig) {
        warnings.push('Cloud providers typically require connection configuration (URLs, API keys, etc.)');
      }
    }

    // Timeout validation
    if (config.timeout !== undefined) {
      if (typeof config.timeout !== 'number' || config.timeout < 5 || config.timeout > 300) {
        errors.push('Timeout must be a number between 5 and 300 seconds');
      }
    }

    // Suggestions
    if (config.type === 'desktop') {
      const hasArgs = Array.isArray(config.args)
        ? config.args.length > 0
        : !!config.args && (config.args as string).trim().length > 0;

      if (!hasArgs) {
        suggestions.push('Consider adding arguments like "--port 3000" for local MCP servers');
      }
    }

    if (!config.healthCheck?.enabled) {
      suggestions.push('Consider enabling health checks for better reliability');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }
}
