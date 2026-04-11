import express from 'express';
import request from 'supertest';
import router from '../../../../src/server/routes/config/providers';
import { ApiResponse } from '../../../../src/types/apiResponse';

// Mock responseProfileManager
jest.mock('../../../../src/config/responseProfileManager', () => ({
  getResponseProfiles: jest.fn().mockReturnValue([
    { key: 'eager', name: 'Eager', isBuiltIn: true, settings: {} },
    { key: 'test', name: 'Test', isBuiltIn: false, settings: {} },
  ]),
  createResponseProfile: jest.fn().mockImplementation((data) => ({ ...data, isBuiltIn: false })),
  updateResponseProfile: jest
    .fn()
    .mockImplementation((key, data) => ({ ...data, key, isBuiltIn: false })),
  deleteResponseProfile: jest.fn().mockReturnValue(true),
}));

// Mock audit middleware
jest.mock('../../../../src/server/middleware/audit', () => ({
  auditMiddleware: (req: any, res: any, next: any) => next(),
}));

// Mock config store
jest.mock('../../../../src/server/routes/config/store', () => ({
  broadcastConfigUpdate: jest.fn(),
}));

describe('Response Profiles API', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/config', router);
  });

  it('GET /api/config/response-profiles should return profiles', async () => {
    const res = await request(app).get('/api/config/response-profiles');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });

  it('POST /api/config/response-profiles should create a profile', async () => {
    const newProfile = { name: 'New Profile', settings: { MESSAGE_MIN_DELAY: 100 } };
    const res = await request(app).post('/api/config/response-profiles').send(newProfile);

    expect(res.status).toBe(201);
    expect(res.body.data.profile.name).toBe('New Profile');
  });

  it('PUT /api/config/response-profiles/:key should update a profile', async () => {
    const updates = { name: 'Updated', settings: {} };
    const res = await request(app).put('/api/config/response-profiles/test').send(updates);

    expect(res.status).toBe(200);
    expect(res.body.data.profile.name).toBe('Updated');
  });

  it('DELETE /api/config/response-profiles/:key should delete a profile', async () => {
    const res = await request(app).delete('/api/config/response-profiles/test');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
