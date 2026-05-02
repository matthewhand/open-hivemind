import Debug from 'debug';
import { injectable, singleton } from 'tsyringe';
import Logger from '../../common/logger';
import { MessageBus } from '../../events/MessageBus';
import { BotManager } from '../../managers/BotManager';

const debug = Debug('app:services:BotTaskScheduler');
const logger = Logger.withContext('BotTaskScheduler');

export interface ScheduledTask {
  id: string;
  botId: string;
  botName: string;
  prompt: string;
  intervalMs: number;
  lastRun?: string;
  nextRun: number;
  enabled: boolean;
}

/**
 * Service to handle recurring bot tasks (Scheduled Prompts).
 * Uses a simple setInterval loop to check for due tasks.
 */
@singleton()
@injectable()
export class BotTaskScheduler {
  private static instance: BotTaskScheduler;
  private tasks: ScheduledTask[] = [];
  private checkInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  public constructor() {
    // Singleton
  }

  public static getInstance(): BotTaskScheduler {
    if (!BotTaskScheduler.instance) {
      BotTaskScheduler.instance = new BotTaskScheduler();
    }
    return BotTaskScheduler.instance;
  }

  /**
   * Start the scheduler loop
   */
  public start(): void {
    if (this.checkInterval) return;

    logger.info('Starting Bot Task Scheduler');
    // Check every minute
    this.checkInterval = setInterval(() => {
      this.processTasks().catch((err) => {
        logger.error('Error in Bot Task Scheduler loop', err);
      });
    }, 60000);

    // Load tasks from DB (mocked for now, in a real scenario we'd use a Repository)
    this.loadTasks().catch((err) => {
      logger.error('Error loading tasks', err);
    });
  }

  /**
   * Stop the scheduler loop
   */
  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Bot Task Scheduler stopped');
    }
  }

  private async loadTasks() {
    // In a full implementation, we'd fetch from bot_scheduled_tasks table
    debug('Loading scheduled tasks from database...');
  }

  /**
   * Schedule a new recurring prompt for a bot
   */
  public async scheduleTask(
    botId: string,
    botName: string,
    prompt: string,
    intervalMinutes: number
  ): Promise<ScheduledTask> {
    const intervalMs = intervalMinutes * 60 * 1000;
    const task: ScheduledTask = {
      // eslint-disable-next-line no-restricted-properties
      id: `task_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      botId,
      botName,
      prompt,
      intervalMs,
      nextRun: Date.now() + intervalMs,
      enabled: true,
    };

    this.tasks.push(task);
    logger.info(`Scheduled new task for bot ${botName}`, { taskId: task.id, intervalMinutes });
    return task;
  }

  /**
   * Check for due tasks and trigger them
   */
  private async processTasks(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = Date.now();
      const bus = MessageBus.getInstance();
      const botManager = await BotManager.getInstance();

      for (const task of this.tasks) {
        if (task.enabled && now >= task.nextRun) {
          debug(`Executing scheduled task ${task.id} for bot ${task.botName}`);

          // Verify bot is still running
          if (botManager.isBotRunning(task.botId)) {
            // Emit 'message:incoming' as a SYSTEM user
            await bus.emitAsync('message:incoming', {
              message: {
                getText: () => task.prompt,
                getContent: () => task.prompt,
                getAuthor: () => 'SYSTEM_SCHEDULER',
                getChannelId: () => 'scheduled-task',
                platform: 'system',
                timestamp: new Date(),
                metadata: { isScheduledTask: true },
              } as any,
              history: [],
              botConfig: {}, // Will be populated by pipeline
              botName: task.botName,
              platform: 'system',
              channelId: 'system',
              metadata: { taskId: task.id },
            });

            logger.info(`Triggered scheduled task for ${task.botName}`, { taskId: task.id });
          }

          // Update next run time
          task.lastRun = new Date().toISOString();
          task.nextRun = now + task.intervalMs;
        }
      }
    } catch (error) {
      logger.error('Error processing scheduled tasks', { error });
    } finally {
      this.isProcessing = false;
    }
  }

  public getTasksForBot(botId: string): ScheduledTask[] {
    return this.tasks.filter((t) => t.botId === botId);
  }

  public deleteTask(taskId: string): void {
    this.tasks = this.tasks.filter((t) => t.id !== taskId);
  }
}
