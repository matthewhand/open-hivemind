import dns from 'dns';
import net from 'net';

/**
 * Checks if a URL is safe to connect to (SSRF protection).
 *
 * Validates:
 * 1. Protocol is http, https, ws, or wss.
 * 2. Hostname resolves to a public IP address.
 * 3. IP address is not in private/reserved ranges.
 *
 * Can be bypassed by setting ALLOW_LOCAL_NETWORK_ACCESS=true environment variable.
 *
 * @param url The URL to check
 * @returns Promise resolving to true if safe, false otherwise
 */
export async function isSafeUrl(url: string): Promise<boolean> {
  // 1. Protocol Check
  try {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol.toLowerCase();

    // Only allow HTTP/S and WS/S protocols
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(protocol)) {
      return false;
    }

    // Allow loopback/private IPs if explicitly configured
    if (process.env.ALLOW_LOCAL_NETWORK_ACCESS === 'true') {
      return true;
    }

    const hostname = parsedUrl.hostname;

    // Check if hostname is an IP literal
    if (net.isIP(hostname)) {
      return !isPrivateIP(hostname);
    }

    // Resolve hostname to IP
    try {
      const { address } = await dns.promises.lookup(hostname);
      return !isPrivateIP(address);
    } catch (error) {
      // DNS resolution failed - treat as unsafe
      return false;
    }
  } catch (error) {
    // Invalid URL format
    return false;
  }
}

/**
 * Checks if an IP address is private or reserved.
 * @param ip The IP address to check
 * @returns true if private/reserved, false if public
 */
export function isPrivateIP(ip: string): boolean {
  if (net.isIPv4(ip)) {
    return isPrivateIPv4(ip);
  } else if (net.isIPv6(ip)) {
    return isPrivateIPv6(ip);
  }
  return false; // Invalid IP
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;

  const [a, b, c, d] = parts;

  // 10.0.0.0/8
  if (a === 10) return true;

  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 169.254.0.0/16 (Link-local)
  if (a === 169 && b === 254) return true;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  return false;
}

function isPrivateIPv6(ip: string): boolean {
  // Normalize IPv6 address (handle :: compression)
  // Simple check for common private ranges

  // ::1 (Loopback)
  if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true;

  // :: (Unspecified)
  if (ip === '::' || ip === '0:0:0:0:0:0:0:0') return true;

  // fc00::/7 (Unique Local)
  // standard format usually starts with fc or fd
  const firstBlock = ip.split(':')[0].toLowerCase();
  if (firstBlock.startsWith('fc') || firstBlock.startsWith('fd')) return true;

  // fe80::/10 (Link Local)
  if (
    firstBlock.startsWith('fe8') ||
    firstBlock.startsWith('fe9') ||
    firstBlock.startsWith('fea') ||
    firstBlock.startsWith('feb')
  )
    return true;

  // IPv4 Mapped Address (::ffff:127.0.0.1)
  if (ip.toLowerCase().startsWith('::ffff:')) {
    const ipv4Part = ip.split(':').pop();
    if (ipv4Part && net.isIPv4(ipv4Part)) {
      return isPrivateIPv4(ipv4Part);
    }
  }

  return false;
}
