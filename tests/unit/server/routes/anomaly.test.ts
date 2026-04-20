import request from 'supertest';
import express from 'express';
import anomalyRouter from '../../../src/server/routes/anomaly';
import { DatabaseManager } from '../../../src/database/DatabaseManager';
import { AnomalyDetectionService } from '../../../src/services/AnomalyDetectionService';

jest.mock('../../../src/database/DatabaseManager');
jest.mock('../../../src/services/AnomalyDetectionService');

describe('Anomaly Routes', () => {
  let app: express.Application;
  let mockDbManager: any;
  let mockAnomalyService: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/anomalies', anomalyRouter);

    mockDbManager = {
      isConnected: jest.fn().mockReturnValue(true),
      getActiveAnomalies: jest.fn().mockResolvedValue([]),
      getAnomalies: jest.fn().mockResolvedValue([]),
    };
    (DatabaseManager.getInstance as jest.Mock).mockReturnValue(mockDbManager);

    mockAnomalyService = {
      resolveAnomaly: jest.fn().mockResolvedValue(true),
    };
    (AnomalyDetectionService.getInstance as jest.Mock).mockReturnValue(mockAnomalyService);
  });

  describe('GET /api/anomalies', () => {
    it('should return active anomalies', async () => {
      mockDbManager.getActiveAnomalies.mockResolvedValue([{ id: '1', type: 'test' }]);
      const res = await request(app).get('/api/anomalies');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it('should return 503 if DB is not connected', async () => {
      mockDbManager.isConnected.mockReturnValue(false);
      const res = await request(app).get('/api/anomalies');
      expect(res.status).toBe(503);
    });
  });

  describe('POST /api/anomalies/:id/resolve', () => {
    it('should resolve anomaly', async () => {
      const res = await request(app).post('/api/anomalies/1/resolve').send({ reason: 'test' });
      expect(res.status).toBe(200);
      expect(mockAnomalyService.resolveAnomaly).toHaveBeenCalledWith('1');
    });

    it('should return 404 if anomaly not found', async () => {
        mockAnomalyService.resolveAnomaly.mockResolvedValue(false);
        const res = await request(app).post('/api/anomalies/999/resolve').send({ reason: 'test' });
        expect(res.status).toBe(404);
    });
  });
});
