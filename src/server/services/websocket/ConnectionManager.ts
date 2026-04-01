import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import Debug from 'debug';
import os from 'os';
import { injectable, singleton } from 'tsyringe';

const debug = Debug('app:WebSocketService:ConnectionManager');

@singleton()
@injectable()
export class ConnectionManager {
  private io: SocketIOServer | null = null;
  private connectedClients = 0;

  public initialize(server: HttpServer): SocketIOServer {
    if (!server) {
      debug('ERROR: HTTP server is required for WebSocket initialization');
      throw new Error('HTTP server is required for WebSocket initialization');
    }

    this.io = new SocketIOServer(server, {
      path: '/webui/socket.io',
      cors: {
        origin: [
          /^https?:\/\/localhost(:\d+)?/,
          /^https?:\/\/127\.0\.0\.1(:\d+)?/,
          /^https:\/\/.*\.netlify\.app$/,
          /^https:\/\/.*\.netlify\.com$/,
          /^https:\/\/.*\.fly\.dev$/,
        ],
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: [
          'Origin',
          'X-Requested-With',
          'Content-Type',
          'Accept',
          'Authorization',
          'Cache-Control',
          'X-CSRF-Token',
        ],
      },
    });

    debug('WebSocket service initialized successfully with CORS enabled');
    return this.io;
  }

  public getIo(): SocketIOServer | null {
    return this.io;
  }

  // Exposed for tests
  public setIo(io: SocketIOServer | null): void {
    this.io = io;
  }

  public getConnectedClients(): number {
    return this.connectedClients;
  }

  // Exposed for tests
  public setConnectedClients(value: number): void {
    this.connectedClients = value;
  }

  public incrementClients(): void {
    this.connectedClients++;
  }

  public decrementClients(): void {
    this.connectedClients--;
  }

  public shutdown(): void {
    if (this.io) {
      try {
        try {
          this.io.sockets.sockets.forEach((socket) => {
            try {
              socket.disconnect(true);
            } catch {
              /* ignore */
            }
          });
        } catch {
          /* ignore */
        }
        this.io.removeAllListeners();
      } catch (error) {
        debug('Error during WebSocket shutdown:', error);
      }
      this.io = null;
    }
    this.connectedClients = 0;
  }
}
