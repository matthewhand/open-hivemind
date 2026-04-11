import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { ConnectionManager } from '../../../../../src/server/services/websocket/ConnectionManager';

jest.mock('socket.io', () => ({
  Server: jest.fn(),
}));

describe('websocket/ConnectionManager', () => {
  let manager: ConnectionManager;
  let mockIo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new ConnectionManager();

    mockIo = {
      sockets: {
        sockets: new Map([
          ['1', { disconnect: jest.fn() }],
          ['2', { disconnect: jest.fn(() => { throw new Error('disconnect fail'); }) }],
        ]),
      },
      removeAllListeners: jest.fn(),
    };

    (SocketIOServer as jest.Mock).mockReturnValue(mockIo);
  });

  it('throws when initialize is called without server', () => {
    expect(() => manager.initialize(undefined as unknown as HttpServer)).toThrow(
      'HTTP server is required for WebSocket initialization'
    );
  });

  it('initializes socket.io with expected path and CORS settings', () => {
    const server = {} as HttpServer;
    const io = manager.initialize(server);

    expect(io).toBe(mockIo);
    expect(SocketIOServer).toHaveBeenCalledWith(
      server,
      expect.objectContaining({
        path: '/webui/socket.io',
        cors: expect.objectContaining({
          methods: ['GET', 'POST'],
          credentials: true,
        }),
      })
    );
  });

  it('increments and decrements connected client count', () => {
    expect(manager.getConnectedClients()).toBe(0);
    manager.incrementClients();
    manager.incrementClients();
    expect(manager.getConnectedClients()).toBe(2);
    manager.decrementClients();
    expect(manager.getConnectedClients()).toBe(1);
  });

  it('shutdown disconnects sockets, removes listeners, and resets state', () => {
    const server = {} as HttpServer;
    manager.initialize(server);
    manager.setConnectedClients(3);

    manager.shutdown();

    const sock1: any = mockIo.sockets.sockets.get('1');
    const sock2: any = mockIo.sockets.sockets.get('2');

    expect(sock1.disconnect).toHaveBeenCalledWith(true);
    expect(sock2.disconnect).toHaveBeenCalledWith(true);
    expect(mockIo.removeAllListeners).toHaveBeenCalled();
    expect(manager.getIo()).toBeNull();
    expect(manager.getConnectedClients()).toBe(0);
  });

  it('shutdown is safe when io is null', () => {
    expect(() => manager.shutdown()).not.toThrow();
    expect(manager.getConnectedClients()).toBe(0);
  });
});
