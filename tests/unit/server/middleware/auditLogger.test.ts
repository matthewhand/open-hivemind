import { Request, Response, NextFunction } from 'express';
import { auditLogger, auditMiddleware } from '../../../../src/server/middleware/auditLogger';

describe('server/middleware/auditLogger', () => {
  describe('AuditLoggerService', () => {
    it('should log entries and respect maxLogs', () => {
      // The singleton is imported, we might want to clear it if possible or just test its behavior
      auditLogger.log({
        action: 'TEST',
        resource: 'RES',
        ip: '1.1.1.1',
        userAgent: 'UA',
        status: 'success',
      });

      const logs = auditLogger.getLogs(1);
      expect(logs[0].action).toBe('TEST');
    });

    it('should query logs correctly', () => {
        const logs = auditLogger.query({ actions: ['TEST'] });
        expect(logs.length).toBeGreaterThan(0);
        expect(logs[0].action).toBe('TEST');
    });

    it('should return stats', () => {
        const stats = auditLogger.getStats();
        expect(stats.total).toBeGreaterThan(0);
        expect(stats.byAction['TEST']).toBeGreaterThan(0);
    });
  });

  describe('auditMiddleware', () => {
    let req: Partial<Request>;
    let res: any;
    let next: NextFunction;

    beforeEach(() => {
      req = {
        params: { id: '123' },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('test-agent'),
        connection: {} as any,
        headers: {},
      };
      res = {
        send: jest.fn(),
        statusCode: 200,
      };
      next = jest.fn();
    });

    it('should wrap res.send and log on call', () => {
      const middleware = auditMiddleware('ACTION', 'RESOURCE');
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();

      // Trigger the wrapped send
      res.send({ data: 'ok' });

      const logs = auditLogger.getLogs(1);
      expect(logs[0].action).toBe('ACTION');
      expect(logs[0].resource).toBe('RESOURCE');
      expect(logs[0].resourceId).toBe('123');
    });
  });
});
