import { Request, Response, NextFunction } from 'express';
import {
  getSessionSecret,
  sessionSecurityMiddleware,
  requireSession,
  destroySession,
  regenerateSession,
} from '../../src/middleware/sessionMiddleware';

describe('sessionMiddleware module', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      session: {
        userId: 'user123',
        lastActivity: Date.now(),
        isNew: false,
        regenerate: jest.fn((cb) => cb(null)),
        destroy: jest.fn((cb) => cb(null)),
      } as any,
    };

    res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    next = jest.fn();

    // Clear mock data
    jest.clearAllMocks();
  });

  describe('getSessionSecret', () => {
    let originalSecret: string | undefined;

    beforeAll(() => {
      originalSecret = process.env.SESSION_SECRET;
    });

    afterAll(() => {
      process.env.SESSION_SECRET = originalSecret;
    });

    it('throws error when SESSION_SECRET is not set', () => {
      delete process.env.SESSION_SECRET;
      expect(() => getSessionSecret()).toThrow(/SESSION_SECRET environment variable is required/);
    });

    it('returns the secret when set', () => {
      process.env.SESSION_SECRET = 'verysecret123456789012345678901234567890';
      expect(getSessionSecret()).toBe('verysecret123456789012345678901234567890');
    });
  });

  describe('sessionSecurityMiddleware', () => {
    it('skips if no session exists', () => {
      req.session = undefined;

      sessionSecurityMiddleware(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
      expect(res.setHeader).not.toHaveBeenCalled();
    });

    it('regenerates session to prevent fixation if isNew and userId is present', () => {
      (req.session as any).isNew = true;
      (req.session as any).userId = 'user123';

      sessionSecurityMiddleware(req as Request, res as Response, next as NextFunction);

      expect(req.session?.regenerate).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('destroys session and returns 401 if idle timeout exceeded', () => {
      const pastTime = Date.now() - (1800000 + 1000); // More than 30 mins ago
      (req.session as any).lastActivity = pastTime;

      sessionSecurityMiddleware(req as Request, res as Response, next as NextFunction);

      expect(req.session?.destroy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Session expired', code: 'SESSION_EXPIRED' });
      expect(next).not.toHaveBeenCalled();
    });

    it('updates lastActivity and sets security headers for valid session', () => {
      const now = Date.now();
      const spy = jest.spyOn(Date, 'now').mockReturnValue(now);

      sessionSecurityMiddleware(req as Request, res as Response, next as NextFunction);

      expect((req.session as any).lastActivity).toBe(now);
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      expect(res.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
      expect(res.setHeader).toHaveBeenCalledWith('Expires', '0');
      expect(res.setHeader).toHaveBeenCalledWith('Surrogate-Control', 'no-store');
      expect(next).toHaveBeenCalled();

      spy.mockRestore();
    });
  });

  describe('requireSession', () => {
    it('returns 401 if no session exists', () => {
      req.session = undefined;

      requireSession(req as Request, res as Response, next as NextFunction);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required', code: 'AUTHENTICATION_REQUIRED' });
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 if userId is missing', () => {
      (req.session as any).userId = undefined;

      requireSession(req as Request, res as Response, next as NextFunction);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required', code: 'AUTHENTICATION_REQUIRED' });
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next if session and userId exist', () => {
      requireSession(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('session promises', () => {
    describe('destroySession', () => {
      it('destroys session and resolves', async () => {
        await expect(destroySession(req as Request)).resolves.toBeUndefined();
        expect(req.session?.destroy).toHaveBeenCalled();
      });

      it('resolves if no session exists', async () => {
        req.session = undefined;
        await expect(destroySession(req as Request)).resolves.toBeUndefined();
      });

      it('rejects if destroy fails', async () => {
        const error = new Error('Destroy failed');
        (req.session?.destroy as jest.Mock).mockImplementation((cb) => cb(error));

        await expect(destroySession(req as Request)).rejects.toThrow('Destroy failed');
      });
    });

    describe('regenerateSession', () => {
      it('regenerates session and resolves', async () => {
        await expect(regenerateSession(req as Request)).resolves.toBeUndefined();
        expect(req.session?.regenerate).toHaveBeenCalled();
      });

      it('resolves if no session exists', async () => {
        req.session = undefined;
        await expect(regenerateSession(req as Request)).resolves.toBeUndefined();
      });

      it('rejects if regenerate fails', async () => {
        const error = new Error('Regenerate failed');
        (req.session?.regenerate as jest.Mock).mockImplementation((cb) => cb(error));

        await expect(regenerateSession(req as Request)).rejects.toThrow('Regenerate failed');
      });
    });
  });
});
