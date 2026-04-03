import Debug from 'debug';
import { Router } from 'express';
import { Router, type Response } from 'express';
import type { AuthMiddlewareRequest } from '../../../auth/types';
import { asyncErrorHandler } from '../../../middleware/errorHandler';
import { HTTP_STATUS } from '../../../types/constants';
import { ErrorUtils } from '../../../types/errors';

const debug = Debug('app:server:routes:validation:schemas');

export function createSchemaRoutes(): Router {
  const router = Router();

  router.get(
    '/api/validation/schema',
    asyncErrorHandler(async (req, res) => {
      const schema = {
        botConfig: {
          required: ['name', 'messageProvider', 'llmProvider'],
          properties: {
            name: { type: 'string', description: 'Unique bot name' },
            messageProvider: {
              type: 'string',
              enum: ['discord', 'slack', 'mattermost', 'webhook'],
            },
            llmProvider: {
              type: 'string',
              enum: [
                'openai',
                'anthropic',
                'flowise',
                'openwebui',
                'perplexity',
                'replicate',
                'n8n',
                'openswarm',
              ],
            },
            discord: {
              type: 'object',
              properties: {
                token: { type: 'string' },
                clientId: { type: 'string' },
                guildId: { type: 'string' },
              },
            },
            slack: {
              type: 'object',
              properties: {
                botToken: { type: 'string' },
                signingSecret: { type: 'string' },
                appToken: { type: 'string' },
              },
            },
            openai: {
              type: 'object',
              properties: {
                apiKey: { type: 'string' },
                model: { type: 'string' },
              },
            },
            anthropic: {
              type: 'object',
              properties: {
                apiKey: { type: 'string' },
                model: { type: 'string' },
                maxTokens: { type: 'number' },
                temperature: { type: 'number' },
              },
            },
          },
        },
      };

      try {
        return res.json(schema);
      } catch (error: unknown) {
        const hivemindError = ErrorUtils.toHivemindError(
          error,
          'Failed to get validation schema',
          'VALIDATION_ERROR'
        );

        debug('ERROR:', 'Error in', 'Validation schema endpoint');

        return res
          .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
          .type('application/json')
          .send(
            JSON.stringify({
              error: ErrorUtils.getMessage(hivemindError),
              code: ErrorUtils.getCode(hivemindError) || 'VALIDATION_ERROR',
              timestamp:
                hivemindError instanceof Error && 'timestamp' in hivemindError
                  ? (hivemindError as any).timestamp
                  : new Date(),
            })
          );
      }
    })
  );

  return router;
}
