import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { SlackSignatureVerifier } from './SlackSignatureVerifier';

const SIGNING_SECRET = 'test-signing-secret';

const buildSignature = (ts: string, body: string, secret: string = SIGNING_SECRET): string =>
  `v0=${crypto.createHmac('sha256', secret).update(`v0:${ts}:${body}`).digest('hex')}`;

const mockRes = () => {
  const res: Partial<Response> & { statusCode?: number; body?: unknown } = {};
  res.status = jest.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res as Response;
  });
  res.send = jest.fn().mockImplementation((payload: unknown) => {
    res.body = payload;
    return res as Response;
  });
  return res as Response & { statusCode?: number; body?: unknown };
};

const mockReq = (
  headers: Record<string, string | undefined>,
  body: unknown,
  rawBody?: string
): Request => {
  const req = { headers, body } as unknown as Request & { rawBody?: string };
  if (rawBody !== undefined) {
    req.rawBody = rawBody;
  }
  return req;
};

describe('SlackSignatureVerifier', () => {
  let verifier: SlackSignatureVerifier;
  let next: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    verifier = new SlackSignatureVerifier(SIGNING_SECRET);
    next = jest.fn();
  });

  describe('header validation', () => {
    it('rejects with 400 when x-slack-request-timestamp is missing', () => {
      const res = mockRes();
      verifier.verify(mockReq({ 'x-slack-signature': 'v0=abc' }, {}), res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith('Bad Request');
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects with 400 when x-slack-signature is missing', () => {
      const res = mockRes();
      const ts = String(Math.floor(Date.now() / 1000));
      verifier.verify(mockReq({ 'x-slack-request-timestamp': ts }, {}), res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith('Bad Request');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('replay protection (5-minute skew window)', () => {
    it('rejects timestamps older than 5 minutes', () => {
      const staleTs = String(Math.floor(Date.now() / 1000) - 60 * 5 - 1);
      const body = JSON.stringify({ type: 'event_callback' });
      const res = mockRes();
      verifier.verify(
        mockReq(
          {
            'x-slack-request-timestamp': staleTs,
            'x-slack-signature': buildSignature(staleTs, body),
          },
          {},
          body
        ),
        res,
        next
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith('Bad Request: stale timestamp');
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects timestamps too far in the future', () => {
      const futureTs = String(Math.floor(Date.now() / 1000) + 60 * 5 + 1);
      const body = JSON.stringify({ type: 'event_callback' });
      const res = mockRes();
      verifier.verify(
        mockReq(
          {
            'x-slack-request-timestamp': futureTs,
            'x-slack-signature': buildSignature(futureTs, body),
          },
          {},
          body
        ),
        res,
        next
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith('Bad Request: stale timestamp');
    });

    it('rejects non-numeric timestamps', () => {
      const res = mockRes();
      verifier.verify(
        mockReq(
          {
            'x-slack-request-timestamp': 'not-a-number',
            'x-slack-signature': 'v0=abc',
          },
          {}
        ),
        res,
        next
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith('Bad Request: stale timestamp');
    });
  });

  describe('signature validation', () => {
    it('accepts a valid signature computed over rawBody and calls next()', () => {
      const ts = String(Math.floor(Date.now() / 1000));
      const rawBody = JSON.stringify({ type: 'event_callback', event: { type: 'message' } });
      const sig = buildSignature(ts, rawBody);
      const res = mockRes();
      verifier.verify(
        mockReq(
          { 'x-slack-request-timestamp': ts, 'x-slack-signature': sig },
          JSON.parse(rawBody),
          rawBody
        ),
        res,
        next
      );
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('falls back to JSON.stringify(req.body) when rawBody is absent', () => {
      const ts = String(Math.floor(Date.now() / 1000));
      const body = { challenge: 'abc' };
      const sig = buildSignature(ts, JSON.stringify(body));
      const res = mockRes();
      verifier.verify(
        mockReq({ 'x-slack-request-timestamp': ts, 'x-slack-signature': sig }, body),
        res,
        next
      );
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('rejects with 403 when signature is forged with a different secret', () => {
      const ts = String(Math.floor(Date.now() / 1000));
      const body = JSON.stringify({ challenge: 'x' });
      const forged = buildSignature(ts, body, 'attacker-secret');
      const res = mockRes();
      verifier.verify(
        mockReq({ 'x-slack-request-timestamp': ts, 'x-slack-signature': forged }, {}, body),
        res,
        next
      );
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Forbidden: Invalid signature');
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects with 403 when body is tampered after signing', () => {
      const ts = String(Math.floor(Date.now() / 1000));
      const signedBody = JSON.stringify({ text: 'original' });
      const tamperedBody = JSON.stringify({ text: 'TAMPERED' });
      const sig = buildSignature(ts, signedBody);
      const res = mockRes();
      verifier.verify(
        mockReq({ 'x-slack-request-timestamp': ts, 'x-slack-signature': sig }, {}, tamperedBody),
        res,
        next
      );
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('rejects when signature length differs (avoids timingSafeEqual throw)', () => {
      const ts = String(Math.floor(Date.now() / 1000));
      const body = JSON.stringify({});
      const res = mockRes();
      verifier.verify(
        mockReq(
          {
            'x-slack-request-timestamp': ts,
            'x-slack-signature': 'v0=short',
          },
          {},
          body
        ),
        res,
        next
      );
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('uses crypto.timingSafeEqual for the comparison', () => {
      const spy = jest.spyOn(crypto, 'timingSafeEqual');
      const ts = String(Math.floor(Date.now() / 1000));
      const body = JSON.stringify({ ok: true });
      const sig = buildSignature(ts, body);
      verifier.verify(
        mockReq({ 'x-slack-request-timestamp': ts, 'x-slack-signature': sig }, {}, body),
        mockRes(),
        next
      );
      expect(spy).toHaveBeenCalledTimes(1);
      const [a, b] = spy.mock.calls[0] as [Buffer, Buffer];
      expect(a.length).toBe(b.length);
      spy.mockRestore();
    });
  });
});
