import { openWebUIProvider } from './openWebUIProvider';
import type { PluginManifest } from '../../../src/plugins/PluginLoader';

export { openWebUIProvider } from './openWebUIProvider';
export { generateChatCompletion } from './runInference';

/** Standard factory — preferred entry point for PluginLoader */
export function create(_config?: any): typeof openWebUIProvider {
  return openWebUIProvider; // stateless singleton
}

export const manifest: PluginManifest = {
  displayName: 'OpenWebUI',
  description: 'Connect to a self-hosted OpenWebUI instance',
  type: 'llm',
  minVersion: '1.0.0',
};
