import 'reflect-metadata';
import { injectable, singleton } from 'tsyringe';
import type {
  AlertEvent,
  MessageFlowEvent,
  PerformanceMetric,
} from '../server/services/websocket/types';
import type { DemoBot, DemoConversation, DemoMessage } from './demo/DemoConstants';
import { type DemoStateService } from './demo/DemoStateService';

@singleton()
@injectable()
export class DemoModeService {
  constructor(private stateService: DemoStateService) {}

  public detectDemoMode(): boolean {
    return this.stateService.detectDemoMode();
  }

  public async initialize(): Promise<void> {
    return this.stateService.initialize();
  }

  public isInDemoMode(): boolean {
    return this.stateService.isInDemoMode();
  }

  public setDemoMode(enabled: boolean): void {
    this.stateService.setDemoMode(enabled);
  }

  public getDemoBots(): DemoBot[] {
    return this.stateService.getDemoBots();
  }

  public startActivitySimulation(): void {
    this.stateService.startActivitySimulation();
  }

  public stopActivitySimulation(): void {
    this.stateService.stopActivitySimulation();
  }

  public getDemoStatus(): any {
    return this.stateService.getDemoStatus();
  }

  public reset(): void {
    this.stateService.reset();
  }

  public getOrCreateConversation(channelId: string, botName: string): DemoConversation {
    return this.stateService.getConversationManager().getOrCreateConversation(channelId, botName);
  }

  public addMessage(
    channelId: string,
    botName: string,
    content: string,
    type: 'incoming' | 'outgoing',
    userId = 'demo-user',
    userName = 'Demo User'
  ): DemoMessage {
    return this.stateService
      .getConversationManager()
      .addMessage(channelId, botName, content, type, userId, userName);
  }

  public getConversationHistory(channelId: string, botName: string): DemoMessage[] {
    return this.stateService.getConversationManager().getConversationHistory(channelId, botName);
  }

  public getAllConversations(): DemoConversation[] {
    return this.stateService.getConversationManager().getAllConversations();
  }

  public generateDemoResponse(message: string, botName: string): string {
    return this.stateService.getConversationManager().generateDemoResponse(message, botName);
  }

  // Deprecated methods or stubs for UI compatibility if needed
  public getSimulatedMessageFlow(_limit = 100): MessageFlowEvent[] {
    return [];
  }
  public getSimulatedAlerts(_limit = 50): AlertEvent[] {
    return [];
  }
  public getSimulatedPerformanceMetrics(_limit = 60): PerformanceMetric[] {
    return [];
  }
}

export { DemoBot, DemoMessage, DemoConversation } from './demo/DemoConstants';
export default DemoModeService;
