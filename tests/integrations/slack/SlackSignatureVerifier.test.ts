import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { SlackSignatureVerifier } from '../../../packages/adapter-slack/src/SlackSignatureVerifier';

const mockRequest = (headers: Record<string, string>, body: object = {}) => ({
  headers,
  body,
  get: jest.fn(),
});

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('SlackSignatureVerifier', () => {
  const signingSecret = 'test-secret';
  const verifier = new SlackSignatureVerifier(signingSecret);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if x-slack-request-timestamp is missing', () => {
    const req = mockRequest({ 'x-slack-signature': 'sig' });
    const res = mockResponse();
    verifier.verify(req as unknown as Request, res as Response, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Bad Request');
  });

  it('should return 400 if x-slack-signature is missing', () => {
    const req = mockRequest({ 'x-slack-request-timestamp': '123' });
    const res = mockResponse();
    verifier.verify(req as unknown as Request, res as Response, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Bad Request');
  });

  it('should call next() when signature is valid and timestamp is fresh', () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const body = { event: 'test' };
    const base = `v0:${ts}:${JSON.stringify(body)}`;
    const sig = `v0=${crypto.createHmac('sha256', signingSecret).update(base).digest('hex')}`;
    const req = mockRequest(
      {
        'x-slack-request-timestamp': ts,
        'x-slack-signature': sig,
      },
      body
    );
    const res = mockResponse();

    verifier.verify(req as unknown as Request, res as Response, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('rejects when signature is invalid for the computed base string', () => {
    const ts = String(Math.floor(Date.now() / 1000));
    const reqBody = { challenge: 'test' };
    const badSig = 'v0=deadbeef';
    const req = mockRequest(
      {
        'x-slack-request-timestamp': ts,
        'x-slack-signature': badSig,
      },
      reqBody
    );
    const res = mockResponse();
    verifier.verify(req as unknown as Request, res as Response, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
