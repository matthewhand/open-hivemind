import { SlackSignatureVerifier } from '../../../src/integrations/slack/SlackSignatureVerifier';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

jest.mock('crypto');

const mockRequest = (headers: Record<string, string>, body: object = {}) => ({
  headers,
  body,
  get: jest.fn()
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

  it('should call next() when headers are present', () => {
    const req = mockRequest({ 
      'x-slack-request-timestamp': '123', 
      'x-slack-signature': 'v0=abc123' 
    }, { event: 'test' });
    const res = mockResponse();
    
    // Mock crypto implementation
    const mockDigest = jest.fn().mockReturnValue('abc123');
    const mockUpdate = jest.fn().mockReturnValue({ digest: mockDigest });
    (crypto.createHmac as jest.Mock).mockReturnValue({ update: mockUpdate });

    verifier.verify(req as unknown as Request, res as Response, mockNext);
    
    expect(mockNext).toHaveBeenCalled();
    expect(crypto.createHmac).toHaveBeenCalledWith('sha256', signingSecret);
    expect(mockUpdate).toHaveBeenCalledWith('v0:123:{"event":"test"}');
  });

  it('should generate correct signature base string', () => {
    const reqBody = { challenge: 'test' };
    const req = mockRequest(
      { 
        'x-slack-request-timestamp': '1677822800', 
        'x-slack-signature': 'v0=abc123' 
      },
      reqBody
    );
    const res = mockResponse();
    
    const mockDigest = jest.fn().mockReturnValue('abc123');
    const mockUpdate = jest.fn().mockReturnValue({ digest: mockDigest });
    (crypto.createHmac as jest.Mock).mockReturnValue({ update: mockUpdate });

    verifier.verify(req as unknown as Request, res as Response, mockNext);
    
    expect(mockUpdate).toHaveBeenCalledWith(
      'v0:1677822800:' + JSON.stringify(reqBody)
    );
  });
});