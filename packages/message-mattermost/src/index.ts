import type { PluginManifest } from '../../../src/plugins/PluginLoader';
import { MattermostService } from './MattermostService';

export { MattermostService as default } from './MattermostService';
export { MattermostService } from './MattermostService';
export { default as MattermostClient } from './mattermostClient';
export { MattermostMessage, type MattermostPost } from './MattermostMessage';
export {
  testMattermostConnection,
  type MattermostConnectionTestResult,
} from './MattermostConnectionTest';

/** Standard factory — preferred entry point for PluginLoader */
export function create(_config?: any): any {
  return MattermostService.getInstance();
}

export const manifest: PluginManifest = {
  displayName: 'Mattermost',
  description: 'Connect your bots to self-hosted Mattermost instances',
  type: 'message',
  minVersion: '1.0.0',
};
