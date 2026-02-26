import { Router } from 'express';
// Note: We'll likely need to create schemas for these, assuming minimal validation for now or generic object
import { z } from 'zod';
import { PersonaManager } from '../../managers/PersonaManager';
import { validateRequest } from '../../validation/validateRequest';

const router = Router();
const manager = PersonaManager.getInstance();

// Schema for create/update
const CreatePersonaSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    description: z.string().min(1),
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
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/personas/:id
router.get('/:id', (req, res) => {
  try {
    const persona = manager.getPersona(req.params.id);
    if (!persona) {
      return res.status(404).json({ error: 'Persona not found' });
    }
    return res.json(persona);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/personas
router.post('/', async (req, res) => {
  try {
    // Basic validation until strict schema is hooked up globally if needed
    const newPersona = manager.createPersona(req.body);
    return res.status(201).json(newPersona);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// POST /api/personas/:id/clone
router.post('/:id/clone', (req, res) => {
  try {
    const clonedPersona = manager.clonePersona(req.params.id, req.body);
    return res.status(201).json(clonedPersona);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(400).json({ error: error.message });
  }
});

// PUT /api/personas/:id
router.put('/:id', async (req, res) => {
  try {
    const updatedPersona = manager.updatePersona(req.params.id, req.body);
    return res.json(updatedPersona);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// DELETE /api/personas/:id
router.delete('/:id', (req, res) => {
  try {
    const success = manager.deletePersona(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Persona not found' });
    }
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;
