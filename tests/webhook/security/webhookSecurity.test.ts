import { verifyWebhookToken, verifyIpWhitelist } from '@webhook/security/webhookSecurity';

describe('WebhookSecurity', () => {
  it('should have verifyWebhookToken defined', () => {
    expect(verifyWebhookToken).toBeDefined();
  });

  it('should have verifyIpWhitelist defined', () => {
    expect(verifyIpWhitelist).toBeDefined();
  });
});