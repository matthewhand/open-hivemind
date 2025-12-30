// Jest mock for sqlite module
// These are created as jest.fn() so tests can configure them

export const mockRun = jest.fn().mockResolvedValue({ lastID: 1, changes: 1 });
export const mockGet = jest.fn().mockResolvedValue(undefined);
export const mockAll = jest.fn().mockResolvedValue([]);
export const mockExec = jest.fn().mockResolvedValue(undefined);
export const mockClose = jest.fn().mockResolvedValue(undefined);
export const mockConfigure = jest.fn();

export class Database {
  private _connected = false;

  run = mockRun;
  get = mockGet;
  all = mockAll;
  exec = mockExec;
  close = mockClose;
  configure = mockConfigure;

  get connected(): boolean {
    return this._connected;
  }

  set connected(value: boolean) {
    this._connected = value;
  }
}

// Store the mock database instance that will be returned by open
const mockDbInstance = new Database();

export const open = jest.fn().mockResolvedValue(mockDbInstance);

export default {
  open,
  Database,
  // Export mocks for test access
  mockRun,
  mockGet,
  mockAll,
  mockExec,
  mockClose,
  mockConfigure,
  mockDb: mockDbInstance,
};
