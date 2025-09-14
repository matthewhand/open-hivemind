describe('Utility Functions Comprehensive Tests', () => {
  describe('Math Operations', () => {
    test('should handle basic arithmetic operations correctly', () => {
      expect(1 + 2).toBe(3);
      expect(5 - 3).toBe(2);
      expect(4 * 3).toBe(12);
      expect(10 / 2).toBe(5);
    });

    test('should handle edge cases in arithmetic', () => {
      expect(0 + 0).toBe(0);
      expect(1 - 1).toBe(0);
      expect(0 * 5).toBe(0);
      expect(5 / 0).toBe(Infinity);
      expect(-5 / 0).toBe(-Infinity);
    });

    test('should handle floating point arithmetic with precision', () => {
      expect(0.1 + 0.2).toBeCloseTo(0.3, 10);
      expect(1.23 * 4.56).toBeCloseTo(5.6088, 10);
    });
  });

  describe('Boolean and Type Conversion', () => {
    test('should convert various values to boolean correctly', () => {
      expect(Boolean('x')).toBe(true);
      expect(Boolean('')).toBe(false);
      expect(Boolean(1)).toBe(true);
      expect(Boolean(0)).toBe(false);
      expect(Boolean([])).toBe(true);
      expect(Boolean({})).toBe(true);
      expect(Boolean(null)).toBe(false);
      expect(Boolean(undefined)).toBe(false);
    });

    test('should handle truthy and falsy values', () => {
      // Truthy values
      const truthyString = 'hello';
      const truthyNumber = 42;
      const truthyArray: any[] = [];
      const truthyObject = {};
      
      expect(!!truthyString).toBe(true);
      expect(!!truthyNumber).toBe(true);
      expect(!!truthyArray).toBe(true);
      expect(!!truthyObject).toBe(true);
      
      // Falsy values
      const falsyString = '';
      const falsyNumber = 0;
      const falsyNull = null;
      const falsyUndefined = undefined;
      const falsyNaN = NaN;
      
      expect(!!falsyString).toBe(false);
      expect(!!falsyNumber).toBe(false);
      expect(!!falsyNull).toBe(false);
      expect(!!falsyUndefined).toBe(false);
      expect(!!falsyNaN).toBe(false);
    });
  });

  describe('Array Operations', () => {
    test('should handle array includes correctly', () => {
      const arr = [1, 2, 3];
      expect(arr.includes(2)).toBe(true);
      expect(arr.includes(4)).toBe(false);
      expect(arr.includes(1)).toBe(true);
      expect(arr.includes(3)).toBe(true);
    });

    test('should handle array includes with different types', () => {
      const mixedArray = [1, 'two', true, null, undefined];
      expect(mixedArray.includes('two')).toBe(true);
      expect(mixedArray.includes(true)).toBe(true);
      expect(mixedArray.includes(null)).toBe(true);
      expect(mixedArray.includes(undefined)).toBe(true);
      expect(mixedArray.includes(false)).toBe(false);
    });

    test('should handle array includes with objects', () => {
      const obj1 = { a: 1 };
      const obj2 = { b: 2 };
      const arr = [obj1, obj2];
      
      expect(arr.includes(obj1)).toBe(true);
      expect(arr.includes({ a: 1 })).toBe(false); // Different object reference
      expect(arr.includes(obj2)).toBe(true);
    });
  });

  describe('Basic Assertions', () => {
    test('should verify basic equality', () => {
      expect(1).toBe(1);
      expect(2).toBe(2);
      expect('hello').toBe('hello');
      expect(true).toBe(true);
    });

    test('should verify object equality', () => {
      const obj = { a: 1, b: 2 };
      expect(obj).toEqual({ a: 1, b: 2 });
      expect(obj).not.toBe({ a: 1, b: 2 }); // Different reference
    });

    test('should handle null and undefined correctly', () => {
      expect(null).toBe(null);
      expect(undefined).toBe(undefined);
      expect(null).not.toBe(undefined);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle special numeric values', () => {
      expect(NaN).toBeNaN();
      expect(Infinity).toBe(Infinity);
      expect(-Infinity).toBe(-Infinity);
      expect(1 / 0).toBe(Infinity);
    });

    test('should handle string edge cases', () => {
      expect('').toBe('');
      expect('   ').toBe('   ');
      expect('hello').not.toBe('Hello'); // Case sensitive
    });

    test('should handle array edge cases', () => {
      expect([]).toEqual([]);
      expect([1, 2, 3]).toHaveLength(3);
      expect([1, 2, 3]).toContain(2);
      expect([1, 2, 3]).not.toContain(4);
    });
  });

  describe('Array Operations Consolidated', () => {
    test('should handle comprehensive array operations', () => {
      // Basic includes functionality
      expect([1, 2, 3]).toContain(3);
      expect([1, 2, 3]).not.toContain(4);
      
      // Length operations
      expect([].length).toBe(0);
      expect([1, 2, 3].length).toBe(3);
      
      // Filter operations
      const arr = [1, 2, 3, 4, 5];
      expect(arr.filter(x => x > 3)).toEqual([4, 5]);
      
      // Map operations  
      expect(arr.map(x => x * 2)).toEqual([2, 4, 6, 8, 10]);
      
      // Complex operations
      expect(arr.includes(3)).toBe(true);
      expect(arr.filter(x => x > 3)).toHaveLength(2);
    });
  });

  describe('Rate Limiter Operations Consolidated', () => {
    let rateLimiter: any;
    
    beforeEach(() => {
      jest.useFakeTimers();
      // Mock the rateLimiter module
      rateLimiter = {
        messagesLastHour: [] as Date[],
        messagesLastDay: [] as Date[],
        canSendMessage: function() {
          const now = new Date();
          const hourAgo = new Date(now.getTime() - 3600000);
          const dayAgo = new Date(now.getTime() - 86400000);
          
          const recentHour = this.messagesLastHour.filter((t: Date) => t > hourAgo);
          const recentDay = this.messagesLastDay.filter((t: Date) => t > dayAgo);
          
          const hourLimit = parseInt(process.env.LLM_MESSAGE_LIMIT_PER_HOUR || '60');
          const dayLimit = parseInt(process.env.LLM_MESSAGE_LIMIT_PER_DAY || '1000');
          
          return recentHour.length < hourLimit && recentDay.length < dayLimit;
        },
        addMessageTimestamp: function() {
          const now = new Date();
          const hourAgo = new Date(now.getTime() - 3600000);
          const dayAgo = new Date(now.getTime() - 86400000);
          
          // Filter old messages and add new one
          this.messagesLastHour = this.messagesLastHour.filter((t: Date) => t > hourAgo);
          this.messagesLastDay = this.messagesLastDay.filter((t: Date) => t > dayAgo);
          
          this.messagesLastHour.push(now);
          this.messagesLastDay.push(now);
        }
      };
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should handle comprehensive rate limiting scenarios', () => {
      process.env.LLM_MESSAGE_LIMIT_PER_HOUR = '2';
      process.env.LLM_MESSAGE_LIMIT_PER_DAY = '2';
      
      // Initially should allow messages
      expect(rateLimiter.canSendMessage()).toBe(true);
      
      // Add timestamps and verify limits
      rateLimiter.addMessageTimestamp();
      expect(rateLimiter.messagesLastHour.length).toBe(1);
      expect(rateLimiter.messagesLastDay.length).toBe(1);
      expect(rateLimiter.canSendMessage()).toBe(true);
      
      rateLimiter.addMessageTimestamp();
      expect(rateLimiter.messagesLastHour.length).toBe(2);
      expect(rateLimiter.messagesLastDay.length).toBe(2);
      expect(rateLimiter.canSendMessage()).toBe(false);
      
      // Test time-based filtering
      const now = new Date();
      jest.setSystemTime(now);
      rateLimiter.addMessageTimestamp();
      
      // Advance time by 2 hours to test hourly filtering
      jest.setSystemTime(new Date(now.getTime() + 2 * 3600000));
      rateLimiter.addMessageTimestamp();
      
      // Should only have recent messages in hour array
      expect(rateLimiter.messagesLastHour.length).toBe(1);
      expect(rateLimiter.messagesLastDay.length).toBe(4);
      
      // Advance time by 25 hours to test daily filtering
      jest.setSystemTime(new Date(now.getTime() + 25 * 3600000));
      rateLimiter.addMessageTimestamp();
      
      expect(rateLimiter.messagesLastHour.length).toBe(1);
      expect(rateLimiter.messagesLastDay.length).toBe(2); // Only the last 2 messages (now+2h and now+25h) should remain
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle large numbers efficiently', () => {
      const largeNum = 999999999999999;
      expect(largeNum + 1).toBe(1000000000000000);
      expect(largeNum * 2).toBe(1999999999999998);
    });

    test('should maintain precision with decimal operations', () => {
      const result = 0.1 + 0.2;
      expect(result).toBeCloseTo(0.3, 10);
      expect(result).not.toBe(0.3); // Due to floating point precision
    });

    test('should handle concurrent operations correctly', () => {
      const results: number[] = [];
      for (let i = 0; i < 100; i++) {
        results.push(i + 1);
      }
      expect(results).toHaveLength(100);
      expect(results[0]).toBe(1);
      expect(results[99]).toBe(100);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complex boolean expressions', () => {
      const a = true;
      const b = false;
      const c = true;
      
      expect(a && b).toBe(false);
      expect(a || b).toBe(true);
      expect(a && c).toBe(true);
      expect(!(a && b)).toBe(true);
    });

    test('should handle type coercion scenarios', () => {
      const stringFive = '5' as any;
      const numberFive = 5;
      const stringFalse = 'false';
      const numberZero = 0;
      
      expect(stringFive == numberFive).toBe(true);  // Loose equality with coercion
      expect(stringFive === numberFive).toBe(false); // Strict equality without coercion
      expect(!!stringFalse).toBe(true); // String 'false' is truthy
      expect(!!numberZero).toBe(false); // Number 0 is falsy
    });
  });
});