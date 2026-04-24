import Debug from 'debug';
import { getLlmProvider } from '@src/llm/getLlmProvider';
import { type BotInstance } from '@src/managers/BotManager';
import { AnomalyDetectionService } from '@src/services/AnomalyDetectionService';
import { createLogger } from '@common/StructuredLogger';
import { BotMetricsService } from './BotMetricsService';

const debug = Debug('app:services:BotInsightsService');
const logger = createLogger('BotInsightsService');

export interface BotInsights {
  insights: string;
}

export class BotInsightsService {
  private static instance: BotInsightsService;

  private constructor() {
    // Singleton
  }

  public static getInstance(): BotInsightsService {
    if (!BotInsightsService.instance) {
      BotInsightsService.instance = new BotInsightsService();
    }
    return BotInsightsService.instance;
  }

  /**
   * Generate performance insights for a bot using LLM
   */
  public async generateInsights(bot: BotInstance): Promise<BotInsights> {
    debug('Generating insights for bot: %s', bot.name);

    // Gather data
    const metricsService = BotMetricsService.getInstance();
    const metrics = metricsService.getMetrics(bot.name);

    const anomalyService = AnomalyDetectionService.getInstance();
    const activeAnomalies = anomalyService.getActiveAnomalies();

    const providers = await getLlmProvider();
    const provider = providers[0];

    if (!provider) {
      throw new Error('No LLM provider available for insights');
    }

    const systemPrompt = `You are a Performance Analyst for the Open Hivemind platform.
Your task is to review the performance metrics and active anomalies for a specific bot and provide a detailed performance review and optimization recommendations.

Bot Name: ${bot.name}
Persona: ${bot.persona}
LLM Provider: ${bot.llmProvider}
Message Provider: ${bot.messageProvider}

Metrics:
- Messages Handled: ${metrics.messageCount}
- Error Count: ${metrics.errorCount}
- Last Active: ${metrics.lastActive || 'N/A'}

Active System Anomalies:
${
  activeAnomalies.length > 0
    ? activeAnomalies.map((a) => `- [${a.severity}] ${a.metric}: ${a.explanation}`).join('\n')
    : 'None detected'
}

Provide your response in Markdown. Include:
1. **Performance Summary**: A concise evaluation of how the bot is doing.
2. **Anomaly Impact**: How current system anomalies might be affecting this bot.
3. **Recommendations**: 3-5 specific, actionable steps to improve performance, reliability, or cost-efficiency.
4. **Overall Health Score**: A score from 0-100.

Be professional, data-driven, and concise.`;

    try {
      const insights = await provider.generateChatCompletion(systemPrompt, []);
      return { insights };
    } catch (error) {
      logger.error(
        'Failed to call LLM for insights',
        error instanceof Error ? error : new Error(String(error))
      );
      throw new Error('LLM call for insights failed');
    }
  }
}
