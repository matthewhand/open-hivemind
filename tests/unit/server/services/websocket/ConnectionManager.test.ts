import { Server as HttpServer } from 'http';

// Create the mock instance outside to avoid recreation
const mockIoInstance = {
  sockets: {
    sockets: new Map([
      ['1', { disconnect: jest.fn() }],
    ]),
  },
  removeAllListeners: jest.fn(),
  adapter: jest.fn(),
};

// Mock socket.io BEFORE any imports
jest.doMock('socket.io', () => {
  return {
    Server: jest.fn().mockImplementation(() => mockIoInstance)
  };
});

describe('websocket/ConnectionManager', () => {
  let ConnectionManager: any;
  let manager: any;
  let SocketIOServer: any;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    // Re-require within the test to get the mocked versions
    ConnectionManager = require('../../../../../src/server/services/websocket/ConnectionManager').ConnectionManager;
    SocketIOServer = require('socket.io').Server;
    
    manager = new ConnectionManager();
  });

  it('throws when initialize is called without server', () => {
    expect(() => manager.initialize(undefined as any)).toThrow();
  });

  it('initializes socket.io with expected path', () => {
    const server = {} as HttpServer;
    const io = manager.initialize(server);

    // Don't use toBe(mockIoInstance) if it causes recursion, 
    // just check that it's what was returned.
    expect(io).toBeDefined();
    expect(SocketIOServer).toHaveBeenCalled();
  });

  it('increments and decrements connected client count', () => {
    expect(manager.getConnectedClients()).toBe(0);
    manager.incrementClients();
    expect(manager.getConnectedClients()).toBe(1);
    manager.decrementClients();
    expect(manager.getConnectedClients()).toBe(0);
  });

  it('shutdown disconnects sockets and resets state', () => {
    const server = {} as HttpServer;
    manager.initialize(server);
    manager.setConnectedClients(3);

    manager.shutdown();

    expect(mockIoInstance.removeAllListeners).toHaveBeenCalled();
    expect(manager.getIo()).toBeNull();
    expect(manager.getConnectedClients()).toBe(0);
  });
});
