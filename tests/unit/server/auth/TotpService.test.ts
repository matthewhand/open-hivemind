import {
  base32Decode,
  base32Encode,
  buildOtpAuthUri,
  generateSecret,
  generateToken,
  verifyToken,
} from '../../../../src/auth/TotpService';

describe('TotpService', () => {
  describe('base32 round-trip', () => {
    it('encodes and decodes arbitrary buffers losslessly', () => {
      const samples = [
        Buffer.from([]),
        Buffer.from([0x00]),
        Buffer.from('hello world'),
        Buffer.from([0xde, 0xad, 0xbe, 0xef, 0x01, 0x02, 0x03]),
      ];
      for (const buf of samples) {
        const encoded = base32Encode(buf);
        expect(/^[A-Z2-7]*$/.test(encoded)).toBe(true);
        expect(base32Decode(encoded).equals(buf)).toBe(true);
      }
    });

    it('matches a known RFC 4648 vector', () => {
      // "foobar" -> MZXW6YTBOI per RFC 4648 (no padding).
      expect(base32Encode(Buffer.from('foobar'))).toBe('MZXW6YTBOI');
      expect(base32Decode('MZXW6YTBOI').toString()).toBe('foobar');
    });

    it('decodes padding- and whitespace-tolerantly', () => {
      expect(base32Decode('mzxw6ytboi').toString()).toBe('foobar');
      expect(base32Decode('MZXW 6YTB OI').toString()).toBe('foobar');
    });

    it('throws on invalid base32 input', () => {
      expect(() => base32Decode('!!!!')).toThrow();
    });
  });

  describe('generateSecret', () => {
    it('produces distinct base32 secrets of expected length', () => {
      const a = generateSecret();
      const b = generateSecret();
      expect(a).not.toBe(b);
      expect(/^[A-Z2-7]+$/.test(a)).toBe(true);
      // 20 bytes -> 32 base32 chars
      expect(a.length).toBe(32);
    });
  });

  describe('RFC 6238 known vectors (SHA-1)', () => {
    // RFC 6238 Appendix B test secret is the ASCII string "12345678901234567890".
    const seed = Buffer.from('12345678901234567890');
    const base32Seed = base32Encode(seed);

    const cases: Array<{ time: number; otp: string }> = [
      { time: 59, otp: '287082' },
      { time: 1111111109, otp: '081804' },
      { time: 1234567890, otp: '005924' },
      { time: 2000000000, otp: '279037' },
    ];

    it.each(cases)('generates $otp at unix time $time', ({ time, otp }) => {
      const spy = jest.spyOn(Date, 'now').mockReturnValue(time * 1000);
      try {
        expect(generateToken(base32Seed)).toBe(otp);
        expect(verifyToken(otp, base32Seed)).toBe(true);
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('verifyToken', () => {
    const secret = generateSecret();

    it('accepts the current code', () => {
      expect(verifyToken(generateToken(secret), secret)).toBe(true);
    });

    it('rejects an incorrect code', () => {
      const current = generateToken(secret);
      const wrong = current === '000000' ? '111111' : '000000';
      expect(verifyToken(wrong, secret)).toBe(false);
    });

    it('rejects empty / malformed input', () => {
      expect(verifyToken('', secret)).toBe(false);
      expect(verifyToken('abc', secret)).toBe(false);
      expect(verifyToken('1234567', secret)).toBe(false); // wrong length
      expect(verifyToken(generateToken(secret), '')).toBe(false);
    });

    it('tolerates whitespace around the code', () => {
      const code = generateToken(secret);
      expect(verifyToken(` ${code} `, secret)).toBe(true);
    });

    it('accepts a code from the previous time step (clock drift window)', () => {
      const base = 1234567890;
      const spy = jest.spyOn(Date, 'now');
      try {
        spy.mockReturnValue(base * 1000);
        const prevCode = generateToken(secret);
        // Advance ~30s into the next step; previous code still accepted (window=1).
        spy.mockReturnValue((base + 30) * 1000);
        expect(verifyToken(prevCode, secret)).toBe(true);
        // But not two steps away.
        spy.mockReturnValue((base + 90) * 1000);
        expect(verifyToken(prevCode, secret)).toBe(false);
      } finally {
        spy.mockRestore();
      }
    });

    it('returns false for an undecodable secret rather than throwing', () => {
      expect(verifyToken('123456', '!!invalid!!')).toBe(false);
    });
  });

  describe('buildOtpAuthUri', () => {
    it('produces a valid otpauth URI with issuer and account', () => {
      const uri = buildOtpAuthUri('JBSWY3DPEHPK3PXP', 'alice@example.com', 'Open-Hivemind');
      expect(uri.startsWith('otpauth://totp/')).toBe(true);
      expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
      expect(uri).toContain('issuer=Open-Hivemind');
      expect(uri).toContain('algorithm=SHA1');
      expect(uri).toContain('digits=6');
      expect(uri).toContain('period=30');
      // Account name is URL-encoded in the label.
      expect(uri).toContain('alice%40example.com');
    });
  });
});
