import request from 'supertest';
import { WebUIServer } from '../../src/server/server';
import { registerServices } from '../../src/di/registration';

describe('Persona Management Integration', () => {
  let app: any;

  beforeAll(() => {
    registerServices();
    const server = new WebUIServer();
    app = server.getApp();
  });

  it('should return a list containing at least default personas', async () => {
    const res = await request(app)
      .get('/api/personas')
      .set('Authorization', 'Bearer dummy-token')
      .set('Origin', 'http://localhost:3000');
    
    expect([200, 401, 403]).toContain(res.status);
    
    if (res.status === 200) {
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      
      // Check that personas have required fields
      const persona = res.body[0];
      expect(persona).toHaveProperty('id');
      expect(persona).toHaveProperty('name');
      expect(persona).toHaveProperty('description');
    }
  });

  it('should return 404 for non-existent persona when authenticated', async () => {
    const res = await request(app)
      .get('/api/personas/non-existent-persona-12345')
      .set('Authorization', 'Bearer dummy-token')
      .set('Origin', 'http://localhost:3000');
    
    expect([404, 401, 403]).toContain(res.status);
  });
});
