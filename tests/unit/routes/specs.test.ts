import express from 'express';
import request from 'supertest';

const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();
const mockMkdir = jest.fn();
const mockReaddir = jest.fn();

jest.mock('fs', () => ({
  promises: {
    readFile: (...args: any[]) => mockReadFile(...args),
    writeFile: (...args: any[]) => mockWriteFile(...args),
    mkdir: (...args: any[]) => mockMkdir(...args),
    readdir: (...args: any[]) => mockReaddir(...args),
  },
}));

import router from '../../../src/server/routes/specs';

describe('Specs Routes', () => {
  let app: express.Application;

  const sampleSpec = {
    id: 'test-spec',
    topic: 'Testing',
    tags: ['unit'],
    author: 'tester',
    timestamp: '2025-01-01T00:00:00.000Z',
    version: '1.0.0',
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/specs', router);
    jest.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
  });

  describe('GET /specs', () => {
    it('should return all specs', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify([sampleSpec]));
      const res = await request(app).get('/specs');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe('test-spec');
    });

    it('should return empty array when no index exists', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'));
      const res = await request(app).get('/specs');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('GET /specs/:id', () => {
    it('should return spec with versions', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify([sampleSpec]));
      mockReaddir.mockResolvedValue(['1.0.0', '1.1.0']);

      const res = await request(app).get('/specs/test-spec');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('test-spec');
      expect(res.body.data.versions).toEqual(['1.0.0', '1.1.0']);
    });

    it('should return 404 for non-existent spec', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify([]));
      const res = await request(app).get('/specs/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Specification not found');
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await request(app).get('/specs/invalid%20id!');
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid spec ID');
    });
  });

  describe('POST /specs', () => {
    it('should create a new spec', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify([]));

      const res = await request(app)
        .post('/specs')
        .send({ ...sampleSpec, content: '# Test Spec\nSome content' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('test-spec');
      expect(res.body.message).toBe('Specification saved successfully');
      expect(mockWriteFile).toHaveBeenCalledTimes(2); // index + spec.md
    });

    it('should return 400 for invalid spec data', async () => {
      const res = await request(app)
        .post('/specs')
        .send({ id: 'invalid id!', content: 'test' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when content is missing', async () => {
      const res = await request(app).post('/specs').send(sampleSpec);
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Content is required');
    });

    it('should return 400 when content is empty string', async () => {
      const res = await request(app)
        .post('/specs')
        .send({ ...sampleSpec, content: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should detect path traversal in spec ID', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify([]));
      const res = await request(app)
        .post('/specs')
        .send({
          id: 'valid-id',
          topic: 'Test',
          tags: ['test'],
          author: 'tester',
          timestamp: '2025-01-01',
          version: '../../etc',
          content: 'test content',
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
