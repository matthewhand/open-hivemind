import {
  AuthenticationError,
  TokenRefreshNotSupportedError,
} from '../../../src/types/errorClasses';

describe('AuthenticationError token-refresh recovery', () => {
  describe('expired_token without a refresh handler', () => {
    it('exposes a recoverable strategy with a fallbackAction', () => {
      const error = new AuthenticationError('Token expired', 'discord', 'expired_token');
      const recovery = error.getRecoveryStrategy();

      expect(recovery.canRecover).toBe(true);
      expect(recovery.maxRetries).toBe(1);
      expect(typeof recovery.fallbackAction).toBe('function');
    });

    it('rejects fallbackAction with a typed TokenRefreshNotSupportedError', async () => {
      const error = new AuthenticationError('Token expired', 'discord', 'expired_token');
      const recovery = error.getRecoveryStrategy();

      await expect(recovery.fallbackAction!()).rejects.toBeInstanceOf(
        TokenRefreshNotSupportedError
      );
    });

    it('includes the provider name in the not-supported error', async () => {
      const error = new AuthenticationError('Token expired', 'slack', 'expired_token');
      const recovery = error.getRecoveryStrategy();

      await expect(recovery.fallbackAction!()).rejects.toMatchObject({
        provider: 'slack',
        code: 'TOKEN_REFRESH_NOT_SUPPORTED',
        statusCode: 401,
      });
    });
  });

  describe('expired_token with an injected refresh handler', () => {
    it('delegates fallbackAction to the supplied handler and returns its result', async () => {
      const handler = jest.fn().mockResolvedValue({ accessToken: 'new-token' });
      const error = new AuthenticationError(
        'Token expired',
        'discord',
        'expired_token',
        undefined,
        handler
      );

      const recovery = error.getRecoveryStrategy();
      const result = await recovery.fallbackAction!();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ accessToken: 'new-token' });
    });

    it('propagates a rejection from the handler unchanged', async () => {
      const failure = new Error('refresh token revoked');
      const handler = jest.fn().mockRejectedValue(failure);
      const error = new AuthenticationError(
        'Token expired',
        'discord',
        'expired_token',
        undefined,
        handler
      );

      const recovery = error.getRecoveryStrategy();

      await expect(recovery.fallbackAction!()).rejects.toBe(failure);
    });
  });

  describe('non-expired authentication reasons', () => {
    it('is not recoverable and has no fallbackAction for invalid credentials', () => {
      const error = new AuthenticationError('Bad credentials', 'discord', 'invalid_credentials');
      const recovery = error.getRecoveryStrategy();

      expect(recovery.canRecover).toBe(false);
      expect(recovery.fallbackAction).toBeUndefined();
    });
  });
});

describe('TokenRefreshNotSupportedError', () => {
  it('is non-recoverable and recommends re-authentication', () => {
    const error = new TokenRefreshNotSupportedError('mattermost');
    const recovery = error.getRecoveryStrategy();

    expect(recovery.canRecover).toBe(false);
    expect(error.message).toContain('mattermost');
    expect(error.code).toBe('TOKEN_REFRESH_NOT_SUPPORTED');
    expect(recovery.recoverySteps).toEqual([
      'Re-authenticate with the provider to obtain a new token',
    ]);
  });

  it('produces a generic message when no provider is given', () => {
    const error = new TokenRefreshNotSupportedError();

    expect(error.message).toBe('Token refresh is not supported. Re-authentication is required.');
    expect(error.provider).toBeUndefined();
  });
});
