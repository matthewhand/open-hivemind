import Debug from 'debug';
import { DEFAULT_PAGE_LIMIT } from '@common/constants/time';
import { BotConfigurationManager } from '../config/BotConfigurationManager';
import { ActivityLogger, type ActivityFilter } from '../server/services/ActivityLogger';
import { type MessageFlowEvent } from '../server/services/WebSocketService';
import {
  type AnalyticsStats,
  type BehaviorPattern,
  type DashboardRecommendation,
  type TimeSeriesBucket,
  type UserSegment,
} from './analytics/AnalyticsConstants';
import { PatternAnalyzer } from './analytics/PatternAnalyzer';
import { RecommendationEngine } from './analytics/RecommendationEngine';
import { SegmentClassifier } from './analytics/SegmentClassifier';
import { TimeSeriesAggregator } from './analytics/TimeSeriesAggregator';

const debug = Debug('app:AnalyticsService');

export class AnalyticsService {
  private static instance: AnalyticsService;
  private activityLogger: ActivityLogger;
  private botConfigManager: BotConfigurationManager;

  private patternAnalyzer = new PatternAnalyzer();
  private segmentClassifier = new SegmentClassifier();
  private recommendationEngine = new RecommendationEngine();
  private timeSeriesAggregator = new TimeSeriesAggregator();

  private constructor() {
    this.activityLogger = ActivityLogger.getInstance();
    this.botConfigManager = BotConfigurationManager.getInstance();
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  public async getBehaviorPatterns(
    options: ActivityFilter = {},
    providedEvents?: MessageFlowEvent[]
  ): Promise<BehaviorPattern[]> {
    const events =
      providedEvents ||
      (await this.activityLogger.getEvents({
        ...options,
        limit: options.limit || DEFAULT_PAGE_LIMIT,
      }));

    return this.patternAnalyzer.analyze(events);
  }

  public async getUserSegments(
    options: ActivityFilter = {},
    providedEvents?: MessageFlowEvent[]
  ): Promise<UserSegment[]> {
    const events =
      providedEvents ||
      (await this.activityLogger.getEvents({
        ...options,
        limit: options.limit || DEFAULT_PAGE_LIMIT,
      }));

    return this.segmentClassifier.classify(events);
  }

  public async getRecommendations(
    options: ActivityFilter = {},
    providedEvents?: MessageFlowEvent[]
  ): Promise<DashboardRecommendation[]> {
    const events =
      providedEvents ||
      (await this.activityLogger.getEvents({
        ...options,
        limit: options.limit || DEFAULT_PAGE_LIMIT,
      }));

    const patterns = await this.getBehaviorPatterns(options, events);
    const segments = await this.getUserSegments(options, events);

    return this.recommendationEngine.generate(events, patterns, segments);
  }

  public async getStats(options: ActivityFilter = {}): Promise<AnalyticsStats> {
    const events = await this.activityLogger.getEvents({
      ...options,
      limit: options.limit || DEFAULT_PAGE_LIMIT,
    });

    const patterns = await this.getBehaviorPatterns(options, events);
    const segments = await this.getUserSegments(options, events);

    const totalMessages = events.length;
    const totalErrors = events.filter((e) => e.status === 'error').length;
    const processingTimes = events.filter((e) => e.processingTime).map((e) => e.processingTime!);
    const avgProcessingTime =
      processingTimes.length > 0
        ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
        : 0;

    const activeBots = new Set(events.map((e) => e.botName)).size;
    const activeUsers = new Set(events.map((e) => e.userId)).size;

    return {
      learningProgress: Math.min((events.length / 1000) * 100, 100),
      behaviorPatternsCount: patterns.length,
      userSegmentsCount: segments.length,
      totalMessages,
      totalErrors,
      avgProcessingTime,
      activeBots,
      activeUsers,
    };
  }

  public async getTimeSeries(options: ActivityFilter = {}): Promise<TimeSeriesBucket[]> {
    const events = await this.activityLogger.getEvents({
      ...options,
      limit: options.limit || DEFAULT_PAGE_LIMIT,
    });

    return this.timeSeriesAggregator.aggregate(events);
  }
}

export {
  BehaviorPattern,
  UserSegment,
  DashboardRecommendation,
  AnalyticsStats,
  TimeSeriesBucket,
} from './analytics/AnalyticsConstants';

export default AnalyticsService;
