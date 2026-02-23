import express from 'express';
import request from 'supertest';
import personasRouter from '../../src/server/routes/personas';
import { PersonaManager } from '../../src/managers/PersonaManager';

// Mock PersonaManager
jest.mock('../../src/managers/PersonaManager', () => {
  const mockInstance = {
    getAllPersonas: jest.fn(),
    getPersona: jest.fn(),
    createPersona: jest.fn(),
    updatePersona: jest.fn(),
    deletePersona: jest.fn(),
    clonePersona: jest.fn(),
  };
  return {
    PersonaManager: {
      getInstance: jest.fn(() => mockInstance),
    },
  };
});

const app = express();
app.use(express.json());
app.use('/api/personas', personasRouter);

const getMockManager = () => PersonaManager.getInstance() as unknown as Record<string, jest.Mock>;

describe('Personas Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/personas', () => {
    it('should return all personas', async () => {
      const personas = [{ id: 'p1', name: 'Persona 1' }];
      getMockManager().getAllPersonas.mockReturnValue(personas);

      const response = await request(app).get('/api/personas').expect(200);
      expect(response.body).toEqual(personas);
    });
  });

  describe('GET /api/personas/:id', () => {
    it('should return a persona', async () => {
      const persona = { id: 'p1', name: 'Persona 1' };
      getMockManager().getPersona.mockReturnValue(persona);

      const response = await request(app).get('/api/personas/p1').expect(200);
      expect(response.body).toEqual(persona);
    });

    it('should return 404 if persona not found', async () => {
      getMockManager().getPersona.mockReturnValue(undefined);
      await request(app).get('/api/personas/p1').expect(404);
    });
  });

  describe('POST /api/personas', () => {
    it('should create a persona', async () => {
      const persona = { id: 'p1', name: 'New Persona' };
      getMockManager().createPersona.mockReturnValue(persona);

      const response = await request(app)
        .post('/api/personas')
        .send({ name: 'New Persona', description: 'Desc', category: 'general', systemPrompt: 'Prompt', traits: [] })
        .expect(201);

      expect(response.body).toEqual(persona);
    });
  });

  describe('PUT /api/personas/:id', () => {
    it('should update a persona', async () => {
      const persona = { id: 'p1', name: 'Updated Persona' };
      getMockManager().updatePersona.mockReturnValue(persona);

      const response = await request(app)
        .put('/api/personas/p1')
        .send({ name: 'Updated Persona' })
        .expect(200);

      expect(response.body).toEqual(persona);
    });
  });

  describe('DELETE /api/personas/:id', () => {
    it('should delete a persona', async () => {
      getMockManager().deletePersona.mockReturnValue(true);
      await request(app).delete('/api/personas/p1').expect(200);
    });

    it('should return 404 if delete fails', async () => {
      getMockManager().deletePersona.mockReturnValue(false);
      await request(app).delete('/api/personas/p1').expect(404);
    });
  });

  describe('POST /api/personas/:id/clone', () => {
    it('should clone a persona', async () => {
      const persona = { id: 'p2', name: 'Cloned Persona' };
      getMockManager().clonePersona.mockReturnValue(persona);

      const response = await request(app)
        .post('/api/personas/p1/clone')
        .send({ name: 'Cloned Persona' })
        .expect(201);

      expect(response.body).toEqual(persona);
      expect(getMockManager().clonePersona).toHaveBeenCalledWith('p1', { name: 'Cloned Persona' });
    });

    it('should return 404 if persona to clone not found', async () => {
      getMockManager().clonePersona.mockImplementation(() => {
        throw new Error('Persona with ID nonexistent not found');
      });

      await request(app)
        .post('/api/personas/nonexistent/clone')
        .send({ name: 'Cloned Persona' })
        .expect(404);
    });
  });
});
