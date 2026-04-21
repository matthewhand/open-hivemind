import { describe, expect, it } from '@jest/globals';
import request from 'supertest';
import app from '../../../src/index';

describe('Extra Security Integration Tests', () => {
  it('should prevent path traversal', async () => {
    const traversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
    ];

    for (const payload of traversalPayloads) {
      const response = await request(app)
        .post('/api/files/read')
        .send({ path: payload });

      expect([400, 403, 404]).toContain(response.status);
    }
  });

  it('should prevent command injection', async () => {
    const commandPayloads = [
      '; ls -la',
      '&& cat /etc/passwd',
    ];

    for (const payload of commandPayloads) {
      const response = await request(app)
        .post('/api/admin/system')
        .send({ botId: payload });

      expect([400, 401, 403, 404]).toContain(response.status);
    }
  });

  it('should handle oversized payloads', async () => {
    const largePayload = {
      data: 'x'.repeat(2 * 1024 * 1024), // 2MB
    };

    const response = await request(app)
      .post('/api/config')
      .send(largePayload);

    expect([413, 400, 401, 200, 201]).toContain(response.status);
  });

  it('should handle long URL paths', async () => {
    const longPath = '/api/health?' + 'x='.repeat(4000);
    const response = await request(app).get(longPath);

    expect(response.status).not.toBe(500);
  });
});
