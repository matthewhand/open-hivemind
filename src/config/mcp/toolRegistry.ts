import 'reflect-metadata';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { ErrorUtils } from '@src/types/errors';
import { toMCPProviderTemplates } from '@src/mcp/templates';
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
      let settled = false;
      let timeoutHandle: NodeJS.Timeout | undefined;

      const finish = (result: {
        success: boolean;
        error?: string;
        output?: string;
        version?: string;
        capabilities?: string[];
      }) => {
        if (settled) {
          return;
        }
        settled = true;
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
        // Most MCP servers are long-running stdio processes that never exit on
        // their own. Once we have our answer, terminate the child so the test
        // does not leak a process.
        if (mcpProcess && !mcpProcess.killed) {
          mcpProcess.kill();
        }
        resolve(result);
      };

      mcpProcess.stdout?.on('data', (data: any) => {
        output += data.toString();

        // Attempt a real MCP handshake: the server replies to our `initialize`
        // request with a JSON-RPC message advertising its protocol version and
        // capabilities. As soon as we can parse that response we consider the
        // handshake successful — we do not wait for the (often non-terminating)
        // process to exit.
        const handshake = this.parseInitializeResponse(output);
        if (handshake) {
          finish({
            success: true,
            output: output.trim(),
            version: handshake.version ?? this.extractVersion(output),
            capabilities:
              handshake.capabilities.length > 0
                ? handshake.capabilities
                : this.extractCapabilities(output),
          });
        }
      });

      mcpProcess.stderr?.on('data', (data: any) => {
        errorOutput += data.toString();
      });

      mcpProcess.on('close', (code: any) => {
        // Reached only when the process exits before a handshake response was
        // parsed (e.g. a simple `--version` style command, or a hard failure).
        if (code === 0) {
          const version = this.extractVersion(output);
          const capabilities = this.extractCapabilities(output);

          finish({
            success: true,
            output: output.trim(),
            version,
            capabilities,
          });
        } else {
          finish({
            success: false,
            error: `Process exited with code ${code}${errorOutput ? ': ' + errorOutput.trim() : ''}`,
          });
        }
      });

      // Spawn failures (e.g. ENOENT when the command is missing) surface as an
      // 'error' event on the ChildProcess, not 'configuration'.
      mcpProcess.on('error', (error: any) => {
        finish({
          success: false,
          error: error.message,
        });
      });

      // Drive the handshake by sending a minimal MCP `initialize` request over
      // stdin. Servers that speak MCP will respond on stdout (handled above).
      // Guarded so that providers which are not stdio servers still fall back
      // to the exit-code / timeout paths.
      try {
        const initializeRequest =
          JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: { name: 'open-hivemind', version: '1.0.0' },
            },
          }) + '\n';
        mcpProcess.stdin?.write(initializeRequest);
      } catch {
        // Ignore write failures — the close/error/timeout handlers still apply.
      }

      // Kill process after timeout
      timeoutHandle = setTimeout(() => {
        finish({
          success: false,
          error: `Process timed out after ${timeout} seconds`,
        });
      }, timeout * 1000);
    });
  }

  /**
   * Attempt to parse an MCP `initialize` JSON-RPC response out of the raw
   * stdout buffer. Returns the negotiated protocol version and the list of
   * advertised capability names, or `undefined` if no valid response has been
   * received yet. Tolerant of partial / multi-line output: each non-empty line
   * is tried independently as a JSON object.
   */
  private parseInitializeResponse(
    raw: string
  ): { version?: string; capabilities: string[] } | undefined {
    const lines = raw.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed[0] !== '{') {
        continue;
      }

      let message: any;
      try {
        message = JSON.parse(trimmed);
      } catch {
        continue;
      }

      const result = message?.result;
      if (!result || typeof result !== 'object') {
        continue;
      }

      // A genuine `initialize` response carries a protocolVersion and a
      // capabilities object.
      if (!('protocolVersion' in result) && !('capabilities' in result)) {
        continue;
      }

      const capabilities = Object.keys(
        (result.capabilities && typeof result.capabilities === 'object'
          ? result.capabilities
          : {}) as Record<string, unknown>
      );

      const version =
        (typeof result.serverInfo?.version === 'string'
          ? result.serverInfo.version
          : undefined) ??
        (typeof result.protocolVersion === 'string'
          ? result.protocolVersion
          : undefined);

      return { version, capabilities };
    }

    return undefined;
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
    // Derive the API/UI templates from the single static registry in
    // `src/mcp/templates.ts` so the previously-disconnected source is no longer
    // dead and the two registries cannot drift apart.
    return toMCPProviderTemplates();
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
