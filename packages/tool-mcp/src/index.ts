import type { PluginManifest } from '../../../src/plugins/PluginLoader';
import type { McpToolProviderConfig } from './types';
import { McpToolProvider } from './McpToolProvider';

export { McpToolProvider } from './McpToolProvider';
export type { McpToolProviderConfig, McpTransport, McpToolsListResponse, McpToolCallResponse } from './types';

/** Standard factory -- preferred entry point for PluginLoader */
export function create(config?: McpToolProviderConfig): McpToolProvider {
  if (!config) {
    throw new Error('McpToolProvider requires a config with at least name and serverUrl');
  }
  return new McpToolProvider(config);
}

export const manifest: PluginManifest = {
  displayName: 'MCP Tools',
  description: 'Connect to MCP servers to provide tools to bots',
  type: 'tool',
  minVersion: '1.0.0',
};
