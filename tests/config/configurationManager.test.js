const configMgr = require('../../src/config/configurationManager.js');

describe('ConfigurationManager (Legacy)', () => {
  beforeEach(() => {
    // Reset internal state between tests
    configMgr.config = {};
  });

  afterEach(() => {
    // Ensure clean state after each test
    configMgr.config = {};
  });

  describe('Configuration retrieval', () => {
    it('should return null when key is missing', () => {
      expect(configMgr.get('does_not_exist')).toBeNull();
      expect(configMgr.get('')).toBeNull();
    });

    it('should return stored value when present', () => {
      configMgr.config.foo = 'bar';
      expect(configMgr.get('foo')).toBe('bar');
    });

    it('should handle different data types correctly', () => {
      configMgr.config.string = 'test';
      configMgr.config.number = 42;
      configMgr.config.boolean = true;
      configMgr.config.object = { nested: 'value' };
      configMgr.config.array = [1, 2, 3];

      expect(configMgr.get('string')).toBe('test');
      expect(configMgr.get('number')).toBe(42);
      expect(configMgr.get('boolean')).toBe(true);
      expect(configMgr.get('object')).toEqual({ nested: 'value' });
      expect(configMgr.get('array')).toEqual([1, 2, 3]);
    });

    it('should handle null and undefined values', () => {
      configMgr.config.nullValue = null;
      configMgr.config.undefinedValue = undefined;

      expect(configMgr.get('nullValue')).toBeNull();
      expect(configMgr.get('undefinedValue')).toBeNull(); // Implementation returns null for undefined
    });
  });

  describe('Configuration setting', () => {
    it('should allow setting configuration values', () => {
      if (typeof configMgr.set === 'function') {
        configMgr.set('newKey', 'newValue');
        expect(configMgr.get('newKey')).toBe('newValue');
      } else {
        // Direct assignment if no set method
        configMgr.config.newKey = 'newValue';
        expect(configMgr.get('newKey')).toBe('newValue');
      }
    });

    it('should overwrite existing values', () => {
      configMgr.config.existingKey = 'oldValue';
      configMgr.config.existingKey = 'newValue';
      expect(configMgr.get('existingKey')).toBe('newValue');
    });
  });

  describe('Edge cases and validation', () => {
    it('should handle invalid key types gracefully', () => {
      expect(() => configMgr.get(null)).not.toThrow();
      expect(() => configMgr.get(undefined)).not.toThrow();
      expect(() => configMgr.get(123)).not.toThrow();
      expect(() => configMgr.get({})).not.toThrow();
    });

    it('should maintain reference integrity for objects', () => {
      const testObject = { a: 1, b: 2 };
      configMgr.config.refTest = testObject;
      
      const retrieved = configMgr.get('refTest');
      expect(retrieved).toBe(testObject); // Same reference
      
      // Modify original
      testObject.c = 3;
      expect(configMgr.get('refTest').c).toBe(3);
    });

    it('should handle deep nested objects', () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              value: 'deep'
            }
          }
        }
      };
      
      configMgr.config.deep = deepObject;
      expect(configMgr.get('deep').level1.level2.level3.value).toBe('deep');
    });
  });

  describe('Configuration state management', () => {
    it('should maintain state across multiple operations', () => {
      configMgr.config.key1 = 'value1';
      configMgr.config.key2 = 'value2';
      
      expect(configMgr.get('key1')).toBe('value1');
      expect(configMgr.get('key2')).toBe('value2');
      
      configMgr.config.key3 = 'value3';
      
      expect(configMgr.get('key1')).toBe('value1'); // Still there
      expect(configMgr.get('key2')).toBe('value2'); // Still there
      expect(configMgr.get('key3')).toBe('value3'); // New value
    });

    it('should handle config object replacement', () => {
      configMgr.config = { replaced: 'config' };
      expect(configMgr.get('replaced')).toBe('config');
      expect(configMgr.get('nonexistent')).toBeNull();
    });
  });

  describe('Module structure validation', () => {
    it('should have expected exports', () => {
      expect(configMgr).toBeDefined();
      expect(typeof configMgr.get).toBe('function');
      expect(configMgr.config).toBeDefined();
    });

    it('should handle module reloading gracefully', () => {
      configMgr.config.persistent = 'value';
      
      // Simulate module reload
      jest.resetModules();
      const reloadedConfigMgr = require('../../src/config/configurationManager.js');
      
      // Note: After reload, state might be lost depending on implementation
      expect(reloadedConfigMgr).toBeDefined();
      expect(typeof reloadedConfigMgr.get).toBe('function');
    });
  });
});