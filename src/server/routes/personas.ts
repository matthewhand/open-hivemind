import { Router } from 'express';
import { PersonaManager } from '../../managers/PersonaManager';
import { validateRequest } from '../../validation/validateRequest';
// Note: We'll likely need to create schemas for these, assuming minimal validation for now or generic object
import { z } from 'zod';

const router = Router();
const manager = PersonaManager.getInstance();

// Schema for create/update
const CreatePersonaSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    category: z.enum(['general', 'customer_service', 'creative', 'technical', 'educational', 'entertainment', 'professional']),
    traits: z.array(z.object({
      name: z.string(),
      value: z.string(),
      weight: z.number().optional(),
      type: z.string().optional(),
    })),
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
    res.json(personas);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/personas/:id
router.get('/:id', (req, res) => {
  try {
    const persona = manager.getPersona(req.params.id);
    if (!persona) {
      return res.status(404).json({ error: 'Persona not found' });
    }
    res.json(persona);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/personas
router.post('/', async (req, res) => {
  try {
    // Basic validation until strict schema is hooked up globally if needed
    const newPersona = manager.createPersona(req.body);
    res.status(201).json(newPersona);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/personas/:id
router.put('/:id', async (req, res) => {
  try {
    const updatedPersona = manager.updatePersona(req.params.id, req.body);
    res.json(updatedPersona);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/personas/:id
router.delete('/:id', (req, res) => {
  try {
    const success = manager.deletePersona(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Persona not found' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
