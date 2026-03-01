import { destroySession } from '../../../src/middleware/sessionMiddleware';
import { Request } from 'express';

describe('destroySession', () => {
  it('should resolve immediately if req.session does not exist', async () => {
    const req = {} as Request;
    await expect(destroySession(req)).resolves.toBeUndefined();
  });

  it('should call req.session.destroy and resolve on success', async () => {
    const destroyMock = jest.fn((cb) => cb());
    const req = {
      session: {
        destroy: destroyMock,
      }
    } as unknown as Request;

    await expect(destroySession(req)).resolves.toBeUndefined();
    expect(destroyMock).toHaveBeenCalledTimes(1);
  });

  it('should call req.session.destroy and reject on error', async () => {
    const error = new Error('destruction failed');
    const destroyMock = jest.fn((cb) => cb(error));
    const req = {
      session: {
        destroy: destroyMock,
      }
    } as unknown as Request;

    await expect(destroySession(req)).rejects.toThrow('destruction failed');
    expect(destroyMock).toHaveBeenCalledTimes(1);
  });
});
