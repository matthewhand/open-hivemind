import {
  isPrivateIP,
  isSafeUrl as sharedIsSafeUrl,
  type SafeUrlResult,
} from '@hivemind/shared-types';
import { MessageBus } from '../events/MessageBus';

/**
 * Checks if a URL is safe to connect to (SSRF protection).
 *
 * This is a wrapper around the shared isSafeUrl that also emits security alerts
 * to the internal MessageBus for monitoring.
 *
 * @param url The URL to check
 * @returns Promise resolving to SafeUrlResult
 */
export async function isSafeUrl(url: string): Promise<SafeUrlResult> {
  const result = await sharedIsSafeUrl(url);

  if (!result.safe) {
    // Emit security alert to the MessageBus for SSRF violations
    try {
      const bus = MessageBus.getInstance();
      bus.emit('security:alert', {
        type: 'ssrf',
        reason: result.reason || 'SSRF violation detected',
        severity: 'high',
        url,
        ip: result.ip,
        metadata: {
          timestamp: new Date().toISOString(),
          context: 'src/utils/ssrfGuard',
        },
      });
    } catch (err) {
      // Don't let alerting failure block the guard (though MessageBus.emit is usually safe)
    }
  }

  return result;
}

export { isPrivateIP };
