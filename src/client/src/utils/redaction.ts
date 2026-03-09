/**
 * PII (Personally Identifiable Information) Redaction Utility
 *
 * Provides centralized, configurable redaction for sensitive data.
 * Supports multiple redaction levels and admin bypass for debugging.
 */

export type RedactionLevel = 'strict' | 'moderate' | 'minimal';

export interface RedactionConfig {
    level: RedactionLevel;
    allowAdminBypass: boolean;
}

const defaultConfig: RedactionConfig = {
    level: 'strict',
    allowAdminBypass: false,
};

let globalConfig: RedactionConfig = { ...defaultConfig };
let adminBypassEnabled = false;

/**
 * Configure the global redaction settings
 */
export function configureRedaction(config: Partial<RedactionConfig>): void {
    globalConfig = { ...globalConfig, ...config };
}

/**
 * Toggle admin bypass mode (for debugging purposes)
 * When enabled, redacted data is shown with a visual indicator
 */
export function setAdminBypass(enabled: boolean): void {
    if (!globalConfig.allowAdminBypass) {
        console.warn('Admin bypass is not enabled in redaction config');
        return;
    }
    adminBypassEnabled = enabled;
}

/**
 * Check if admin bypass is currently active
 */
export function isAdminBypassEnabled(): boolean {
    return adminBypassEnabled && globalConfig.allowAdminBypass;
}

/**
 * Get current redaction configuration
 */
export function getRedactionConfig(): RedactionConfig {
    return { ...globalConfig };
}

/**
 * Redact a string based on the current configuration
 *
 * @param val - The string to redact
 * @param options - Optional override for redaction behavior
 * @returns The redacted string, or original if admin bypass is enabled
 */
export function redactString(
    val: string | undefined | null,
    options?: { showFirst?: number; showLast?: number; maskChar?: string }
): string {
    if (!val) {
        return '';
    }

    // Admin bypass mode - show original with indicator
    if (isAdminBypassEnabled()) {
        return `🔓 ${val}`;
    }

    const { showFirst = 1, showLast = 1, maskChar = '*' } = options || {};

    switch (globalConfig.level) {
        case 'strict':
            // Full redaction for short strings, minimal reveal for longer ones
            if (val.length <= 3) {
                return '***';
            }
            return val.substring(0, showFirst) + maskChar.repeat(3) + val.substring(val.length - showLast);

        case 'moderate':
            // Show first 2 and last 2 characters for longer strings
            if (val.length <= 4) {
                return '*'.repeat(val.length);
            }
            return val.substring(0, 2) + '*'.repeat(4) + val.substring(val.length - 2);

        case 'minimal':
            // Only redact if very short
            if (val.length <= 2) {
                return '**';
            }
            return val.substring(0, 3) + '...' + val.substring(val.length - 2);

        default:
            return val;
    }
}

/**
 * Redact an email address
 */
export function redactEmail(email: string | undefined): string {
    if (!email) return '';
    if (isAdminBypassEnabled()) return `🔓 ${email}`;

    const [local, domain] = email.split('@');
    if (!domain) return redactString(email);

    const redactedLocal = local.length <= 2 ? '***' : `${local[0]}***${local[local.length - 1]}`;
    const domainParts = domain.split('.');
    const tld = domainParts.pop();
    const domainName = domainParts.join('.');
    const redactedDomain = domainName.length <= 2 ? '***' : `${domainName[0]}***${domainName[domainName.length - 1]}.${tld || 'com'}`;

    return `${redactedLocal}@${redactedDomain}`;
}

/**
 * Redact a phone number
 */
export function redactPhone(phone: string | undefined): string {
    if (!phone) return '';
    if (isAdminBypassEnabled()) return `🔓 ${phone}`;

    // Keep last 4 digits visible
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length <= 4) return '***';
    return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
}

/**
 * Redact an IP address
 */
export function redactIpAddress(ip: string | undefined): string {
    if (!ip) return '';
    if (isAdminBypassEnabled()) return `🔓 ${ip}`;

    if (ip.includes(':')) {
        // IPv6 - show first and last group
        const parts = ip.split(':');
        return `${parts[0]}:****:****:****:****:****:****:${parts[parts.length - 1]}`;
    }
    // IPv4 - redact middle octets
    const octets = ip.split('.');
    return `${octets[0]}.***.***.${octets[3]}`;
}

/**
 * Redact a UUID
 */
export function redactUuid(uuid: string | undefined): string {
    if (!uuid) return '';
    if (isAdminBypassEnabled()) return `🔓 ${uuid}`;

    // Show first 4 and last 4 characters
    if (uuid.length <= 8) return '***';
    return `${uuid.substring(0, 4)}...${uuid.substring(uuid.length - 4)}`;
}

/**
 * Create a reusable redactor with preset options
 */
export function createRedactor(defaultOptions?: { level?: RedactionLevel }) {
    let config = { level: defaultOptions?.level || globalConfig.level };

    return {
        string: (val: string | undefined) => {
            const originalGlobalLevel = globalConfig.level;
            globalConfig.level = config.level;
            const result = redactString(val);
            globalConfig.level = originalGlobalLevel;
            return result;
        },
        email: (val: string | undefined) => {
            const originalGlobalLevel = globalConfig.level;
            globalConfig.level = config.level;
            const result = redactEmail(val);
            globalConfig.level = originalGlobalLevel;
            return result;
        },
        phone: (val: string | undefined) => {
            const originalGlobalLevel = globalConfig.level;
            globalConfig.level = config.level;
            const result = redactPhone(val);
            globalConfig.level = originalGlobalLevel;
            return result;
        },
        ip: (val: string | undefined) => {
            const originalGlobalLevel = globalConfig.level;
            globalConfig.level = config.level;
            const result = redactIpAddress(val);
            globalConfig.level = originalGlobalLevel;
            return result;
        },
        uuid: (val: string | undefined) => {
            const originalGlobalLevel = globalConfig.level;
            globalConfig.level = config.level;
            const result = redactUuid(val);
            globalConfig.level = originalGlobalLevel;
            return result;
        },
        setLevel: (level: RedactionLevel) => { config.level = level; },
    };
}
