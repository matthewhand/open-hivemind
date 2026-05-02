import crypto from 'crypto';
import type { MetricsCollector } from '../../monitoring/MetricsCollector';
import type { ActivityLogger } from '../../server/services/ActivityLogger';
import type {
  AlertEvent,
  MessageFlowEvent,
  PerformanceMetric,
} from '../../server/services/websocket/types';
import type { WebSocketService } from '../../server/services/WebSocketService';
import {
  CONVERSATION_THREADS,
  DEMO_USERS,
  ERROR_MESSAGES,
  type DemoActivitySimulator,
  type DemoBot,
} from './DemoConstants';

/**
 * Handles the simulation of activity (messages, metrics, alerts).
 */
export class DemoActivitySimulatorService {
  private activitySimulator: DemoActivitySimulator = {
    isRunning: false,
    simulationStartTime: 0,
  };
  private simulationInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private activeThreads = new Map<
    string,
    { threadIndex: number; stepIndex: number; lastActivity: number }
  >();

  constructor(
    private demoBots: DemoBot[],
    private metricsCollector: MetricsCollector,
    private activityLogger: ActivityLogger,
    private wsService: WebSocketService
  ) {}

  public getSimulatorState(): DemoActivitySimulator {
    return this.activitySimulator;
  }

  public startActivitySimulation(): void {
    if (this.activitySimulator.isRunning) {
      return;
    }

    this.activitySimulator.isRunning = true;
    this.activitySimulator.simulationStartTime = Date.now();

    // Random message simulation (every 10-30s)
    const runSimulation = () => {
      this.generateAndRecordMessageEvent();
      const nextInterval = Math.floor(Math.random() * 20000) + 10000;
      this.simulationInterval = setTimeout(runSimulation, nextInterval);
    };
    runSimulation();

    // Regular metrics simulation (every 5s)
    this.metricsInterval = setInterval(() => {
      this.generateAndRecordPerformanceMetric();
    }, 5000);
  }

  public stopActivitySimulation(): void {
    this.activitySimulator.isRunning = false;
    if (this.simulationInterval) {
      clearTimeout(this.simulationInterval);
      this.simulationInterval = null;
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  public reset(): void {
    this.stopActivitySimulation();
    this.activeThreads.clear();
  }

  public seedHistoricalData(): void {
    const now = Date.now();

    // Pre-seed MetricsCollector with 60 data points
    for (let i = 60; i >= 0; i--) {
      const cpu = 15 + Math.sin(i * 0.1) * 10 + (Math.random() - 0.5) * 8;
      const mem = 45 + Math.sin(i * 0.2) * 15 + (Math.random() - 0.5) * 10;
      this.metricsCollector.recordMetric('demo.cpu', Math.max(5, Math.min(60, cpu)), {
        source: 'demo',
      });
      this.metricsCollector.recordMetric('demo.memory', Math.max(20, Math.min(85, mem)), {
        source: 'demo',
      });
      this.metricsCollector.recordResponseTime(100 + Math.random() * 500);
      if (Math.random() < 0.3) {
        this.metricsCollector.incrementMessages();
        this.metricsCollector.recordLlmTokenUsage(Math.floor(Math.random() * 200) + 50);
      }
    }

    // Pre-seed ActivityLogger + WS with 30 events
    for (let i = 30; i >= 0; i--) {
      const event = this.createMessageFlowEventForWS(new Date(now - i * 10000).toISOString());
      try {
        this.activityLogger.log(event);
      } catch {
        // ActivityLogger may not be initialized in tests
      }
      this.wsService.recordMessageFlow(event);
    }

    // Pre-seed a couple of alerts
    for (let i = 2; i >= 0; i--) {
      const alert = this.createAlertEventForWS(new Date(now - i * 60000).toISOString());
      this.wsService.recordAlert(alert);
    }
  }

  private generateAndRecordMessageEvent(): void {
    if (this.demoBots.length === 0) {
      return;
    }
    const event = this.createMessageFlowEventForWS();

    this.metricsCollector.incrementMessages();
    if (event.processingTime) {
      this.metricsCollector.recordResponseTime(event.processingTime);
    }
    if (event.status === 'error') {
      this.metricsCollector.incrementErrors();
    }
    this.metricsCollector.recordLlmTokenUsage(Math.floor(Math.random() * 300) + 50);

    try {
      this.activityLogger.log(event);
    } catch {
      // May not be initialized
    }
    this.wsService.recordMessageFlow(event);
  }

  private generateAndRecordPerformanceMetric(): void {
    if (this.demoBots.length === 0) {
      return;
    }
    const metric = this.createPerformanceMetric();

    this.metricsCollector.recordMetric('demo.cpu', metric.cpuUsage, { source: 'demo' });
    this.metricsCollector.recordMetric('demo.memory', metric.memoryUsage, { source: 'demo' });
    this.metricsCollector.recordMetric('demo.responseTime', metric.responseTime, {
      source: 'demo',
    });
    this.metricsCollector.recordMetric('demo.activeConnections', metric.activeConnections, {
      source: 'demo',
    });
    this.metricsCollector.recordMetric('demo.messageRate', metric.messageRate, { source: 'demo' });
    this.metricsCollector.recordMetric('demo.errorRate', metric.errorRate, { source: 'demo' });

    if (Math.random() < 0.1) {
      const alert = this.createAlertEventForWS();
      this.wsService.recordAlert(alert);
    }
  }

  private generateThreadContent(): { content: string; isFromUser: boolean } {
    const now = Date.now();

    if (Math.random() < 0.3 || this.activeThreads.size === 0) {
      const threadIndex = Math.floor(Math.random() * CONVERSATION_THREADS.length);
      const channelKey = `thread-${Date.now()}`;
      this.activeThreads.set(channelKey, { threadIndex, stepIndex: 0, lastActivity: now });

      const thread = CONVERSATION_THREADS[threadIndex];
      return { content: thread[0].user, isFromUser: true };
    }

    const activeThreadKeys = Array.from(this.activeThreads.keys());
    const channelKey = activeThreadKeys[Math.floor(Math.random() * activeThreadKeys.length)];

    const threadState = this.activeThreads.get(channelKey);
    if (!threadState) {
      return this.generateThreadContent();
    }
    const thread = CONVERSATION_THREADS[threadState.threadIndex];

    if (now - threadState.lastActivity > 300000) {
      this.activeThreads.delete(channelKey);
      return this.generateThreadContent();
    }

    const currentStep = thread[threadState.stepIndex];
    const isUserTurn = threadState.stepIndex % 2 === 0;

    threadState.stepIndex++;
    threadState.lastActivity = now;

    if (threadState.stepIndex >= thread.length) {
      this.activeThreads.delete(channelKey);
    }

    return {
      content: isUserTurn ? currentStep.user : currentStep.bot,
      isFromUser: isUserTurn,
    };
  }

  private createMessageFlowEventForWS(timestamp?: string): MessageFlowEvent {
    const bot = this.demoBots[Math.floor(Math.random() * this.demoBots.length)];
    const processingTime = this.generateProcessingTime();
    const hasError = Math.random() < 0.05;
    const user = DEMO_USERS[Math.floor(Math.random() * DEMO_USERS.length)];

    const threadContent = this.generateThreadContent();
    const isIncoming = threadContent.isFromUser;
    const content = threadContent.content;

    return {
      id: `demo-msg-${Date.now()}-${crypto.randomUUID()}`,
      timestamp: timestamp || new Date().toISOString(),
      botName: bot.name,
      provider: bot.messageProvider,
      llmProvider: bot.llmProvider,
      channelId: bot.discord?.channelId || bot.slack?.channelId || `demo-channel-${bot.name}`,
      userId: user.id,
      messageType: isIncoming ? 'incoming' : 'outgoing',
      contentLength: content.length,
      processingTime: isIncoming ? undefined : processingTime,
      status: hasError ? 'error' : processingTime > 1500 ? 'timeout' : 'success',
      errorMessage: hasError
        ? ERROR_MESSAGES[Math.floor(Math.random() * ERROR_MESSAGES.length)]
        : undefined,
    };
  }

  private createAlertEventForWS(timestamp?: string): AlertEvent {
    const bot = this.demoBots[Math.floor(Math.random() * this.demoBots.length)];
    const levels: Array<'info' | 'warning' | 'error' | 'critical'> = [
      'info',
      'warning',
      'error',
      'critical',
    ];
    const level = levels[Math.floor(Math.random() * levels.length)];

    const titles: Record<string, string[]> = {
      info: ['Bot connected successfully', 'Configuration reloaded', 'Health check passed'],
      warning: ['High response time detected', 'Rate limit approaching', 'Memory usage elevated'],
      error: ['LLM provider connection failed', 'Message delivery timeout', 'Rate limit exceeded'],
      critical: [
        'Service unavailable',
        'Multiple bot failures detected',
        'System resource exhaustion',
      ],
    };

    return {
      id: `demo-alert-${Date.now()}-${crypto.randomUUID()}`,
      timestamp: timestamp || new Date().toISOString(),
      level,
      title: titles[level][Math.floor(Math.random() * titles[level].length)],
      message: `Demo alert: ${bot.name} — ${titles[level][Math.floor(Math.random() * titles[level].length)]}`,
      botName: bot.name,
      channelId: bot.discord?.channelId || bot.slack?.channelId,
      status: 'active',
      metadata: { isDemo: true },
    };
  }

  private createPerformanceMetric(timestamp?: string): PerformanceMetric {
    const elapsed = Date.now() - (this.activitySimulator.simulationStartTime || Date.now());
    const cyclePosition = (elapsed / 60000) % 1;
    const hourOfDay = new Date().getHours();
    const todMultiplier = this.getTimeOfDayMultiplier(hourOfDay);
    const hasSpike = Math.random() < 0.05;
    const spikeMul = hasSpike ? 1.5 + Math.random() * 0.5 : 1;

    const cpu = (15 + Math.sin(cyclePosition * Math.PI * 2) * 10) * todMultiplier;
    const mem = (45 + Math.sin(cyclePosition * Math.PI * 4) * 15) * (0.8 + todMultiplier * 0.4);
    const msgRate = (2 + Math.sin(cyclePosition * Math.PI * 6) * 1.5) * todMultiplier;

    return {
      timestamp: timestamp || new Date().toISOString(),
      responseTime: Math.random() * 500 + 100 + (hasSpike ? 200 : 0),
      memoryUsage: Math.max(20, Math.min(85, mem + (Math.random() - 0.5) * 10)),
      cpuUsage: Math.max(5, Math.min(60, cpu * spikeMul + (Math.random() - 0.5) * 8)),
      activeConnections: Math.floor(3 + msgRate + (Math.random() - 0.5) * 2),
      messageRate: Math.max(0, msgRate * spikeMul + (Math.random() - 0.5) * 0.5),
      errorRate: hasSpike ? Math.random() * 0.1 : Math.random() * 0.02,
    };
  }

  private generateProcessingTime(): number {
    const r = Math.random();
    if (r < 0.6) {
      return Math.random() * 400 + 100;
    }
    if (r < 0.9) {
      return Math.random() * 1000 + 500;
    }
    return Math.random() * 1500 + 1500;
  }

  private getTimeOfDayMultiplier(hour: number): number {
    if (hour >= 9 && hour <= 17) {
      return 1.2 + Math.sin(((hour - 9) / 8) * Math.PI) * 0.3;
    }
    if (hour >= 7 && hour <= 20) {
      return 0.8;
    }
    return 0.3;
  }
}
