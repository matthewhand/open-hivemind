import { Router } from 'express';
import { z } from 'zod';
import { createLogger } from '../../common/StructuredLogger';
import { BotManager } from '../../managers/BotManager';
import { PersonaManager } from '../../managers/PersonaManager';
import { ERROR_CODES, HTTP_STATUS } from '../../types/constants';
import { ReorderSchema } from '../../validation/schemas/commonSchema';
import {
  BulkDeletePersonasSchema,
  ClonePersonaSchema,
  PersonaIdParamSchema,
  UpdatePersonaRouteSchema,
} from '../../validation/schemas/personasSchema';
import { validateRequest } from '../../validation/validateRequest';
import { ApiResponse } from '../utils/apiResponse';

const router = Router();
const logger = createLogger('personasRouter');

const MAX_SYSTEM_PROMPT_LENGTH = 8000;

/** Lazily-resolved singleton PersonaManager shared across all route handlers. */
let _manager: PersonaManager | null = null;
async function getManager(): Promise<PersonaManager> {
  if (!_manager) {
    _manager = await PersonaManager.getInstance();
  }
  return _manager;
}

// Schema for create/update
const CreatePersonaSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().min(1).max(500),
    category: z.enum([
      'general',
      'customer_service',
      'creative',
      'technical',
      'educational',
      'entertainment',
      'professional',
    ]),
    traits: z.array(
      z.object({
        name: z.string(),
        value: z.string(),
        weight: z.number().optional(),
        type: z.string().optional(),
      })
    ),
    systemPrompt: z
      .string()
      .min(1, { message: 'System prompt is required' })
      .max(MAX_SYSTEM_PROMPT_LENGTH, {
        message: `System prompt must not exceed ${MAX_SYSTEM_PROMPT_LENGTH} characters`,
      }),
  }),
});

// GET /api/personas
router.get('/', async (req, res) => {
  try {
    const manager = await getManager();
    const personas = manager.getAllPersonas();
    return res.json(ApiResponse.success(personas));
  } catch (error: unknown) {
    logger.error(
      'Failed to retrieve personas',
      error instanceof Error ? error : new Error(String(error))
    );
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ error: 'Failed to retrieve personas' });
  }
});

// PUT /api/personas/reorder
router.put('/reorder', validateRequest(ReorderSchema), async (req, res) => {
  try {
    const { ids } = req.body;

    const fsModule = await import('fs');
    const pathModule = await import('path');
    const orderFilePath = pathModule.join(process.cwd(), 'config', 'user', 'persona-order.json');
    const orderDir = pathModule.dirname(orderFilePath);
    await fsModule.promises.mkdir(orderDir, { recursive: true });
    await fsModule.promises.writeFile(orderFilePath, JSON.stringify(ids, null, 2));

    return res.json(ApiResponse.success({ success: true, message: 'Persona order updated' }));
  } catch (error: unknown) {
    logger.error(
      'Failed to reorder personas',
      error instanceof Error ? error : new Error(String(error))
    );
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ error: 'Failed to reorder personas' });
  }
});

// GET /api/personas/:id
router.get('/:id', validateRequest(PersonaIdParamSchema), async (req, res) => {
  try {
    const manager = await getManager();
    const persona = manager.getPersona(req.params.id);
    if (!persona) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error('Persona not found'));
    }
    return res.json(ApiResponse.success(persona));
  } catch (error: unknown) {
    logger.error(
      'Failed to retrieve persona',
      error instanceof Error ? error : new Error(String(error)),
      { id: req.params.id }
    );
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json({ error: 'Failed to retrieve persona' });
  }
});

// POST /api/personas
router.post('/', validateRequest(CreatePersonaSchema), async (req, res) => {
  try {
    const manager = await getManager();
    // Idempotency check: see if persona with same name exists
    const allPersonas = manager.getAllPersonas();
    const existingPersona = allPersonas.find((p) => p.name === req.body.name);
    if (existingPersona) {
      return res.status(HTTP_STATUS.OK).json(ApiResponse.success(existingPersona));
    }

    // Basic validation until strict schema is hooked up globally if needed
    const newPersona = manager.createPersona(req.body);
    return res.status(HTTP_STATUS.CREATED).json(newPersona);
  } catch (error: any) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error(error.message));
  }
});

// POST /api/personas/:id/clone
router.post('/:id/clone', validateRequest(ClonePersonaSchema), async (req, res) => {
  try {
    const manager = await getManager();
    if (req.body.name) {
      // Idempotency check: see if cloned persona already exists
      const allPersonas = manager.getAllPersonas();
      const existingPersona = allPersonas.find((p) => p.name === req.body.name);
      if (existingPersona) {
        return res.status(HTTP_STATUS.OK).json(ApiResponse.success(existingPersona));
      }
    }

    const clonedPersona = manager.clonePersona(req.params.id, req.body);
    return res.status(HTTP_STATUS.CREATED).json(clonedPersona);
  } catch (error: any) {
    if (error.message.includes(ERROR_CODES.NOT_FOUND)) {
      return res.status(HTTP_STATUS.NOT_FOUND).json(ApiResponse.error(error.message));
    }
    return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error(error.message));
  }
});

// PUT /api/personas/:id
router.put('/:id', validateRequest(UpdatePersonaRouteSchema), async (req, res) => {
  try {
    const manager = await getManager();
    const updatedPersona = manager.updatePersona(req.params.id, req.body);
    return res.json(ApiResponse.success(updatedPersona));
  } catch (error: any) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error(error.message));
  }
});

// DELETE /api/personas/bulk
router.delete('/bulk', validateRequest(BulkDeletePersonasSchema), async (req, res) => {
  try {
    const manager = await getManager();
    const { ids } = req.body;
    const botManager = BotManager.getInstance();

    // Validate that all personas exist and are not built-in
    const personasToDelete = [];
    const notFound = [];
    const builtIn = [];

    for (const id of ids) {
      const persona = manager.getPersona(id);
      if (!persona) {
        notFound.push(id);
      } else if (persona.isBuiltIn) {
        builtIn.push(id);
      } else {
        personasToDelete.push(persona);
      }
    }

    // Check for bots referencing these personas
    const allBots = await botManager.getAllBots();
    const personaIdSet = new Set(personasToDelete.map((p) => p.id));
    const botsToRevert = allBots.filter((bot) => bot.persona && personaIdSet.has(bot.persona));

    // Revert bots to default persona first
    for (const bot of botsToRevert) {
      try {
        await botManager.updateBot(bot.id, {
          persona: 'default',
          systemInstruction: 'You are a helpful assistant.',
        });
      } catch (error: any) {
        logger.warn(`Failed to revert bot ${bot.id} to default persona`, error);
        // Continue with deletion even if bot update fails
      }
    }

    // Delete personas atomically
    const deleted = [];
    const failed = [];

    for (const persona of personasToDelete) {
      try {
        const result = manager.deletePersona(persona.id);
        if (result) {
          deleted.push(persona.id);
        } else {
          failed.push({ id: persona.id, error: 'Delete operation returned false' });
        }
      } catch (error: any) {
        failed.push({ id: persona.id, error: error.message });
      }
    }

    return res.json(
      ApiResponse.success({
        success: true,
        deleted,
        notFound,
        builtIn,
        failed,
        botsReverted: botsToRevert.length,
      })
    );
  } catch (error: any) {
    logger.error('Bulk delete personas failed', error);
    return res
      .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      .json(ApiResponse.error('Failed to delete personas', undefined, error.message));
  }
});

// DELETE /api/personas/:id
router.delete('/:id', validateRequest(PersonaIdParamSchema), async (req, res) => {
  try {
    const manager = await getManager();
    const existingPersona = manager.getPersona(req.params.id);
    if (!existingPersona) {
      return res.json(ApiResponse.success({ success: true })); // Idempotency: return HTTP_STATUS.OK if already gone
    }

    manager.deletePersona(req.params.id);
    return res.json(ApiResponse.success({ success: true }));
  } catch (error: any) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(ApiResponse.error(error.message));
  }
});

export default router;
