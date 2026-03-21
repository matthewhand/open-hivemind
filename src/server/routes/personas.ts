import { ERROR_CODES, HTTP_STATUS } from '../../types/constants';
import { Router } from 'express';
// Note: We'll likely need to create schemas for these, assuming minimal validation for now or generic object
import { z } from 'zod';
import { createLogger } from '../../common/StructuredLogger';
import { PersonaManager } from '../../managers/PersonaManager';
import { validateRequest } from '../../validation/validateRequest';
import { ErrorResponses } from '../../utils/errorResponse';

const router = Router();
const logger = createLogger('personasRouter');
const manager = PersonaManager.getInstance();

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
    systemPrompt: z.string().min(1),
  }),
});

const UpdatePersonaSchema = z.object({
  body: CreatePersonaSchema.shape.body.partial(),
});

// GET /api/personas
router.get('/', (req, res) => {
  try {
    const personas = manager.getAllPersonas();
    return res.json(personas);
  } catch (error: any) {
    logger.error('Failed to retrieve personas', { error: error.message });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(ErrorResponses.internalServerError(error.message).build());
  }
});

// GET /api/personas/:id
router.get('/:id', (req, res) => {
  try {
    const persona = manager.getPersona(req.params.id);
    if (!persona) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Persona not found' });
    }
    return res.json(persona);
  } catch (error: any) {
    logger.error('Failed to retrieve persona', { id: req.params.id, error: error.message });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(ErrorResponses.internalServerError(error.message).build());
  }
});

// POST /api/personas
router.post('/', validateRequest(CreatePersonaSchema), async (req, res) => {
  try {
    // Idempotency check: see if persona with same name exists
    const allPersonas = manager.getAllPersonas();
    const existingPersona = allPersonas.find((p) => p.name === req.body.name);
    if (existingPersona) {
      return res.status(HTTP_STATUS.OK).json(existingPersona);
    }

    // Basic validation until strict schema is hooked up globally if needed
    const newPersona = manager.createPersona(req.body);
    return res.status(HTTP_STATUS.CREATED).json(newPersona);
  } catch (error: any) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
  }
});

// POST /api/personas/:id/clone
router.post('/:id/clone', (req, res) => {
  try {
    if (req.body.name) {
      // Idempotency check: see if cloned persona already exists
      const allPersonas = manager.getAllPersonas();
      const existingPersona = allPersonas.find((p) => p.name === req.body.name);
      if (existingPersona) {
        return res.status(HTTP_STATUS.OK).json(existingPersona);
      }
    }

    const clonedPersona = manager.clonePersona(req.params.id, req.body);
    return res.status(HTTP_STATUS.CREATED).json(clonedPersona);
  } catch (error: any) {
    if (error.message.includes(ERROR_CODES.NOT_FOUND)) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: error.message });
    }
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
  }
});

// PUT /api/personas/:id
router.put('/:id', async (req, res) => {
  try {
    const updatedPersona = manager.updatePersona(req.params.id, req.body);
    return res.json(updatedPersona);
  } catch (error: any) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
  }
});

// DELETE /api/personas/:id
router.delete('/:id', (req, res) => {
  try {
    const existingPersona = manager.getPersona(req.params.id);
    if (!existingPersona) {
      return res.json({ success: true }); // Idempotency: return HTTP_STATUS.OK if already gone
    }

    manager.deletePersona(req.params.id);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: error.message });
  }
});

export default router;
