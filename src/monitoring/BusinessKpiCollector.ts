import { EventEmitter } from 'events';

/**
 * KPI categories
 */
export type KpiCategory = 'engagement' | 'performance' | 'revenue' | 'growth' | 'retention' | 'custom';

/**
 * KPI data point
 */
export interface KpiDataPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, string | number | boolean>;
}

/**
 * KPI definition
 */
export interface KpiDefinition {
  id: string;
  name: string;
  description: string;
  category: KpiCategory;
  unit: string;
  aggregationType: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'percentile';
  dataPoints: KpiDataPoint[];
  currentValue: number;
  previousValue: number;
  targetValue?: number;
  thresholds?: {
    warning?: number;
    critical?: number;
  };
}

/**
 * Business KPI collector for tracking custom business metrics
 */
export class BusinessKpiCollector extends EventEmitter {
  private static instance: BusinessKpiCollector;
  private kpis: Map<string, KpiDefinition> = new Map();
  private dataRetentionMs: number = 24 * 60 * 60 * 1000; // 24 hours default

  private constructor() {
    super();
    this.initializeDefaultKpis();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): BusinessKpiCollector {
    if (!BusinessKpiCollector.instance) {
      BusinessKpiCollector.instance = new BusinessKpiCollector();
    }
    return BusinessKpiCollector.instance;
  }

  /**
   * Initialize default business KPIs
   */
  private initializeDefaultKpis(): void {
    // Engagement KPIs
    this.registerKpi({
      id: 'daily_active_users',
      name: 'Daily Active Users',
      description: 'Number of unique users interacting with bots',
      category: 'engagement',
      unit: 'users',
      aggregationType: 'count',
      thresholds: { warning: 100, critical: 50 },
    });

    this.registerKpi({
      id: 'messages_per_user',
      name: 'Messages Per User',
      description: 'Average messages per user per day',
      category: 'engagement',
      unit: 'messages',
      aggregationType: 'avg',
    });

    this.registerKpi({
      id: 'user_engagement_rate',
      name: 'User Engagement Rate',
      description: 'Percentage of users who actively engage with bots',
      category: 'engagement',
      unit: 'percent',
      aggregationType: 'percentile',
      targetValue: 50,
      thresholds: { warning: 30, critical: 20 },
    });

    // Performance KPIs
    this.registerKpi({
      id: 'average_response_time',
      name: 'Average Response Time',
      description: 'Average time to respond to user messages',
      category: 'performance',
      unit: 'ms',
      aggregationType: 'avg',
      targetValue: 1000,
      thresholds: { warning: 2000, critical: 5000 },
    });

    this.registerKpi({
      id: 'request_success_rate',
      name: 'Request Success Rate',
      description: 'Percentage of successful LLM requests',
      category: 'performance',
      unit: 'percent',
      aggregationType: 'percentile',
      targetValue: 99,
      thresholds: { warning: 95, critical: 90 },
    });

    this.registerKpi({
      id: 'llm_availability',
      name: 'LLM Provider Availability',
      description: 'Availability percentage of LLM providers',
      category: 'performance',
      unit: 'percent',
      aggregationType: 'percentile',
      targetValue: 99.9,
      thresholds: { warning: 99, critical: 95 },
    });

    // Growth KPIs
    this.registerKpi({
      id: 'new_users_daily',
      name: 'New Users (Daily)',
      description: 'Number of new users interacting with bots',
      category: 'growth',
      unit: 'users',
      aggregationType: 'sum',
    });

    this.registerKpi({
      id: 'total_interactions',
      name: 'Total Interactions',
      description: 'Total number of bot interactions',
      category: 'growth',
      unit: 'interactions',
      aggregationType: 'sum',
    });

    // Revenue KPIs
    this.registerKpi({
      id: 'llm_cost_per_request',
      name: 'LLM Cost Per Request',
      description: 'Average cost per LLM request in USD',
      category: 'revenue',
      unit: 'usd',
      aggregationType: 'avg',
      targetValue: 0.01,
      thresholds: { warning: 0.05, critical: 0.1 },
    });

    this.registerKpi({
      id: 'daily_llm_spend',
      name: 'Daily LLM Spend',
      description: 'Total daily spend on LLM providers',
      category: 'revenue',
      unit: 'usd',
      aggregationType: 'sum',
      thresholds: { warning: 100, critical: 500 },
    });

    // Retention KPIs
    this.registerKpi({
      id: 'user_retention_7d',
      name: '7-Day User Retention',
      description: 'Percentage of users returning within 7 days',
      category: 'retention',
      unit: 'percent',
      aggregationType: 'percentile',
      targetValue: 40,
    });

    this.registerKpi({
      id: 'churn_rate',
      name: 'Churn Rate',
      description: 'Percentage of users who stopped using bots',
      category: 'retention',
      unit: 'percent',
      aggregationType: 'percentile',
      thresholds: { warning: 20, critical: 30 },
    });
  }

  /**
   * Register a new KPI
   */
  registerKpi(kpi: Partial<KpiDefinition> & { id: string; name: string; category: KpiCategory; unit: string; aggregationType: KpiDefinition['aggregationType'] }): void {
    this.kpis.set(kpi.id, {
      id: kpi.id,
      name: kpi.name,
      description: kpi.description || '',
      category: kpi.category,
      unit: kpi.unit,
      aggregationType: kpi.aggregationType,
      dataPoints: kpi.dataPoints || [],
      currentValue: kpi.currentValue || 0,
      previousValue: kpi.previousValue || 0,
      targetValue: kpi.targetValue,
      thresholds: kpi.thresholds,
    });
    this.emit('kpiRegistered', kpi);
  }

  /**
   * Record a KPI value
   */
  recordKpiValue(kpiId: string, value: number, metadata?: Record<string, string | number | boolean>): void {
    const kpi = this.kpis.get(kpiId);
    if (!kpi) return;

    const dataPoint: KpiDataPoint = {
      timestamp: Date.now(),
      value,
      metadata,
    };

    kpi.previousValue = kpi.currentValue;
    kpi.currentValue = value;
    kpi.dataPoints.push(dataPoint);

    // Clean old data points
    const cutoff = Date.now() - this.dataRetentionMs;
    kpi.dataPoints = kpi.dataPoints.filter(dp => dp.timestamp > cutoff);

    this.emit('kpiValueRecorded', { kpiId, value, dataPoint });
  }

  /**
   * Increment a KPI value (for counters)
   */
  incrementKpi(kpiId: string, amount: number = 1): void {
    const kpi = this.kpis.get(kpiId);
    if (!kpi) return;

    this.recordKpiValue(kpiId, kpi.currentValue + amount);
  }

  /**
   * Get KPI by ID
   */
  getKpi(kpiId: string): KpiDefinition | undefined {
    return this.kpis.get(kpiId);
  }

  /**
   * Get all KPIs
   */
  getAllKpis(): KpiDefinition[] {
    return Array.from(this.kpis.values());
  }

  /**
   * Get KPIs by category
   */
  getKpisByCategory(category: KpiCategory): KpiDefinition[] {
    return Array.from(this.kpis.values()).filter(kpi => kpi.category === category);
  }

  /**
   * Get KPI summary
   */
  getKpiSummary(): {
    totalKpis: number;
    byCategory: Record<KpiCategory, number>;
    atWarning: string[];
    atCritical: string[];
    totalDailySpend: number;
  } {
    const byCategory: Record<KpiCategory, number> = {
      engagement: 0,
      performance: 0,
      revenue: 0,
      growth: 0,
      retention: 0,
      custom: 0,
    };
    const atWarning: string[] = [];
    const atCritical: string[] = [];
    let totalDailySpend = 0;

    for (const kpi of this.kpis.values()) {
      byCategory[kpi.category]++;

      if (kpi.thresholds) {
        if (kpi.thresholds.critical && kpi.currentValue >= kpi.thresholds.critical) {
          atCritical.push(kpi.id);
        } else if (kpi.thresholds.warning && kpi.currentValue >= kpi.thresholds.warning) {
          atWarning.push(kpi.id);
        }
      }

      if (kpi.id === 'daily_llm_spend') {
        totalDailySpend = kpi.currentValue;
      }
    }

    return {
      totalKpis: this.kpis.size,
      byCategory,
      atWarning,
      atCritical,
      totalDailySpend,
    };
  }

  /**
   * Get KPI dashboard data
   */
  getKpiDashboard(): {
    kpis: KpiDefinition[];
    summary: ReturnType<typeof this.getKpiSummary>;
    timeRange: { start: number; end: number };
  } {
    return {
      kpis: this.getAllKpis(),
      summary: this.getKpiSummary(),
      timeRange: {
        start: Date.now() - this.dataRetentionMs,
        end: Date.now(),
      },
    };
  }

  /**
   * Calculate aggregated value for a time range
   */
  calculateAggregatedValue(kpiId: string, startTime: number, endTime: number): number {
    const kpi = this.kpis.get(kpiId);
    if (!kpi) return 0;

    const relevantPoints = kpi.dataPoints.filter(
      dp => dp.timestamp >= startTime && dp.timestamp <= endTime
    );

    if (relevantPoints.length === 0) return 0;

    switch (kpi.aggregationType) {
      case 'sum':
        return relevantPoints.reduce((sum, dp) => sum + dp.value, 0);
      case 'avg':
        return relevantPoints.reduce((sum, dp) => sum + dp.value, 0) / relevantPoints.length;
      case 'min':
        return Math.min(...relevantPoints.map(dp => dp.value));
      case 'max':
        return Math.max(...relevantPoints.map(dp => dp.value));
      case 'count':
        return relevantPoints.length;
      case 'percentile':
        return relevantPoints.reduce((sum, dp) => sum + dp.value, 0) / relevantPoints.length;
      default:
        return 0;
    }
  }

  /**
   * Get KPI trend (percentage change from previous period)
   */
  getKpiTrend(kpiId: string): number {
    const kpi = this.kpis.get(kpiId);
    if (!kpi || kpi.previousValue === 0) return 0;

    return ((kpi.currentValue - kpi.previousValue) / kpi.previousValue) * 100;
  }

  /**
   * Set data retention period
   */
  setDataRetention(ms: number): void {
    this.dataRetentionMs = ms;
  }

  /**
   * Reset a specific KPI
   */
  resetKpi(kpiId: string): void {
    const kpi = this.kpis.get(kpiId);
    if (kpi) {
      kpi.dataPoints = [];
      kpi.currentValue = 0;
      kpi.previousValue = 0;
      this.emit('kpiReset', kpiId);
    }
  }

  /**
   * Reset all KPIs
   */
  resetAllKpis(): void {
    for (const kpi of this.kpis.values()) {
      kpi.dataPoints = [];
      kpi.currentValue = 0;
      kpi.previousValue = 0;
    }
    this.emit('allKpisReset');
  }

  /**
   * Export KPI data
   */
  exportKpiData(kpiId?: string): object {
    if (kpiId) {
      const kpi = this.kpis.get(kpiId);
      return kpi ? { [kpiId]: kpi } : {};
    }

    const data: Record<string, KpiDefinition> = {};
    for (const [id, kpi] of this.kpis) {
      data[id] = kpi;
    }
    return data;
  }
}

export default BusinessKpiCollector;
