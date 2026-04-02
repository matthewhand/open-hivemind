import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { ErrorUtils } from '@src/types/errors';
import type { MCPProviderConfig, MCPProviderTemplate } from '../../types/mcp';

import { injectable } from 'tsyringe';

@injectable()
export class ToolRegistry {
  public async executeProviderTest(
    provider: MCPProviderConfig,
    parseArgs: (args: string | string[]) => string[]
  ): Promise<{
    success: boolean;
    error?: string;
    output?: string;
    version?: string;
    capabilities?: string[];
  }> {
    return new Promise((resolve) => {
      const timeout = provider.timeout || 30;
      const args = parseArgs(provider.args || '');

      const mcpProcess = spawn(provider.command, args, {
        env: { ...process.env, ...provider.env },
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: timeout * 1000,
      });

      let output = '';
      let errorOutput = '';

      mcpProcess.stdout?.on('data', (data: any) => {
        output += data.toString();
      });

      mcpProcess.stderr?.on('data', (data: any) => {
        errorOutput += data.toString();
      });

      mcpProcess.on('close', (code: any) => {
        if (code === 0) {
          // Try to extract version and capabilities from output
          const version = this.extractVersion(output);
          const capabilities = this.extractCapabilities(output);

          resolve({
            success: true,
            output: output.trim(),
            version,
            capabilities,
          });
        } else {
          resolve({
            success: false,
            error: `Process exited with code ${code}${errorOutput ? ': ' + errorOutput.trim() : ''}`,
          });
        }
      });

      mcpProcess.on('configuration', (error: any) => {
        resolve({
          success: false,
          error: error.message,
        });
      });

      // Kill process after timeout
      setTimeout(() => {
        if (mcpProcess && !mcpProcess.killed) {
          mcpProcess.kill();
          resolve({
            success: false,
            error: `Process timed out after ${timeout} seconds`,
          });
        }
      }, timeout * 1000);
    });
  }

  private extractVersion(output: string): string | undefined {
    // Look for version patterns in output
    const versionPatterns = [
      /version[:\s]+(\d+\.\d+\.\d+)/i,
      /v(\d+\.\d+\.\d+)/,
      /(\d+\.\d+\.\d+)/,
    ];

    for (const pattern of versionPatterns) {
      const match = output.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  private extractCapabilities(output: string): string[] {
    // Look for capability patterns in MCP output
    const capabilities: string[] = [];

    // Common MCP capability indicators
    const capabilityPatterns = [
      /tools?:\s*([^\n]+)/i,
      /resources?:\s*([^\n]+)/i,
      /prompts?:\s*([^\n]+)/i,
    ];

    for (const pattern of capabilityPatterns) {
      const match = output.match(pattern);
      if (match) {
        capabilities.push(match[1].trim());
      }
    }

    return capabilities;
  }

  getTemplates(): MCPProviderTemplate[] {
    return [
      {
        id: 'filesystem-mcp',
        name: 'File System MCP',
        type: 'desktop',
        description: 'Local file system access for reading and writing files',
        category: 'File System',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem'],
        envVars: [
          {
            name: 'FILESYSTEM_ROOT',
            description: 'Root directory for file system access',
            required: true,
            defaultValue: '/tmp/mcp-files',
          },
        ],
        enabledByDefault: false,
        documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
      },
      {
        id: 'web-scraper-mcp',
        name: 'Web Scraper MCP',
        type: 'desktop',
        description: 'Fetch and extract content from web pages',
        category: 'Web',
        command: 'npx',
        args: ['@modelcontextprotocol/server-web-scraper'],
        envVars: [],
        enabledByDefault: false,
        documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/web-scraper',
      },
      {
        id: 'github-mcp',
        name: 'GitHub MCP',
        type: 'cloud',
        description: 'Access GitHub repositories, issues, and pull requests',
        category: 'Development',
        command: 'npx',
        args: ['@modelcontextprotocol/server-github'],
        envVars: [
          {
            name: 'GITHUB_TOKEN',
            description: 'GitHub personal access token',
            required: true,
          },
        ],
        enabledByDefault: false,
        documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/github',
      },
      {
        id: 'postgres-mcp',
        name: 'PostgreSQL MCP',
        type: 'desktop',
        description: 'Query PostgreSQL databases safely',
        category: 'Database',
        command: 'npx',
        args: ['@modelcontextprotocol/server-postgres'],
        envVars: [
          {
            name: 'POSTGRES_CONNECTION_STRING',
            description: 'PostgreSQL connection string',
            required: true,
          },
        ],
        enabledByDefault: false,
        documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres',
      },
      {
        id: 'slack-mcp',
        name: 'Slack MCP',
        type: 'cloud',
        description: 'Send messages and access Slack workspace data',
        category: 'Communication',
        command: 'npx',
        args: ['@modelcontextprotocol/server-slack'],
        envVars: [
          {
            name: 'SLACK_TOKEN',
            description: 'Slack bot token',
            required: true,
          },
        ],
        enabledByDefault: false,
        documentation: 'https://github.com/modelcontextprotocol/servers/tree/main/src/slack',
      },
    ];
  }

  createFromTemplate(templateId: string, overrides: Partial<MCPProviderConfig>): MCPProviderConfig {
    const template = this.getTemplates().find(t => t.id === templateId);
    if (!template) {
      throw ErrorUtils.createError(
        `Template not found: ${templateId}`,
        'configuration',
        'MCP_TEMPLATE_NOT_FOUND',
        undefined,
        { templateId },
      );
    }

    const envVars: Record<string, string> = {};
    template.envVars.forEach(envVar => {
      envVars[envVar.name] = envVar.defaultValue || '';
    });

    const baseConfig: MCPProviderConfig = {
      id: uuidv4(),
      name: template.name,
      type: template.type,
      description: template.description,
      command: template.command,
      args: template.args,
      env: envVars,
      enabled: template.enabledByDefault,
      timeout: 30,
      autoRestart: true,
      healthCheck: {
        enabled: true,
        interval: 60,
        timeout: 10,
        retries: 3,
      },
    };

    return { ...baseConfig, ...overrides };
  }
}
