/**
 * Slack Event Processing Tests
 *
 * Tests the SlackSignatureVerifier (HMAC verification, timestamp skew,
 * missing headers) and the extractSlackMetadata function against real
 * Slack webhook event shapes.
 *
 * This replaces the old 112-line skipped test file that mocked the entire
 * SlackService and asserted nothing about real code paths.
 */
import crypto from 'crypto';
import { SlackSignatureVerifier } from '@hivemind/message-slack/SlackSignatureVerifier';
import { extractSlackMetadata } from '@hivemind/message-slack/slackMetadata';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SIGNING_SECRET = 'test-signing-secret-abc123';

function generateSignature(payload: string, timestamp: string, secret: string = SIGNING_SECRET): string {
  const baseString = `v0:${timestamp}:${payload}`;
  const hmac = crypto.createHmac('sha256', secret).update(baseString).digest('hex');
  return `v0=${hmac}`;
}

function createMockReq(body: any, headers: Record<string, string> = {}): any {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    body: typeof body === 'string' ? body : body,
    rawBody: bodyStr,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Slack Event Processing', () => {
  // ---- Signature Verification ----

  describe('SlackSignatureVerifier', () => {
    let verifier: SlackSignatureVerifier;
    let mockRes: any;
    let mockNext: jest.Mock;

    beforeEach(() => {
      verifier = new SlackSignatureVerifier(SIGNING_SECRET);
      mockRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };
      mockNext = jest.fn();
    });

    it('should pass verification for a valid signature', () => {
      const payload = JSON.stringify({ type: 'event_callback', event: { type: 'message' } });
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = generateSignature(payload, timestamp);
      const req = createMockReq(payload, {
        'x-slack-request-timestamp': timestamp,
        'x-slack-signature': signature,
      });

      verifier.verify(req, mockRes, mockNext);

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject requests missing the timestamp header', () => {
      const req = createMockReq({ type: 'event_callback' }, {
        'x-slack-signature': 'v0=abc123',
      });

      verifier.verify(req, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith('Bad Request');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject requests missing the signature header', () => {
      const req = createMockReq({ type: 'event_callback' }, {
        'x-slack-request-timestamp': '1700000000',
      });

      verifier.verify(req, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith('Bad Request');
    });

    it('should reject requests with a stale timestamp (older than 5 minutes)', () => {
      const payload = JSON.stringify({ type: 'event_callback' });
      const oldTimestamp = String(Math.floor(Date.now() / 1000) - 60 * 6); // 6 minutes ago
      const signature = generateSignature(payload, oldTimestamp);
      const req = createMockReq(payload, {
        'x-slack-request-timestamp': oldTimestamp,
        'x-slack-signature': signature,
      });

      verifier.verify(req, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith('Bad Request: stale timestamp');
    });

    it('should reject requests with an invalid signature', () => {
      const payload = JSON.stringify({ type: 'event_callback' });
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const req = createMockReq(payload, {
        'x-slack-request-timestamp': timestamp,
        'x-slack-signature': 'v0=invalid-signature',
      });

      verifier.verify(req, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.send).toHaveBeenCalledWith('Forbidden: Invalid signature');
    });

    it('should reject requests with a signature from a different secret', () => {
      const payload = JSON.stringify({ type: 'event_callback', event: { type: 'message' } });
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const wrongSignature = generateSignature(payload, timestamp, 'wrong-secret');
      const req = createMockReq(payload, {
        'x-slack-request-timestamp': timestamp,
        'x-slack-signature': wrongSignature,
      });

      verifier.verify(req, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should handle string request bodies for signature computation', () => {
      const payloadStr = JSON.stringify({ type: 'url_verification', challenge: 'abc123' });
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = generateSignature(payloadStr, timestamp);
      const req = createMockReq(payloadStr, {
        'x-slack-request-timestamp': timestamp,
        'x-slack-signature': signature,
      });

      verifier.verify(req, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle non-JSON bodies by stringifying them', () => {
      const body = { type: 'event_callback' };
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = generateSignature(JSON.stringify(body), timestamp);
      const req = createMockReq(body, {
        'x-slack-request-timestamp': timestamp,
        'x-slack-signature': signature,
      });
      // Remove rawBody so verifier falls back to JSON.stringify
      delete (req as any).rawBody;

      verifier.verify(req, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject replay attacks (reuse of old signature with current timestamp)', () => {
      const payload = JSON.stringify({ type: 'event_callback' });
      const oldTimestamp = String(Math.floor(Date.now() / 1000) - 10); // 10 seconds ago
      const oldSignature = generateSignature(payload, oldTimestamp);

      // Attacker reuses old signature but with current timestamp
      const currentTimestamp = Math.floor(Date.now() / 1000).toString();
      const req = createMockReq(payload, {
        'x-slack-request-timestamp': currentTimestamp,
        'x-slack-signature': oldSignature,
      });

      verifier.verify(req, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  // ---- Metadata Extraction ----

  describe('extractSlackMetadata', () => {
    it('should extract user, channel, and ts from a standard message event', () => {
      const event = {
        type: 'message',
        user: 'U12345',
        channel: 'C67890',
        ts: '1700000000.000100',
        text: 'Hello!',
        team: 'T99999',
      };

      const meta = extractSlackMetadata(event);

      expect(meta.slackUser).toBe('U12345');
      expect(meta.slackChannel).toBe('C67890');
      expect(meta.slackTimestamp).toBe('1700000000.000100');
      expect(meta.slackTeam).toBe('T99999');
    });

    it('should extract thread_ts from a threaded reply', () => {
      const event = {
        type: 'message',
        user: 'U12345',
        channel: 'C67890',
        ts: '1700000001.000200',
        thread_ts: '1700000000.000100',
      };

      const meta = extractSlackMetadata(event);
      expect(meta.slackThread).toBe('1700000000.000100');
    });

    it('should handle null/undefined event gracefully', () => {
      const metaNull = extractSlackMetadata(null as any);
      expect(metaNull.slackUser).toBeUndefined();
      expect(metaNull.slackChannel).toBeUndefined();

      const metaUndef = extractSlackMetadata(undefined as any);
      expect(metaUndef.slackUser).toBeUndefined();
    });

    it('should extract bot_id as user for bot_message subtype', () => {
      const event = {
        type: 'message',
        subtype: 'bot_message',
        bot_id: 'B12345',
        channel: 'C67890',
        ts: '1700000000.000300',
      };

      const meta = extractSlackMetadata(event);
      expect(meta.slackUser).toBe('B12345');
    });
  });
});
