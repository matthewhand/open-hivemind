/**
 * Mattermost integration re-export with dependency injection.
 *
 * @deprecated Import from '@hivemind/adapter-mattermost' instead.
 * This shim will be removed in a future version.
 *
 * This file bridges the @hivemind/adapter-mattermost package with the main codebase
 * by injecting dependencies that would otherwise create circular imports.
 *
 * Migration example:
 * // Before
 * import { MattermostService } from '@src/integrations/mattermost/MattermostService';
 *
 * // After
 * import { MattermostService } from '@hivemind/adapter-mattermost';
 * // Note: Dependency injection is handled internally in the new package
 *
 * @see packages/adapter-mattermost/src/ for the new implementation
 */

import {
  MattermostService as MattermostServiceImpl,
  type MattermostServiceDependencies,
} from '@hivemind/adapter-mattermost';
import { createMattermostDependencies } from './adapters';

let mattermostServiceInstance: ReturnType<typeof MattermostServiceImpl.getInstance> | undefined;

/**
 * Get the MattermostService singleton with dependencies injected.
 * Lazy initialization ensures dependencies are ready before use.
 */
export function getMattermostService() {
  if (!mattermostServiceInstance) {
    mattermostServiceInstance = MattermostServiceImpl.getInstance(createMattermostDependencies());
  }
  return mattermostServiceInstance;
}

// For backward compatibility, also export as default (but this will be deprecated)
export default getMattermostService();

// Re-export types and other exports from the adapter package
export {
  MattermostClient,
  MattermostMessage,
  testMattermostConnection,
  type MattermostPost,
  type MattermostConnectionTestResult,
  type MattermostServiceDependencies,
} from '@hivemind/adapter-mattermost';
