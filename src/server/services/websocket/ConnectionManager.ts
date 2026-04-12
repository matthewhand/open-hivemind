import { type Server as HttpServer } from 'http';
import Debug from 'debug';
import { createClient } from 'redis';
import { Server as SocketIOServer } from 'socket.io';
import { injectable, singleton } from 'tsyringe';
import { createAdapter } from '@socket.io/redis-adapter';

const debug = Debug('app:WebSocketService:ConnectionManager');

@singleton()
@injectable()
export class ConnectionManager {
  private io: SocketIOServer | null = null;
  private connectedClients = 0;
  private pubClient: any = null;
  private subClient: any = null;

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

    if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
      try {
        debug('Setting up Redis adapter for socket.io');
        this.pubClient = createClient({ url: process.env.REDIS_URL });
        this.subClient = this.pubClient.duplicate();

        this.pubClient.on('error', (err: any) => debug('Redis PubClient error:', err));
        this.subClient.on('error', (err: any) => debug('Redis SubClient error:', err));

        Promise.all([this.pubClient.connect(), this.subClient.connect()])
          .then(() => {
            this.io!.adapter(createAdapter(this.pubClient, this.subClient));
            debug('Redis adapter configured successfully');
          })
          .catch((err) => {
            debug('Failed to connect to Redis for socket.io adapter:', err);
          });
      } catch (err) {
        debug('Failed to setup Redis adapter:', err);
      }
    }

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
    if (this.pubClient) {
      this.pubClient.quit().catch(() => {});
      this.pubClient = null;
    }
    if (this.subClient) {
      this.subClient.quit().catch(() => {});
      this.subClient = null;
    }
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
