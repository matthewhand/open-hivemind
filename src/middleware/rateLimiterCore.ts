import Debug from 'debug';
import type { Request, Response } from 'express';
import logger from '../common/logger';
import { RATE_LIMIT_CONFIG } from '../config/rateLimitConfig';

const debug = Debug('app:rateLimiterCore');

/**
 * In-memory store with automatic cleanup
 * Used as fallback when Redis is not available
 */
export class MemoryStoreWithCleanup {
  private hits = new Map<string, { count: number; resetTime: number }>();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private windowMs: number;

  constructor(windowMs: number) {
    this.windowMs = windowMs;
    this.startCleanup();
  }

  private startCleanup(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(
      () => {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, data] of this.hits.entries()) {
          if (now > data.resetTime) {
            this.hits.delete(key);
            cleaned++;
          }
        }
        if (cleaned > 0) {
          debug(`Cleaned ${cleaned} expired rate limit entries`);
        }
      },
      Math.min(this.windowMs, 60000)
    ); // Clean at most every minute

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: number }> {
    const now = Date.now();
    const existing = this.hits.get(key);

    if (existing && now < existing.resetTime) {
      existing.count++;
      return { totalHits: existing.count, resetTime: existing.resetTime };
    }

    const resetTime = now + this.windowMs;
    const newData = { count: 1, resetTime };
    this.hits.set(key, newData);
    return { totalHits: 1, resetTime };
  }

  async decrement(key: string): Promise<void> {
    const existing = this.hits.get(key);
    if (existing && existing.count > 0) {
      existing.count--;
    }
  }

  async resetKey(key: string): Promise<void> {
    this.hits.delete(key);
  }

  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.hits.clear();
  }
}

// Global cache for memory stores to prevent duplicate cleanup intervals
export const memoryStores = new Map<string, MemoryStoreWithCleanup>();

/**
 * Validate and sanitize an IP address
 */
export function validateIP(ip: string): string | null {
  if (!ip || typeof ip !== 'string') return null;

  // CRITICAL: Reject any IP that contains newline or carriage return characters to prevent header injection
  if (/[\r\n\0]/.test(ip)) return null;

  ip = ip.trim();

  const ipv4Match = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (ipv4Match) ip = ipv4Match[1];

  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Result = ip.match(ipv4Regex);
  if (ipv4Result) {
    const octets = [ipv4Result[1], ipv4Result[2], ipv4Result[3], ipv4Result[4]];
    for (const octet of octets) {
      if (octet.length > 1 && octet.startsWith('0')) return null;
      const num = parseInt(octet, 10);
      if (isNaN(num) || num < 0 || num > 255) return null;
    }
    return ip;
  }

  // Simplified but robust IPv6 validation
  const ipv6Regex =
    /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  if (ipv6Regex.test(ip)) return ip;

  return null;
}

/**
 * Convert IPv4 to numeric representation for CIDR checks
 */
export function ipToLong(ip: string): number {
  const validated = validateIP(ip);
  if (!validated) return NaN;

  const ipv4Match = validated.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4Match) return NaN;

  return (
    (parseInt(ipv4Match[1], 10) >>> 0) * 256 * 256 * 256 +
    ((parseInt(ipv4Match[2], 10) << 16) >>> 0) +
    ((parseInt(ipv4Match[3], 10) << 8) >>> 0) +
    (parseInt(ipv4Match[4], 10) >>> 0)
  );
}

/**
 * Expand shortened IPv6 addresses
 */
function expandIPv6(ip: string): string {
  if (!ip.includes('::')) return ip;
  const parts = ip.split('::');
  const left = parts[0].split(':').filter(Boolean);
  const right = parts[1].split(':').filter(Boolean);
  const missing = 8 - (left.length + right.length);
  const middle = new Array(missing).fill('0000');
  return [...left, ...middle, ...right].join(':');
}

/**
 * Convert IPv6 to BigInt for CIDR checks
 */
export function ipv6ToBigInt(ip: string): bigint {
  // Handle IPv4-mapped IPv6
  const ipv4Match = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (ipv4Match) {
    const octets = ipv4Match[1].split('.').map((o) => parseInt(o, 10));
    // ::ffff:0:0/96 prefix is 0...0ffff (80 zeros, 16 ones)
    let result = BigInt(0xffff) << BigInt(32);
    result += BigInt(octets[0]) << BigInt(24);
    result += BigInt(octets[1]) << BigInt(16);
    result += BigInt(octets[2]) << BigInt(8);
    result += BigInt(octets[3]);
    return result;
  }

  const expanded = expandIPv6(ip);
  const parts = expanded.split(':').map((p) => p.padStart(4, '0'));
  let result = BigInt(0);
  for (const part of parts) {
    result = (result << BigInt(16)) + BigInt(parseInt(part, 16));
  }
  return result;
}

/**
 * Check if IP is in CIDR range
 */
export function isIPInCIDR(ip: string, cidr: string): boolean {
  try {
    const validatedIp = validateIP(ip);
    if (!validatedIp) return false;

    const [range, prefix] = cidr.split('/');
    const validatedRange = validateIP(range);
    if (!validatedRange) return false;

    const prefixLen = parseInt(prefix, 10);
    if (isNaN(prefixLen)) return false;

    // Check if both are simple IPv4
    const isRawIPv4 = (addr: string) => addr.includes('.') && !addr.includes(':');
    const ipIsV4 = isRawIPv4(validatedIp);
    const rangeIsV4 = isRawIPv4(validatedRange);

    if (ipIsV4 && rangeIsV4) {
      if (prefixLen < 0 || prefixLen > 32) return false;
      if (prefixLen === 0) return true;
      const ipLong = ipToLong(validatedIp);
      const rangeLong = ipToLong(validatedRange);
      const mask = ~(Math.pow(2, 32 - prefixLen) - 1) >>> 0;
      return (ipLong & mask) === (rangeLong & mask);
    }

    // Handle IPv6 (including mapped IPv4)
    if (prefixLen < 0 || prefixLen > 128) return false;
    if (prefixLen === 0) return true;

    const ipBI = ipv6ToBigInt(ip); // use original ip to detect ::ffff:
    const rangeBI = ipv6ToBigInt(range);

    // Create BigInt mask
    const mask = ((BigInt(1) << BigInt(prefixLen)) - BigInt(1)) << BigInt(128 - prefixLen);
    return (ipBI & mask) === (rangeBI & mask);
  } catch {
    return false;
  }
}

/**
 * Get trusted proxies from environment
 */
export function getTrustedProxies(): string[] {
  const env = process.env.TRUSTED_PROXIES;
  if (env) {
    return env
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
  }

  // Default to common private network ranges and loopback
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'];
}

/**
 * Check if IP is a trusted proxy
 */
export function isTrustedProxy(ip: string): boolean {
  const validatedIp = validateIP(ip);
  if (!validatedIp) return false;

  const proxies = getTrustedProxies();
  if (proxies.includes('*')) return true;

  for (const proxy of proxies) {
    if (proxy.includes('/')) {
      if (isIPInCIDR(validatedIp, proxy)) return true;
    } else {
      const validatedProxy = validateIP(proxy);
      if (
        validatedProxy &&
        (validatedIp === validatedProxy || validatedIp === `::ffff:${validatedProxy}`)
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Get client IP address correctly even behind proxies with spoofing protection
 */
export function getClientKey(req: Request): string {
  // Use .get() for headers to support various ways they might be defined in tests
  const getHeader = (name: string) => {
    if (typeof req.get === 'function') return req.get(name);
    if (req.headers) return req.headers[name.toLowerCase()];
    return undefined;
  };

  // CONNECTION IP: The address of the machine directly connecting to us
  const connectionIP = validateIP(req.socket?.remoteAddress || (req as any).ip || '') || 'unknown';

  // If the direct connection is NOT from a trusted proxy, use it as the client IP (ignores headers)
  if (connectionIP !== 'unknown' && !isTrustedProxy(connectionIP)) {
    return connectionIP;
  }

  // If it's from a trusted proxy, we can trust the X-Forwarded-For chain
  const forwardedFor = getHeader('x-forwarded-for');
  if (forwardedFor) {
    const ips = (
      typeof forwardedFor === 'string' ? forwardedFor.split(',') : (forwardedFor as string[])
    )
      .map((ip) => ip.trim())
      .filter(Boolean);

    // X-Forwarded-For order is [client, proxy1, proxy2]
    // Find the right-most IP that is NOT a trusted proxy
    for (let i = ips.length - 1; i >= 0; i--) {
      const validated = validateIP(ips[i]);
      if (validated && !isTrustedProxy(validated)) {
        return validated;
      }
    }

    // If all IPs in the list are trusted proxies, the original client is the left-most one
    const leftmost = validateIP(ips[0]);
    if (leftmost) return leftmost;
  }

  // Fallback to X-Real-IP if X-Forwarded-For didn't yield a non-trusted IP
  const realIp = getHeader('x-real-ip');
  if (realIp && typeof realIp === 'string') {
    const validated = validateIP(realIp);
    if (validated && !isTrustedProxy(validated)) {
      return validated;
    }
  }

  return connectionIP;
}

/**
 * Check if rate limiting should be skipped
 */
export function shouldSkipRateLimit(req: Request): boolean {
  if (process.env.NODE_ENV === 'test' && process.env.ENABLE_RATE_LIMIT_TESTS !== 'true')
    return true;
  if (req.path === '/health' || req.path === '/metrics') return true;
  return false;
}

/**
 * Create a standard rate limit handler
 */
export function createRateLimitHandler(type: string) {
  return (req: Request, res: Response) => {
    const ip = getClientKey(req);
    logger.warn(`${type} rate limit exceeded`, {
      ip,
      path: req.originalUrl,
      method: req.method,
    });

    res.status(429).json({
      error: 'Too many requests',
      message: `Rate limit exceeded for ${type}. Please try again later.`,
      retryAfter: Math.ceil(RATE_LIMIT_CONFIG.default.windowMs / 1000),
      code: 'RATE_LIMIT_EXCEEDED',
    });
  };
}

// Store initialization
export let redisAvailable = false;
export let RedisStore: any = null;
export let redisClient: any = null;

/**
 * Create a rate limit store (Redis or Memory)
 */
export function createStore(prefix: string, windowMs: number) {
  if (redisAvailable && RedisStore && redisClient) {
    debug(`Using Redis store for rate limit prefix: ${prefix}`);
    return new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      prefix: `rl:${prefix}:`,
    });
  }

  debug(`Using memory store for rate limit prefix: ${prefix}`);
  let store = memoryStores.get(prefix);
  if (!store) {
    store = new MemoryStoreWithCleanup(windowMs);
    memoryStores.set(prefix, store);
  }
  return store;
}

export function setRedisAvailable(available: boolean, client?: any, store?: any) {
  redisAvailable = available;
  if (client) redisClient = client;
  if (store) RedisStore = store;
}
