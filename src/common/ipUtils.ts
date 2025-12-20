import net from 'net';

/**
 * Checks if an IP address matches a whitelist of IPs or CIDR ranges.
 * Currently supports IPv4 CIDR and IPv4/IPv6 Exact Match.
 * 
 * @param clientIp - The IP address to check
 * @param whitelist - Array of allowed IPs or CIDR ranges
 * @returns true if IP is whitelisted
 */
export function isIpWhitelisted(clientIp: string, whitelist: string[]): boolean {
    if (!clientIp || !whitelist || whitelist.length === 0) return false;

    // Normalize IPv6 mapped IPv4 addresses (::ffff:127.0.0.1 -> 127.0.0.1)
    if (net.isIPv6(clientIp) && clientIp.toLowerCase().startsWith('::ffff:')) {
        clientIp = clientIp.substring(7);
    }

    for (const entry of whitelist) {
        const trimmed = entry.trim();
        if (!trimmed) continue;

        if (trimmed.includes('/')) {
            // CIDR Range
            if (isIpInCidr(clientIp, trimmed)) {
                return true;
            }
        } else {
            // Exact Match
            if (clientIp === trimmed) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Checks if an IP is within a CIDR range
 * Note: Currently only supports IPv4 CIDR
 */
function isIpInCidr(ip: string, cidr: string): boolean {
    // Only verify IPv4 for CIDR logic to avoid complexity without libraries
    if (!net.isIPv4(ip)) {
        return false;
    }

    const [range, bitsStr] = cidr.split('/');
    if (!net.isIPv4(range)) {
        return false; // Invalid base IP in CIDR
    }

    const bits = parseInt(bitsStr, 10);
    if (isNaN(bits) || bits < 0 || bits > 32) {
        return false; // Invalid prefix length
    }

    const ipLong = ipToLong(ip);
    const rangeLong = ipToLong(range);
    const mask = ~((1 << (32 - bits)) - 1);

    return (ipLong & mask) === (rangeLong & mask);
}

/**
 * Convert IPv4 string to unsigned long
 */
function ipToLong(ip: string): number {
    const parts = ip.split('.').map(Number);
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}
