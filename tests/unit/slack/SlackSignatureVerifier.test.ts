import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { SlackSignatureVerifier } from '@hivemind/adapter-slack/SlackSignatureVerifier';

describe('SlackSignatureVerifier', () => {
  const secret = 'test-secret';
  let verifier: SlackSignatureVerifier;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    verifier = new SlackSignatureVerifier(secret);
    req = { headers: {}, body: { foo: 'bar' } };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    next = jest.fn();
  });

  it('returns 400 if missing headers', () => {
    verifier.verify(req as any, res as any, next as any);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Bad Request');
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next for valid signature', () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const bodyString = JSON.stringify(req.body);
    const baseString = `v0:${timestamp}:${bodyString}`;
    const signature = `v0=${crypto.createHmac('sha256', secret).update(baseString).digest('hex')}`;

    req.headers = {
      'x-slack-request-timestamp': timestamp,
      'x-slack-signature': signature,
    } as any;
    (req as any).rawBody = bodyString;
    verifier.verify(req as any, res as any, next as any);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  it('returns 403 when signature mismatches', () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    req.headers = {
      'x-slack-request-timestamp': timestamp,
      'x-slack-signature': 'v0=invalid',
    } as any;
    verifier.verify(req as any, res as any, next as any);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when timestamp is stale', () => {
    const staleTs = String(Math.floor(Date.now() / 1000) - 4000);
    const bodyString = JSON.stringify(req.body);
    const baseString = `v0:${staleTs}:${bodyString}`;
    const signature = `v0=${crypto.createHmac('sha256', secret).update(baseString).digest('hex')}`;
    req.headers = {
      'x-slack-request-timestamp': staleTs,
      'x-slack-signature': signature,
    } as any;
    verifier.verify(req as any, res as any, next as any);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
