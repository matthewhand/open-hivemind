import { type Server as HttpServer } from 'http';
import Debug from 'debug';
import { createClient } from 'redis';
import { Server as SocketIOServer, type Socket } from 'socket.io';
import { injectable, singleton } from 'tsyringe';
import { createAdapter } from '@socket.io/redis-adapter';
import { AuthManager } from '../../../auth/AuthManager';

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
      // Hardening: cap payload size and tighten ping/connect timeouts so a
      // hostile peer cannot pin memory via giant frames or stalled handshakes.
      maxHttpBufferSize: 1_000_000, // 1MB
      pingTimeout: 20_000,
      pingInterval: 25_000,
      connectTimeout: 10_000,
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

    // Authenticate every WebSocket connection. The client already sends
    // `auth: { token }` in WebSocketContext.tsx — previously the server
    // never read it, so any peer reachable via CORS could connect and
    // consume bot-status / pipeline / audit broadcasts (cross-tenant leak).
    //
    // Mirrors the HTTP `authenticateToken` middleware: verifies a JWT via
    // AuthManager and attaches user info to `socket.data.user`. Refuses
    // the connection (Socket.IO surfaces this as `connect_error` on the
    // client) if the token is missing, malformed, or expired.
    this.io.use((socket: Socket, next) => {
      // Test-only bypass: matches the HTTP-side ALLOW_TEST_BYPASS gate
      // that's already refused in production by middleware/auth.ts.
      if (process.env.ALLOW_TEST_BYPASS === 'true' && process.env.NODE_ENV !== 'production') {
        socket.data.user = { id: 'test-bypass', role: 'admin', permissions: ['*'] };
        return next();
      }

      const token =
        (socket.handshake.auth?.token as string | undefined) ||
        (socket.handshake.headers.authorization?.startsWith('Bearer ')
          ? socket.handshake.headers.authorization.slice(7)
          : undefined);

      if (!token) {
        debug('WebSocket connect refused: no token');
        return next(new Error('Authentication required'));
      }

      try {
        const authManager = AuthManager.getInstance();
        const payload = authManager.verifyAccessToken(token);
        socket.data.user = payload;
        return next();
      } catch (err) {
        debug('WebSocket connect refused: invalid token', err);
        return next(new Error('Invalid or expired token'));
      }
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
            this.io?.adapter(createAdapter(this.pubClient, this.subClient));
            debug('Redis adapter configured successfully');
          })
          .catch((err: unknown) => {
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
      this.pubClient.quit().catch((err: unknown) => {
        debug('Error quitting pubClient:', err);
      });
      this.pubClient = null;
    }
    if (this.subClient) {
      this.subClient.quit().catch((err: unknown) => {
        debug('Error quitting subClient:', err);
      });
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
