import Debug from 'debug';
import { type Server as SocketIOServer } from 'socket.io';
import { injectable, singleton } from 'tsyringe';
import type { AckPayload, RequestMissedPayload } from '../../../types/websocket';
import { type BroadcastService } from './BroadcastService';
import { type ConnectionManager } from './ConnectionManager';

const debug = Debug('app:WebSocketService:EventHandlers');

@singleton()
@injectable()
export class EventHandlers {
  constructor(
    private connectionManager: ConnectionManager,
    private broadcastService: BroadcastService
  ) {}

  public setup(io: SocketIOServer): void {
    io.on('connection', (socket) => {
      this.connectionManager.incrementClients();
      debug(`Client connected. Total clients: ${this.connectionManager.getConnectedClients()}`);

      // Send initial data
      this.broadcastService.sendBotStatus(socket);
      this.broadcastService.sendSystemMetrics(socket, this.connectionManager.getConnectedClients());

      socket.on('request_bot_status', () => {
        this.broadcastService.sendBotStatus(socket);
      });

      socket.on('request_system_metrics', () => {
        this.broadcastService.sendSystemMetrics(
          socket,
          this.connectionManager.getConnectedClients()
        );
      });

      socket.on('request_config_validation', () => {
        this.broadcastService.sendConfigValidation(socket);
      });

      socket.on('request_message_flow', () => {
        this.broadcastService.sendMessageFlow(socket);
      });

      socket.on('request_alerts', () => {
        this.broadcastService.sendAlerts(socket);
      });

      socket.on('request_performance_metrics', () => {
        this.broadcastService.sendPerformanceMetrics(
          socket,
          this.connectionManager.getConnectedClients()
        );
      });

      socket.on('request_monitoring_dashboard', () => {
        this.broadcastService.sendMonitoringDashboard(
          socket,
          this.connectionManager.getConnectedClients()
        );
      });

      socket.on('request_api_status', () => {
        this.broadcastService.sendApiStatus(socket);
      });

      socket.on('request_api_endpoints', () => {
        this.broadcastService.sendApiEndpoints(socket);
      });

      socket.on('ack', (data: AckPayload) => {
        this.broadcastService.handleAck(data);
      });

      socket.on('request_missed', (data: RequestMissedPayload) => {
        const missed = this.broadcastService.handleRequestMissed(data);
        socket.emit('missed_messages', { channel: data.channel, messages: missed });
      });

      socket.on('disconnect', () => {
        this.connectionManager.decrementClients();
        debug(
          `Client disconnected. Total clients: ${this.connectionManager.getConnectedClients()}`
        );
        socket.removeAllListeners();
      });
    });
  }
}
