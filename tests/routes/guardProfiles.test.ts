import express from 'express';
import request from 'supertest';
import * as guardrailProfilesConfig from '../../src/config/guardrailProfiles';
import guardProfilesRouter from '../../src/server/routes/guardProfiles';

// Mock the config functions
jest.mock('../../src/config/guardrailProfiles', () => ({
  loadGuardrailProfiles: jest.fn(),
  saveGuardrailProfiles: jest.fn(),
}));

describe('Guard Profiles Route', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/guard-profiles', guardProfilesRouter);
    jest.clearAllMocks();
  });

  describe('GET /guard-profiles', () => {
    it('should return all profiles', async () => {
      const mockProfiles = [{ id: 'profile1', name: 'Profile 1' }];
      (guardrailProfilesConfig.loadGuardrailProfiles as jest.Mock).mockReturnValue(mockProfiles);

      const response = await request(app).get('/guard-profiles');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProfiles);
    });

    it('should handle errors on loadGuardrailProfiles', async () => {
      (guardrailProfilesConfig.loadGuardrailProfiles as jest.Mock).mockImplementation(() => {
        throw new Error('Disk read error');
      });

      const response = await request(app).get('/guard-profiles');

      expect(response.status).toBe(500);

      expect(response.body.error).toBe('Failed to load guardrail profiles');
      expect(response.body.message).toBe('Disk read error');
    });
  });

  describe('GET /guard-profiles/:id', () => {
    it('should return a specific profile', async () => {
      const mockProfiles = [{ id: 'profile1', name: 'Profile 1' }];
      (guardrailProfilesConfig.loadGuardrailProfiles as jest.Mock).mockReturnValue(mockProfiles);

      const response = await request(app).get('/guard-profiles/profile1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProfiles[0]);
    });

    it('should return 404 if profile not found', async () => {
      (guardrailProfilesConfig.loadGuardrailProfiles as jest.Mock).mockReturnValue([]);

      const response = await request(app).get('/guard-profiles/unknown');

      expect(response.status).toBe(404);

      expect(response.body.error).toBe('Profile not found');
    });

    it('should handle errors on loadGuardrailProfiles', async () => {
      (guardrailProfilesConfig.loadGuardrailProfiles as jest.Mock).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app).get('/guard-profiles/profile1');

      expect(response.status).toBe(500);

      expect(response.body.error).toBe('Failed to retrieve profile');
      expect(response.body.message).toBe('Database connection failed');
    });
  });

  describe('POST /guard-profiles', () => {
    const validBody = {
      name: 'New Profile',
      description: 'A new guard profile',
      guards: {
        mcpGuard: { enabled: true, type: 'owner' },
        rateLimit: { enabled: true, maxRequests: 50, windowMs: 60000 },
        contentFilter: { enabled: true, strictness: 'medium' },
      },
    };

    it('should create a new profile', async () => {
      (guardrailProfilesConfig.loadGuardrailProfiles as jest.Mock).mockReturnValue([]);

      const response = await request(app).post('/guard-profiles').send(validBody);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Profile');
      expect(guardrailProfilesConfig.saveGuardrailProfiles).toHaveBeenCalledTimes(1);
    });

    it('should return 400 if name is missing or invalid', async () => {
      const response = await request(app)
        .post('/guard-profiles')
        .send({ ...validBody, name: undefined });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: expect.arrayContaining(['body', 'name']) }),
        ])
      );
    });

    it('should return 400 if guards is missing or invalid', async () => {
      const response = await request(app)
        .post('/guard-profiles')
        .send({ ...validBody, guards: undefined });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: expect.arrayContaining(['body', 'guards']) }),
        ])
      );
    });

    it('should return 200 and existing profile if name already exists', async () => {
      const existingProfile = { id: 'existing1', name: 'New Profile', guards: {} };
      (guardrailProfilesConfig.loadGuardrailProfiles as jest.Mock).mockReturnValue([
        existingProfile,
      ]);

      const response = await request(app).post('/guard-profiles').send(validBody);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(existingProfile);
      expect(response.body.message).toBe('Guard profile already exists');
      expect(guardrailProfilesConfig.saveGuardrailProfiles).not.toHaveBeenCalled();
    });

    it('should handle errors during creation', async () => {
      (guardrailProfilesConfig.loadGuardrailProfiles as jest.Mock).mockImplementation(() => {
        throw new Error('Write permission denied');
      });

      const response = await request(app).post('/guard-profiles').send(validBody);

      expect(response.status).toBe(500);

      expect(response.body.error).toBe('Failed to create guard profile');
      expect(response.body.message).toBe('Write permission denied');
    });
  });

  describe('PUT /guard-profiles/:id', () => {
    const existingProfiles = [
      {
        id: 'profile1',
        name: 'Profile 1',
        description: 'Existing',
        guards: {
          rateLimit: { enabled: false, maxRequests: 100, windowMs: 60000 },
        },
      },
    ];

    it('should update an existing profile', async () => {
      (guardrailProfilesConfig.loadGuardrailProfiles as jest.Mock).mockReturnValue([
        ...existingProfiles,
      ]);

      const updateData = {
        name: 'Updated Profile 1',
        guards: {
          rateLimit: { enabled: true },
        },
      };

      const response = await request(app).put('/guard-profiles/profile1').send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Profile 1');
      expect(response.body.data.guards.rateLimit.enabled).toBe(true);
      expect(response.body.data.guards.rateLimit.maxRequests).toBe(100);
      expect(guardrailProfilesConfig.saveGuardrailProfiles).toHaveBeenCalledTimes(1);
    });

    it('should return 404 if profile not found', async () => {
      (guardrailProfilesConfig.loadGuardrailProfiles as jest.Mock).mockReturnValue([
        ...existingProfiles,
      ]);

      const response = await request(app).put('/guard-profiles/unknown').send({ name: 'Updated' });

      expect(response.status).toBe(404);

      expect(response.body.error).toBe('Profile not found');
    });

    it('should handle errors during update', async () => {
      (guardrailProfilesConfig.loadGuardrailProfiles as jest.Mock).mockImplementation(() => {
        throw new Error('Internal failure');
      });

      const response = await request(app).put('/guard-profiles/profile1').send({ name: 'Updated' });

      expect(response.status).toBe(500);

      expect(response.body.error).toBe('Failed to update guard profile');
      expect(response.body.message).toBe('Internal failure');
    });
  });

  describe('DELETE /guard-profiles/:id', () => {
    const existingProfiles = [{ id: 'profile1', name: 'Profile 1' }];

    it('should delete an existing profile', async () => {
      (guardrailProfilesConfig.loadGuardrailProfiles as jest.Mock).mockReturnValue([
        ...existingProfiles,
      ]);

      const response = await request(app).delete('/guard-profiles/profile1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Guard profile deleted successfully');
      expect(guardrailProfilesConfig.saveGuardrailProfiles).toHaveBeenCalledTimes(1);

      const savedProfiles = (guardrailProfilesConfig.saveGuardrailProfiles as jest.Mock).mock
        .calls[0][0];
      expect(savedProfiles).toEqual([]);
    });

    it('should return 200 with message if profile not found/already deleted', async () => {
      (guardrailProfilesConfig.loadGuardrailProfiles as jest.Mock).mockReturnValue([
        ...existingProfiles,
      ]);

      const response = await request(app).delete('/guard-profiles/unknown');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Guard profile already deleted or not found');
      expect(guardrailProfilesConfig.saveGuardrailProfiles).not.toHaveBeenCalled();
    });

    it('should handle errors during deletion', async () => {
      (guardrailProfilesConfig.loadGuardrailProfiles as jest.Mock).mockImplementation(() => {
        throw new Error('Lock error');
      });

      const response = await request(app).delete('/guard-profiles/profile1');

      expect(response.status).toBe(500);

      expect(response.body.error).toBe('Failed to delete guard profile');
      expect(response.body.message).toBe('Lock error');
    });
  });
});
