import { describe, it, expect, beforeEach } from 'vitest';
import { ContentFilterService } from '@src/services/ContentFilterService';
import type { ContentFilterConfig } from '@src/types/config';

describe('ContentFilterService', () => {
  let service: ContentFilterService;

  beforeEach(() => {
    service = ContentFilterService.getInstance();
  });

  describe('checkContent', () => {
    it('should allow content when filter is disabled', () => {
      const config: ContentFilterConfig = {
        enabled: false,
        strictness: 'low',
        blockedTerms: ['badword'],
      };

      const result = service.checkContent('This contains badword', config);
      expect(result.allowed).toBe(true);
    });

    it('should allow content when no blocked terms are defined', () => {
      const config: ContentFilterConfig = {
        enabled: true,
        strictness: 'low',
        blockedTerms: [],
      };

      const result = service.checkContent('Any content here', config);
      expect(result.allowed).toBe(true);
    });

    it('should always allow system messages', () => {
      const config: ContentFilterConfig = {
        enabled: true,
        strictness: 'high',
        blockedTerms: ['badword', 'prohibited'],
      };

      const result = service.checkContent('This contains badword and prohibited', config, 'system');
      expect(result.allowed).toBe(true);
    });

    describe('low strictness (whole word matching)', () => {
      const config: ContentFilterConfig = {
        enabled: true,
        strictness: 'low',
        blockedTerms: ['spam', 'badword'],
      };

      it('should block exact word matches', () => {
        const result = service.checkContent('This is spam content', config);
        expect(result.allowed).toBe(false);
        expect(result.matchedTerms).toContain('spam');
      });

      it('should block case-insensitive matches', () => {
        const result = service.checkContent('This is SPAM content', config);
        expect(result.allowed).toBe(false);
        expect(result.matchedTerms).toContain('spam');
      });

      it('should not block partial word matches', () => {
        const result = service.checkContent('This is spammy content', config);
        expect(result.allowed).toBe(true);
      });

      it('should block words with punctuation boundaries', () => {
        const result = service.checkContent('No spam!', config);
        expect(result.allowed).toBe(false);
      });

      it('should allow content without blocked terms', () => {
        const result = service.checkContent('This is good content', config);
        expect(result.allowed).toBe(true);
      });
    });

    describe('medium strictness (substring matching)', () => {
      const config: ContentFilterConfig = {
        enabled: true,
        strictness: 'medium',
        blockedTerms: ['spam', 'bad'],
      };

      it('should block exact matches', () => {
        const result = service.checkContent('This is spam', config);
        expect(result.allowed).toBe(false);
      });

      it('should block substring matches', () => {
        const result = service.checkContent('This is spammy', config);
        expect(result.allowed).toBe(false);
        expect(result.matchedTerms).toContain('spam');
      });

      it('should block multiple terms', () => {
        const result = service.checkContent('This is bad spam', config);
        expect(result.allowed).toBe(false);
        expect(result.matchedTerms).toContain('spam');
        expect(result.matchedTerms).toContain('bad');
      });

      it('should be case-insensitive', () => {
        const result = service.checkContent('This is SPAM', config);
        expect(result.allowed).toBe(false);
      });
    });

    describe('high strictness (pattern matching with obfuscation detection)', () => {
      const config: ContentFilterConfig = {
        enabled: true,
        strictness: 'high',
        blockedTerms: ['spam', 'badword'],
      };

      it('should block exact matches', () => {
        const result = service.checkContent('This is spam', config);
        expect(result.allowed).toBe(false);
      });

      it('should block substring matches', () => {
        const result = service.checkContent('spamming', config);
        expect(result.allowed).toBe(false);
      });

      it('should detect leetspeak obfuscation', () => {
        const result = service.checkContent('This is sp4m', config);
        expect(result.allowed).toBe(false);
      });

      it('should detect common symbol substitutions', () => {
        const result = service.checkContent('This is $pam', config);
        expect(result.allowed).toBe(false);
      });

      it('should detect character spacing obfuscation', () => {
        const result = service.checkContent('This is s p a m', config);
        expect(result.allowed).toBe(false);
      });

      it('should handle multiple obfuscation patterns', () => {
        const result = service.checkContent('b4dw0rd', config);
        expect(result.allowed).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle empty content', () => {
        const config: ContentFilterConfig = {
          enabled: true,
          strictness: 'low',
          blockedTerms: ['spam'],
        };

        const result = service.checkContent('', config);
        expect(result.allowed).toBe(true);
      });

      it('should handle empty blocked terms array', () => {
        const config: ContentFilterConfig = {
          enabled: true,
          strictness: 'low',
          blockedTerms: [],
        };

        const result = service.checkContent('Any content', config);
        expect(result.allowed).toBe(true);
      });

      it('should handle null/undefined terms in array', () => {
        const config: ContentFilterConfig = {
          enabled: true,
          strictness: 'low',
          blockedTerms: ['spam', null as any, undefined as any, '', 'badword'],
        };

        const result = service.checkContent('This is spam', config);
        expect(result.allowed).toBe(false);
        expect(result.matchedTerms).toContain('spam');
      });

      it('should handle multiline content', () => {
        const config: ContentFilterConfig = {
          enabled: true,
          strictness: 'medium',
          blockedTerms: ['spam'],
        };

        const result = service.checkContent('Line 1\nThis is spam\nLine 3', config);
        expect(result.allowed).toBe(false);
      });

      it('should handle special regex characters in blocked terms', () => {
        const config: ContentFilterConfig = {
          enabled: true,
          strictness: 'low',
          blockedTerms: ['test.com', 'price$', '[ads]'],
        };

        const result1 = service.checkContent('Visit test.com today', config);
        expect(result1.allowed).toBe(false);

        const result2 = service.checkContent('Only price$ 99', config);
        expect(result2.allowed).toBe(false);

        const result3 = service.checkContent('No [ads] here', config);
        expect(result3.allowed).toBe(false);
      });
    });

    describe('default strictness', () => {
      it('should default to low strictness when not specified', () => {
        const config: ContentFilterConfig = {
          enabled: true,
          blockedTerms: ['spam'],
        };

        const result1 = service.checkContent('This is spam', config);
        expect(result1.allowed).toBe(false);

        const result2 = service.checkContent('This is spammy', config);
        expect(result2.allowed).toBe(true); // Should not match substring with low strictness
      });
    });
  });

  describe('filterContentForDisplay', () => {
    it('should not filter when disabled', () => {
      const config: ContentFilterConfig = {
        enabled: false,
        strictness: 'low',
        blockedTerms: ['spam'],
      };

      const result = service.filterContentForDisplay('This is spam content', config);
      expect(result).toBe('This is spam content');
    });

    it('should redact blocked terms with low strictness', () => {
      const config: ContentFilterConfig = {
        enabled: true,
        strictness: 'low',
        blockedTerms: ['spam', 'badword'],
      };

      const result = service.filterContentForDisplay('This is spam and badword content', config);
      expect(result).toBe('This is [FILTERED] and [FILTERED] content');
    });

    it('should redact substrings with medium strictness', () => {
      const config: ContentFilterConfig = {
        enabled: true,
        strictness: 'medium',
        blockedTerms: ['spam'],
      };

      const result = service.filterContentForDisplay('This is spammy content', config);
      expect(result).toBe('This is [FILTERED]my content');
    });

    it('should be case-insensitive', () => {
      const config: ContentFilterConfig = {
        enabled: true,
        strictness: 'low',
        blockedTerms: ['spam'],
      };

      const result = service.filterContentForDisplay('This is SPAM content', config);
      expect(result).toBe('This is [FILTERED] content');
    });

    it('should handle multiple occurrences', () => {
      const config: ContentFilterConfig = {
        enabled: true,
        strictness: 'low',
        blockedTerms: ['spam'],
      };

      const result = service.filterContentForDisplay('spam spam spam', config);
      expect(result).toBe('[FILTERED] [FILTERED] [FILTERED]');
    });

    it('should handle empty content', () => {
      const config: ContentFilterConfig = {
        enabled: true,
        strictness: 'low',
        blockedTerms: ['spam'],
      };

      const result = service.filterContentForDisplay('', config);
      expect(result).toBe('');
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ContentFilterService.getInstance();
      const instance2 = ContentFilterService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });
});
