import request from 'supertest';
import express from 'express';
import personasRouter from '../../src/server/routes/personas';

// Mock the PersonaManager to avoid real DB calls
jest.mock('../../src/managers/PersonaManager', () => ({
  PersonaManager: {
    getInstance: () => ({
      createPersona: jest.fn((data) => ({ id: '123', ...data })),
      getAllPersonas: jest.fn(() => []),
    }),
  },
}));

describe('Security: Persona Validation', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/personas', personasRouter);
  });

  it('should reject extremely long names (DoS prevention)', async () => {
    const hugeName = 'a'.repeat(1001); // Assuming we'll set limit to 1000 or less
    const payload = {
      name: hugeName,
      description: 'Valid description',
      category: 'general',
      traits: [],
      systemPrompt: 'You are a bot.'
    };

    const response = await request(app)
      .post('/api/personas')
      .send(payload);

    // Currently this will likely pass (201) because validation is missing
    // We want it to be 400 Bad Request
    if (response.status === 201) {
      console.log('VULNERABILITY CONFIRMED: Long input accepted');
    }

    // The test assertion:
    expect(response.status).toBe(400);
  });
});
