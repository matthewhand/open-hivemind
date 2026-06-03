import crypto from 'crypto';

/**
 * Self-contained TOTP (RFC 6238) implementation built on Node's `crypto`.
 *
 * This avoids adding a third-party dependency while remaining fully
 * interoperable with standard authenticator apps (Google Authenticator,
 * Authy, 1Password, etc.) which implement RFC 6238 with the default
 * parameters: SHA-1, 6 digits, 30-second period.
 *
 * Secrets are stored/transported as Base32 (RFC 4648, no padding) which is
 * what the `otpauth://` URI scheme expects.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export interface TotpOptions {
  /** Number of digits in the generated code. Default 6. */
  digits?: number;
  /** Time step in seconds. Default 30. */
  period?: number;
  /**
   * Number of time steps before/after the current one to accept. Default 1,
   * which tolerates minor clock drift between server and authenticator app.
   */
  window?: number;
}

const DEFAULT_DIGITS = 6;
const DEFAULT_PERIOD = 30;
const DEFAULT_WINDOW = 1;

/**
 * Encode a buffer as RFC 4648 Base32 (no padding, uppercase).
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decode an RFC 4648 Base32 string (padding and casing tolerant) to a Buffer.
 */
export function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/=+$/, '').replace(/\s+/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) {
      throw new Error('Invalid base32 character in TOTP secret');
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generate a new random Base32-encoded TOTP secret.
 *
 * @param byteLength Number of random bytes (entropy). 20 bytes (160 bits) is
 *   the RFC 4226 recommended HMAC-SHA1 key size and what most apps expect.
 */
export function generateSecret(byteLength = 20): string {
  return base32Encode(crypto.randomBytes(byteLength));
}

/**
 * Compute the TOTP code for a given secret at a specific counter value.
 */
function hotp(secret: Buffer, counter: number, digits: number): string {
  // 8-byte big-endian counter buffer. The counter can exceed 32 bits, so we
  // split it into high/low 32-bit halves using arithmetic (not bitwise, which
  // would truncate to 32 bits) to stay correct without BigInt.
  const buf = Buffer.alloc(8);
  const high = Math.floor(counter / 0x100000000);
  const low = counter % 0x100000000;
  buf.writeUInt32BE(high >>> 0, 0);
  buf.writeUInt32BE(low >>> 0, 4);

  const hmac = crypto.createHmac('sha1', secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 10 ** digits;
  return otp.toString().padStart(digits, '0');
}

/**
 * Generate the current TOTP code for a Base32 secret.
 */
export function generateToken(base32Secret: string, options: TotpOptions = {}): string {
  const digits = options.digits ?? DEFAULT_DIGITS;
  const period = options.period ?? DEFAULT_PERIOD;
  const counter = Math.floor(Date.now() / 1000 / period);
  return hotp(base32Decode(base32Secret), counter, digits);
}

/**
 * Verify a user-supplied TOTP token against a Base32 secret.
 *
 * Accepts codes within +/- `window` time steps to tolerate clock drift.
 * Comparison is constant-time to avoid timing side channels.
 */
export function verifyToken(
  token: string,
  base32Secret: string,
  options: TotpOptions = {}
): boolean {
  if (!token || !base32Secret) return false;

  const digits = options.digits ?? DEFAULT_DIGITS;
  const period = options.period ?? DEFAULT_PERIOD;
  const window = options.window ?? DEFAULT_WINDOW;

  const normalized = token.replace(/\s+/g, '');
  if (!/^\d+$/.test(normalized) || normalized.length !== digits) {
    return false;
  }

  let secretBuf: Buffer;
  try {
    secretBuf = base32Decode(base32Secret);
  } catch {
    return false;
  }

  const counter = Math.floor(Date.now() / 1000 / period);
  const candidate = Buffer.from(normalized);

  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const expected = hotp(secretBuf, counter + errorWindow, digits);
    const expectedBuf = Buffer.from(expected);
    if (expectedBuf.length === candidate.length && crypto.timingSafeEqual(expectedBuf, candidate)) {
      return true;
    }
  }

  return false;
}

/**
 * Build an `otpauth://totp/...` URI for QR-code enrollment in authenticator apps.
 *
 * @param secret Base32-encoded secret.
 * @param accountName Identifies the account (e.g. username or email).
 * @param issuer Human-readable service name shown in the authenticator app.
 */
export function buildOtpAuthUri(
  secret: string,
  accountName: string,
  issuer = 'Open-Hivemind',
  options: TotpOptions = {}
): string {
  const digits = options.digits ?? DEFAULT_DIGITS;
  const period = options.period ?? DEFAULT_PERIOD;
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(digits),
    period: String(period),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
