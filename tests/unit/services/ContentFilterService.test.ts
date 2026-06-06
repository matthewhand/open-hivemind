import { ContentFilterService, getContentFilterService } from '@src/services/ContentFilterService';
import type { ContentFilterConfig } from '@src/types/config';

describe('ContentFilterService', () => {
  describe('Singleton Pattern', () => {
    it('getInstance() should return the same instance', () => {
      const instance1 = ContentFilterService.getInstance();
      const instance2 = ContentFilterService.getInstance();

      expect(instance1).toBeDefined();
      expect(instance1).toBe(instance2);
    });

    it('getContentFilterService() should return the same instance', () => {
      const instance1 = getContentFilterService();
      const instance2 = ContentFilterService.getInstance();

      expect(instance1).toBeDefined();
      expect(instance1).toBe(instance2);
    });
  });

  describe('checkContent()', () => {
    let filterService: ContentFilterService;

    beforeEach(() => {
      filterService = getContentFilterService();
    });

    describe('Bypass Rules', () => {
      it('should allow content if role is "system"', () => {
        const config: ContentFilterConfig = {
          enabled: true,
          blockedTerms: ['badword'],
        };
        const result = filterService.checkContent('This contains a badword', config, 'system');

        expect(result.allowed).toBe(true);
        expect(result.reason).toBeUndefined();
        expect(result.matchedTerms).toBeUndefined();
      });

      it('should allow content if filter is disabled', () => {
        const config: ContentFilterConfig = {
          enabled: false,
          blockedTerms: ['badword'],
        };
        const result = filterService.checkContent('This contains a badword', config);

        expect(result.allowed).toBe(true);
      });

      it('should allow content if blockedTerms is undefined', () => {
        const config: ContentFilterConfig = {
          enabled: true,
          blockedTerms: undefined,
        };
        const result = filterService.checkContent('Some text', config);

        expect(result.allowed).toBe(true);
      });

      it('should allow content if blockedTerms is empty', () => {
        const config: ContentFilterConfig = {
          enabled: true,
          blockedTerms: [],
        };
        const result = filterService.checkContent('Some text', config);

        expect(result.allowed).toBe(true);
      });
    });

    describe('Strictness: Low (Whole Word Match)', () => {
      it('should block exact whole word matches', () => {
        const config: ContentFilterConfig = {
          enabled: true,
          strictness: 'low',
          blockedTerms: ['badword'],
        };

        const result = filterService.checkContent('This is a badword here', config);

        expect(result.allowed).toBe(false);
        expect(result.matchedTerms).toEqual(['badword']);
        expect(result.reason).toContain('contains prohibited term');
      });

      it('should block whole word matches case-insensitively', () => {
        const config: ContentFilterConfig = {
          enabled: true,
          strictness: 'low',
          blockedTerms: ['BadWord'],
        };

        const result = filterService.checkContent('This is a BADWORD here', config);

        expect(result.allowed).toBe(false);
        expect(result.matchedTerms).toEqual(['BadWord']);
      });

      it('should not block partial/substring matches', () => {
        const config: ContentFilterConfig = {
          enabled: true,
          strictness: 'low',
          blockedTerms: ['bad'],
        };

        const result = filterService.checkContent('This is a badge', config);

        expect(result.allowed).toBe(true);
      });
    });

    describe('Strictness: Medium (Substring Match)', () => {
      it('should block whole word matches', () => {
        const config: ContentFilterConfig = {
          enabled: true,
          strictness: 'medium',
          blockedTerms: ['badword'],
        };

        const result = filterService.checkContent('This is a badword here', config);

        expect(result.allowed).toBe(false);
        expect(result.matchedTerms).toEqual(['badword']);
      });

      it('should block substring matches case-insensitively', () => {
        const config: ContentFilterConfig = {
          enabled: true,
          strictness: 'medium',
          blockedTerms: ['bad'],
        };

        const result = filterService.checkContent('This is a BADge', config);

        expect(result.allowed).toBe(false);
        expect(result.matchedTerms).toEqual(['bad']);
      });
    });

    describe('Strictness: High (Pattern and Deobfuscation Match)', () => {
      it('should block normal substring matches', () => {
        const config: ContentFilterConfig = {
          enabled: true,
          strictness: 'high',
          blockedTerms: ['bad'],
        };

        const result = filterService.checkContent('This is a badge', config);

        expect(result.allowed).toBe(false);
        expect(result.matchedTerms).toEqual(['bad']);
      });

      it('should block obfuscated terms (leetspeak)', () => {
        const config: ContentFilterConfig = {
          enabled: true,
          strictness: 'high',
          blockedTerms: ['badword'],
        };

        // b@dw0rd -> badword
        const result = filterService.checkContent('This is a b@dw0rd', config);

        expect(result.allowed).toBe(false);
        expect(result.matchedTerms).toEqual(['badword']);
      });

      it('should block terms with special characters and spaces mixed in', () => {
        const config: ContentFilterConfig = {
          enabled: true,
          strictness: 'high',
          blockedTerms: ['badword'],
        };

        // b a d_w * o r d -> badword
        const result = filterService.checkContent('This is a b a d_w * o r d', config);

        expect(result.allowed).toBe(false);
        expect(result.matchedTerms).toEqual(['badword']);
      });

      it('should correctly handle multiple blocked terms', () => {
        const config: ContentFilterConfig = {
          enabled: true,
          strictness: 'high',
          blockedTerms: ['badword', 'awful'],
        };

        const result = filterService.checkContent('This is b@dw0rd and @wfUl', config);

        expect(result.allowed).toBe(false);
        expect(result.matchedTerms).toEqual(['badword', 'awful']);
      });
    });
  });

  describe('filterContentForDisplay()', () => {
    let filterService: ContentFilterService;

    beforeEach(() => {
      filterService = getContentFilterService();
    });

    it('should return original content if filter is disabled', () => {
      const config: ContentFilterConfig = {
        enabled: false,
        blockedTerms: ['badword'],
      };
      const result = filterService.filterContentForDisplay('This is a badword', config);
      expect(result).toBe('This is a badword');
    });

    it('should return original content if blockedTerms is empty', () => {
      const config: ContentFilterConfig = {
        enabled: true,
        blockedTerms: [],
      };
      const result = filterService.filterContentForDisplay('This is a badword', config);
      expect(result).toBe('This is a badword');
    });

    it('should redact whole words with low strictness', () => {
      const config: ContentFilterConfig = {
        enabled: true,
        strictness: 'low',
        blockedTerms: ['badword'],
      };
      const result = filterService.filterContentForDisplay('This is a badword and another BaDwOrD', config);
      expect(result).toBe('This is a [FILTERED] and another [FILTERED]');
    });

    it('should not redact partial words with low strictness', () => {
      const config: ContentFilterConfig = {
        enabled: true,
        strictness: 'low',
        blockedTerms: ['bad'],
      };
      const result = filterService.filterContentForDisplay('This is a badge', config);
      expect(result).toBe('This is a badge');
    });

    it('should redact substrings with medium/high strictness', () => {
      const config: ContentFilterConfig = {
        enabled: true,
        strictness: 'medium',
        blockedTerms: ['bad'],
      };
      const result = filterService.filterContentForDisplay('This is a badge', config);
      expect(result).toBe('This is a [FILTERED]ge');
    });

    it('should handle undefined terms in blockedTerms gracefully', () => {
      const config: ContentFilterConfig = {
        enabled: true,
        strictness: 'low',
        // @ts-ignore - intentional bad data
        blockedTerms: ['badword', null, undefined, ''],
      };
      const result = filterService.filterContentForDisplay('This is a badword', config);
      expect(result).toBe('This is a [FILTERED]');
    });
  });
});
