import dns from 'dns';
import net from 'net';
import ipaddr from 'ipaddr.js';

export interface SafeUrlResult {
  safe: boolean;
  ip?: string;
  reason?: string;
}

/**
 * Check if an IP address is in a CIDR range.
 * Supports both IPv4 and IPv6, including cross-version matching via IPv4-mapping.
 */
export function isIPInCIDR(ip: string, cidr: string): boolean {
  try {
    if (!cidr || !cidr.includes('/')) return false;
    const [range, bitsStr] = cidr.split('/');
    const bits = parseInt(bitsStr, 10);

    if (isNaN(bits) || bits < 0) return false;
    if (bits === 0) return true;

    let addr = ipaddr.parse(ip);
    let network = ipaddr.parse(range);

    // If versions match, use standard match
    if (addr.kind() === network.kind()) {
      return (addr as any).match(network, bits);
    }

    // If versions differ, attempt to normalize to IPv6 for comparison
    if (addr.kind() === 'ipv4') {
      addr = (addr as ipaddr.IPv4).toIPv4MappedAddress();
    }

    if (network.kind() === 'ipv4') {
      // An IPv4 /24 becomes an IPv6 /120 (96 + 24)
      network = (network as ipaddr.IPv4).toIPv4MappedAddress();
      return (addr as any).match(network, 96 + bits);
    }

    // Both are now IPv6
    return (addr as any).match(network, bits);
  } catch (err) {
    // Parsing or matching failed
    return false;
  }
}

/**
 * Checks if a URL is safe to connect to (SSRF protection).
 *
 * Validates:
 * 1. Protocol is http, https, ws, or wss.
 * 2. Hostname resolves to a public IP address.
 * 3. IP address is not in private/reserved ranges.
 *
 * Can be bypassed by setting ALLOW_LOCAL_NETWORK_ACCESS=true environment variable.
 * Supports MCP_INTERNAL_CIDR_ALLOWLIST for internal service communication.
 *
 * @param url The URL to check
 * @returns Promise resolving to SafeUrlResult
 */
export async function isSafeUrl(url: string): Promise<SafeUrlResult> {
  // 1. Protocol Check
  try {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol.toLowerCase();

    // Only allow HTTP/S and WS/S protocols
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(protocol)) {
      return { safe: false, reason: `Forbidden protocol: ${protocol}` };
    }

    const hostname = parsedUrl.hostname;

    // Check if hostname is an IP literal
    if (net.isIP(hostname)) {
      return validateIP(hostname);
    }

    // Resolve hostname to IP - ALWAYS resolve to prevent DNS rebinding/bypass
    try {
      const { address } = await dns.promises.lookup(hostname);
      return validateIP(address);
    } catch (error) {
      // DNS resolution failed - treat as unsafe
      return { safe: false, reason: `DNS resolution failed for ${hostname}` };
    }
  } catch (error) {
    // Invalid URL format
    return { safe: false, reason: 'Invalid URL format' };
  }
}

function validateIP(ip: string): SafeUrlResult {
  // Check against Internal CIDR Allowlist first
  const internalAllowlist = process.env.MCP_INTERNAL_CIDR_ALLOWLIST;
  if (internalAllowlist) {
    const ranges = internalAllowlist.split(',').map((r) => r.trim());
    if (ranges.some((range) => isIPInCIDR(ip, range))) {
      return { safe: true, ip };
    }
  }

  if (isPrivateIP(ip)) {
    const allowed = process.env.ALLOW_LOCAL_NETWORK_ACCESS === 'true';
    return {
      safe: allowed,
      ip,
      reason: allowed ? undefined : `Private IP address blocked: ${ip}`,
    };
  }

  return { safe: true, ip };
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
