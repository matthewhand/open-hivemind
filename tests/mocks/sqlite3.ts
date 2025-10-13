class MockStatement {
  finalize(callback?: (err: Error | null) => void): void {
    callback?.(null);
  }

  run(...args: any[]): MockStatement {
    const callback = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : undefined;
    callback?.call(this, null);
    return this;
  }
}

class MockDatabase {
  constructor(_filename: string, _mode?: number, callback?: (err: Error | null) => void) {
    if (callback) {
      setImmediate(() => callback(null));
    }
  }

  all(...args: any[]): void {
    const callback = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : undefined;
    callback?.(null, []);
  }

  get(...args: any[]): void {
    const callback = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : undefined;
    callback?.(null, undefined);
  }

  run(...args: any[]): MockDatabase {
    const callback = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : undefined;
    callback?.call(this, null);
    return this;
  }

  exec(_sql: string, callback?: (err: Error | null) => void): Promise<void> {
    callback?.(null);
    return Promise.resolve();
  }

  close(callback?: (err: Error | null) => void): Promise<void> {
    callback?.(null);
    return Promise.resolve();
  }

  prepare(): MockStatement {
    return new MockStatement();
  }

  serialize(callback: () => void): void {
    callback();
  }

  on(): MockDatabase {
    return this;
  }
}

const sqlite3Mock = {
  Database: MockDatabase,
  verbose: () => sqlite3Mock,
};

export default sqlite3Mock;
module.exports = sqlite3Mock;
