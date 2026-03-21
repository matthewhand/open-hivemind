import dns from 'dns';
import net from 'net';

/**
 * Checks if a URL is safe to connect to (SSRF protection).
 */
export async function isSafeUrl(url: string): Promise<boolean> {
  try {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol.toLowerCase();

    if (!['http:', 'https:', 'ws:', 'wss:'].includes(protocol)) {
      return false;
    }

    const hostname = parsedUrl.hostname;

    // 1. Resolve hostname to IP - ALWAYS resolve first to prevent DNS rebinding/bypass
    let ip: string;
    if (net.isIP(hostname)) {
      ip = hostname;
    } else {
      try {
        const { address } = await dns.promises.lookup(hostname);
        ip = address;
      } catch {
        // DNS resolution failed - treat as unsafe
        return false;
      }
    }

    // 2. Check if IP is private/reserved
    if (isPrivateIP(ip)) {
      if (process.env.ALLOW_LOCAL_NETWORK_ACCESS === 'true') {
        return true;
      }
      console.warn(`[SSRF Guard] Blocked private IP: ${ip} (from hostname: ${hostname})`);
      return false;
    }

    return true;
  } catch {
    // Invalid URL format
    return false;
  }
}

/**
 * Checks if an IP address is private or reserved.
 */
export function isPrivateIP(ip: string): boolean {
  if (net.isIPv4(ip)) {
    return isPrivateIPv4(ip);
  } else if (net.isIPv6(ip)) {
    return isPrivateIPv6(ip);
  }
  return false;
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;
  const [a, b, c, d] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 0) return true;
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true;
  if (ip === '::' || ip === '0:0:0:0:0:0:0:0') return true;
  const firstBlock = ip.split(':')[0].toLowerCase();
  if (firstBlock.startsWith('fc') || firstBlock.startsWith('fd')) return true;
  if (firstBlock.startsWith('fe8') || firstBlock.startsWith('fe9') || firstBlock.startsWith('fea') || firstBlock.startsWith('feb')) return true;
  if (ip.toLowerCase().startsWith('::ffff:')) {
    const ipv4Part = ip.split(':').pop();
    if (ipv4Part && net.isIPv4(ipv4Part)) return isPrivateIPv4(ipv4Part);
  }
  return false;
}
