import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { ErrorUtils } from '../../../common/ErrorUtils';
import { HTTP_STATUS } from '../../../types/constants';

const router = Router();
const debug = Debug('app:admin:providerTypes');

// Known provider packages — extend as new packages are added
const LLM_PACKAGES = [
  '@hivemind/llm-openai',
  '@hivemind/llm-flowise',
  '@hivemind/llm-letta',
  '@hivemind/llm-openswarm',
  '@hivemind/llm-openwebui',
];

const MESSENGER_PACKAGES = [
  '@hivemind/message-discord',
  '@hivemind/message-slack',
  '@hivemind/message-mattermost',
];

const MEMORY_PACKAGES = ['@hivemind/memory-mem0', '@hivemind/memory-mem4ai'];

function tryLoadSchema(pkg: string): unknown | null {
  try {
    const mod = require(pkg);
    if (mod.schema != null) {
      return mod.schema;
    }
    debug('Package %s loaded but has no exported schema', pkg);
    return null;
  } catch (e) {
    debug('Could not load schema from %s: %s', pkg, (e as Error).message);
    return null;
  }
}

/**
 * GET /api/admin/available-provider-types
 *
 * Returns self-documenting schemas from every known provider package.
 * Packages that are not yet installed or have no schema are silently skipped,
 * so the endpoint always succeeds even when all schemas are absent.
 */
router.get('/available-provider-types', (_req: Request, res: Response) => {
  try {
    const llm = LLM_PACKAGES.map(tryLoadSchema).filter(Boolean);
    const messenger = MESSENGER_PACKAGES.map(tryLoadSchema).filter(Boolean);
    const memory = MEMORY_PACKAGES.map(tryLoadSchema).filter(Boolean);

    return res.json({
      success: true,
      data: { llm, messenger, memory },
    });
  } catch (error: unknown) {
    const hivemindError = ErrorUtils.toHivemindError(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to retrieve available provider types',
      code: 'PROVIDER_TYPES_ERROR',
      message:
        hivemindError.message || 'An error occurred while retrieving available provider types',
    });
  }
});

export default router;
