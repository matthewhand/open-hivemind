/**
 * Unit tests for the personas route handlers.
 *
 * Regression coverage for the persona-async-responses bug: the POST /, POST
 * /:id/clone and PUT /:id handlers called the async PersonaManager methods
 * without `await`, so the response body serialized a pending Promise (`{}`)
 * instead of the created/updated persona. These tests assert the resolved
 * persona is present in the response body.
 */

import express from 'express';
import request from 'supertest';

// --- Mock PersonaManager so the route uses a controllable in-memory manager ---
const createPersona = jest.fn();
const updatePersona = jest.fn();
const clonePersona = jest.fn();
const getAllPersonas = jest.fn(() => [] as unknown[]);

const mockManager = {
  createPersona,
  updatePersona,
  clonePersona,
  getAllPersonas,
  getPersona: jest.fn(),
};

jest.mock('@src/managers/PersonaManager', () => ({
  PersonaManager: {
    getInstance: jest.fn(async () => mockManager),
  },
}));

// Import the router AFTER the mock is registered.
import personasRouter from '@src/server/routes/personas';
import { globalErrorHandler } from '@src/middleware/errorHandler';

function createApp(): express.Application {
  const app = express();
  app.use(express.json());
  app.use('/api/personas', personasRouter);
  app.use(globalErrorHandler);
  return app;
}

const samplePersona = {
  id: 'persona-123',
  name: 'Test Persona',
  description: 'A persona for testing',
  category: 'general',
  traits: [],
  systemPrompt: 'You are a test persona.',
  usageCount: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const validCreateBody = {
  name: 'Test Persona',
  description: 'A persona for testing',
  category: 'general',
  traits: [],
  systemPrompt: 'You are a test persona.',
};

describe('personas routes async responses', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    getAllPersonas.mockReturnValue([]);
    app = createApp();
  });

  it('POST / returns the created persona in the response body', async () => {
    // Resolve asynchronously on the next tick so an un-awaited call would
    // serialize a pending Promise instead of the persona.
    createPersona.mockImplementation(
      () => new Promise((resolve) => setImmediate(() => resolve(samplePersona)))
    );

    const res = await request(app).post('/api/personas').send(validCreateBody);

    expect(res.status).toBe(201);
    expect(createPersona).toHaveBeenCalledWith(expect.objectContaining({ name: 'Test Persona' }));
    expect(res.body).toMatchObject({ id: 'persona-123', name: 'Test Persona' });
  });

  it('POST /:id/clone returns the cloned persona in the response body', async () => {
    const cloned = { ...samplePersona, id: 'persona-clone', name: 'Cloned Persona' };
    clonePersona.mockImplementation(
      () => new Promise((resolve) => setImmediate(() => resolve(cloned)))
    );

    const res = await request(app)
      .post('/api/personas/persona-123/clone')
      .send({ name: 'Cloned Persona' });

    expect(res.status).toBe(201);
    expect(clonePersona).toHaveBeenCalledWith('persona-123', expect.objectContaining({ name: 'Cloned Persona' }));
    expect(res.body).toMatchObject({ id: 'persona-clone', name: 'Cloned Persona' });
  });

  it('PUT /:id returns the updated persona in the response body', async () => {
    const updated = { ...samplePersona, description: 'Updated description' };
    updatePersona.mockImplementation(
      () => new Promise((resolve) => setImmediate(() => resolve(updated)))
    );

    const res = await request(app)
      .put('/api/personas/persona-123')
      .send({ description: 'Updated description' });

    expect(res.status).toBe(200);
    expect(updatePersona).toHaveBeenCalledWith('persona-123', expect.objectContaining({ description: 'Updated description' }));
    expect(res.body).toMatchObject({ id: 'persona-123', description: 'Updated description' });
  });
});
