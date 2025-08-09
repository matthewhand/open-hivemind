const configMgr = require('../../src/config/configurationManager.js');

describe('ConfigurationManager', () => {
  beforeEach(() => {
    // Reset internal state between tests
    configMgr.config = {};
  });

  it('get() returns null when key missing', () => {
    expect(configMgr.get('does_not_exist')).toBeNull();
  });

  it('get() returns stored value when present', () => {
    configMgr.config.foo = 'bar';
    expect(configMgr.get('foo')).toBe('bar');
  });
});