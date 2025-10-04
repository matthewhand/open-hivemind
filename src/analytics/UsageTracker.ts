import { AnalyticsCollector, AnalyticsEvent } from './AnalyticsCollector';

export interface UsageMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  totalPageViews: number;
  averageSessionDuration: number;
  bounceRate: number;
  topPages: Array<{ path: string; views: number; percentage: number }>;
  userRetention: {
    day1: number;
    day7: number;
    day30: number;
  };
  featureUsage: Record<string, {
    users: number;
    sessions: number;
    frequency: number;
  }>;
  performanceMetrics: {
    averageLoadTime: number;
    errorRate: number;
    apiResponseTime: number;
  };
}

export interface UserActivity {
  userId: string;
  firstSeen: string;
  lastSeen: string;
  totalSessions: number;
  totalPageViews: number;
  averageSessionDuration: number;
  preferredPages: string[];
  featuresUsed: string[];
  isReturning: boolean;
}

export class UsageTracker {
  private analytics: AnalyticsCollector;
  private userActivities: Map<string, UserActivity> = new Map();
  private dailyMetrics: Map<string, UsageMetrics> = new Map();
  private maxUserActivities: number;

  constructor(analytics: AnalyticsCollector, maxUserActivities: number = 10000) {
    this.analytics = analytics;
    this.maxUserActivities = maxUserActivities;

    // Set up event listeners
    this.setupEventListeners();

    // Start periodic metrics calculation
    this.startMetricsCalculation();
  }

  private setupEventListeners(): void {
    this.analytics.on('eventTracked', (event: AnalyticsEvent) => {
      this.processEvent(event);
    });
  }

  private async processEvent(event: AnalyticsEvent): Promise<void> {
    // Update user activity
    if (event.userId) {
      await this.updateUserActivity(event);
    }

    // Track feature usage
    if (event.type === 'user_action' || event.category === 'feature') {
      this.trackFeatureUsage(event);
    }
  }

  private async updateUserActivity(event: AnalyticsEvent): Promise<void> {
    const userId = event.userId!;

    let userActivity = this.userActivities.get(userId);

    if (!userActivity) {
      userActivity = {
        userId,
        firstSeen: event.timestamp,
        lastSeen: event.timestamp,
        totalSessions: 0,
        totalPageViews: 0,
        averageSessionDuration: 0,
        preferredPages: [],
        featuresUsed: [],
        isReturning: false
      };

      this.userActivities.set(userId, userActivity);
    }

    // Update last seen
    userActivity.lastSeen = event.timestamp;

    // Update page views
    if (event.type === 'page_view' && event.label) {
      userActivity.totalPageViews++;

      // Update preferred pages
      if (!userActivity.preferredPages.includes(event.label)) {
        userActivity.preferredPages.push(event.label);
      }

      // Keep only top 10 preferred pages
      if (userActivity.preferredPages.length > 10) {
        userActivity.preferredPages = userActivity.preferredPages.slice(0, 10);
      }
    }

    // Update sessions
    const session = this.analytics.getSessions({ userId, active: true })[0];
    if (session) {
      const previousSessions = this.analytics.getSessions({ userId, active: false });
      userActivity.totalSessions = previousSessions.length + 1;

      // Calculate average session duration
      const completedSessions = [session, ...previousSessions].filter(s => s.duration);
      if (completedSessions.length > 0) {
        userActivity.averageSessionDuration = completedSessions
          .reduce((sum, s) => sum + (s.duration || 0), 0) / completedSessions.length;
      }
    }

    // Update features used
    if (event.category === 'feature' || event.action.includes('feature')) {
      const featureName = event.action || event.category;
      if (!userActivity.featuresUsed.includes(featureName)) {
        userActivity.featuresUsed.push(featureName);
      }
    }

    // Clean up old user activities
    if (this.userActivities.size > this.maxUserActivities) {
      const oldestUser = Array.from(this.userActivities.values())
        .sort((a, b) => new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime())[0];

      this.userActivities.delete(oldestUser.userId);
    }
  }

  private trackFeatureUsage(event: AnalyticsEvent): void {
    const featureName = event.action || event.category;

    // Track feature usage in metrics
    const today = new Date().toISOString().split('T')[0];
    let metrics = this.dailyMetrics.get(today);

    if (!metrics) {
      metrics = this.initializeMetrics();
      this.dailyMetrics.set(today, metrics);
    }

    if (!metrics.featureUsage[featureName]) {
      metrics.featureUsage[featureName] = {
        users: 0,
        sessions: 0,
        frequency: 0
      };
    }

    metrics.featureUsage[featureName].frequency++;

    if (event.userId && !metrics.featureUsage[featureName].users) {
      metrics.featureUsage[featureName].users = 0;
    }
    if (event.userId) {
      metrics.featureUsage[featureName].users++;
    }

    metrics.featureUsage[featureName].sessions++;
  }

  private initializeMetrics(): UsageMetrics {
    return {
      dailyActiveUsers: 0,
      weeklyActiveUsers: 0,
      monthlyActiveUsers: 0,
      totalPageViews: 0,
      averageSessionDuration: 0,
      bounceRate: 0,
      topPages: [],
      userRetention: {
        day1: 0,
        day7: 0,
        day30: 0
      },
      featureUsage: {},
      performanceMetrics: {
        averageLoadTime: 0,
        errorRate: 0,
        apiResponseTime: 0
      }
    };
  }

  private startMetricsCalculation(): void {
    // Calculate metrics every hour
    setInterval(() => {
      this.calculateDailyMetrics();
    }, 60 * 60 * 1000);

    // Calculate metrics at midnight
    this.scheduleMidnightCalculation();
  }

  private scheduleMidnightCalculation(): void {
    const now = new Date();
    const night = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1, // Tomorrow
      0, 0, 0, 0
    );
    const msToMidnight = night.getTime() - now.getTime();

    setTimeout(() => {
      this.calculateDailyMetrics();
      this.scheduleMidnightCalculation();
    }, msToMidnight);
  }

  private async calculateDailyMetrics(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const metrics = this.initializeMetrics();

    try {
      // Calculate daily active users
      const todayEvents = this.analytics.getEvents({
        since: `${today}T00:00:00.000Z`,
        until: `${today}T23:59:59.999Z`
      });

      const uniqueUsers = new Set(todayEvents.map(e => e.userId).filter(Boolean));
      metrics.dailyActiveUsers = uniqueUsers.size;

      // Calculate weekly active users
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const weeklyEvents = this.analytics.getEvents({ since: weekAgo });
      const weeklyUsers = new Set(weeklyEvents.map(e => e.userId).filter(Boolean));
      metrics.weeklyActiveUsers = weeklyUsers.size;

      // Calculate monthly active users
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const monthlyEvents = this.analytics.getEvents({ since: monthAgo });
      const monthlyUsers = new Set(monthlyEvents.map(e => e.userId).filter(Boolean));
      metrics.monthlyActiveUsers = monthlyUsers.size;

      // Calculate page views and session metrics
      const todaySessions = this.analytics.getSessions({
        since: `${today}T00:00:00.000Z`,
        until: `${today}T23:59:59.999Z`
      });

      metrics.totalPageViews = todaySessions.reduce((sum, s) => sum + s.pageViews, 0);

      const completedSessions = todaySessions.filter(s => s.duration);
      metrics.averageSessionDuration = completedSessions.length > 0
        ? completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / completedSessions.length
        : 0;

      // Calculate bounce rate
      const singlePageSessions = todaySessions.filter(s => s.pageViews === 1);
      metrics.bounceRate = todaySessions.length > 0
        ? (singlePageSessions.length / todaySessions.length) * 100
        : 0;

      // Calculate top pages
      const pageViews = todayEvents
        .filter(e => e.type === 'page_view' && e.label)
        .reduce((acc, e) => {
          const path = e.label || '/';
          acc[path] = (acc[path] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const totalPageViews = Object.values(pageViews).reduce((sum, count) => sum + count, 0);
      metrics.topPages = Object.entries(pageViews)
        .map(([path, views]) => ({
          path,
          views,
          percentage: totalPageViews > 0 ? (views / totalPageViews) * 100 : 0
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      // Calculate user retention
      metrics.userRetention = this.calculateUserRetention();

      // Calculate performance metrics
      const performanceEvents = todayEvents.filter(e => e.type === 'performance');
      const apiEvents = todayEvents.filter(e => e.type === 'api_call');
      const errorEvents = todayEvents.filter(e => e.type === 'error');

      metrics.performanceMetrics.averageLoadTime = performanceEvents
        .filter(e => e.action === 'page_load' && e.value !== undefined)
        .reduce((sum, e) => sum + e.value!, 0) / Math.max(1, performanceEvents.length);

      metrics.performanceMetrics.apiResponseTime = apiEvents
        .filter(e => e.value !== undefined)
        .reduce((sum, e) => sum + e.value!, 0) / Math.max(1, apiEvents.length);

      metrics.performanceMetrics.errorRate = todayEvents.length > 0
        ? (errorEvents.length / todayEvents.length) * 100
        : 0;

      // Store metrics
      this.dailyMetrics.set(today, metrics);

      // Clean up old metrics (keep last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      for (const [date, _] of this.dailyMetrics.entries()) {
        if (date < thirtyDaysAgo) {
          this.dailyMetrics.delete(date);
        }
      }

      console.log(`📊 Daily metrics calculated for ${today}`);
    } catch (error) {
      console.error('Error calculating daily metrics:', error);
    }
  }

  private calculateUserRetention(): UsageMetrics['userRetention'] {
    const now = new Date();
    const day1Ago = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
    const day7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const day30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get users who were active 30 days ago
    const oldUsers = new Set(
      this.analytics.getEvents({ since: day30Ago, until: new Date(day30Ago).toISOString() })
        .map(e => e.userId)
        .filter(Boolean)
    );

    if (oldUsers.size === 0) {
      return { day1: 0, day7: 0, day30: 0 };
    }

    // Check how many returned
    const day1Return = new Set(
      this.analytics.getEvents({ since: day1Ago })
        .map(e => e.userId)
        .filter(Boolean)
    );

    const day7Return = new Set(
      this.analytics.getEvents({ since: day7Ago })
        .map(e => e.userId)
        .filter(Boolean)
    );

    const day30Return = new Set(
      this.analytics.getEvents({ since: day30Ago })
        .map(e => e.userId)
        .filter(Boolean)
    );

    return {
      day1: oldUsers.size > 0 ? (day1Return.size / oldUsers.size) * 100 : 0,
      day7: oldUsers.size > 0 ? (day7Return.size / oldUsers.size) * 100 : 0,
      day30: oldUsers.size > 0 ? (day30Return.size / oldUsers.size) * 100 : 0
    };
  }

  public async getUsageMetrics(dateRange?: {
    since?: string;
    until?: string;
  }): Promise<UsageMetrics> {
    const since = dateRange?.since || new Date().toISOString().split('T')[0];
    const until = dateRange?.until || new Date().toISOString();

    // If we have pre-calculated metrics for this range, use them
    const today = new Date().toISOString().split('T')[0];
    if (since === today && until === `${today}T23:59:59.999Z`) {
      const todayMetrics = this.dailyMetrics.get(today);
      if (todayMetrics) {
        return todayMetrics;
      }
    }

    // Otherwise calculate on demand
    return this.calculateMetricsForRange(since, until);
  }

  private async calculateMetricsForRange(since: string, until: string): Promise<UsageMetrics> {
    const metrics = this.initializeMetrics();

    try {
      const events = this.analytics.getEvents({ since, until });
      const sessions = this.analytics.getSessions({ since, until });

      // Calculate active users
      const uniqueUsers = new Set(events.map(e => e.userId).filter(Boolean));
      metrics.dailyActiveUsers = uniqueUsers.size;

      // Calculate page views and session metrics
      metrics.totalPageViews = sessions.reduce((sum, s) => sum + s.pageViews, 0);

      const completedSessions = sessions.filter(s => s.duration);
      metrics.averageSessionDuration = completedSessions.length > 0
        ? completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / completedSessions.length
        : 0;

      // Calculate bounce rate
      const singlePageSessions = sessions.filter(s => s.pageViews === 1);
      metrics.bounceRate = sessions.length > 0
        ? (singlePageSessions.length / sessions.length) * 100
        : 0;

      // Calculate top pages
      const pageViews = events
        .filter(e => e.type === 'page_view' && e.label)
        .reduce((acc, e) => {
          const path = e.label || '/';
          acc[path] = (acc[path] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const totalPageViews = Object.values(pageViews).reduce((sum, count) => sum + count, 0);
      metrics.topPages = Object.entries(pageViews)
        .map(([path, views]) => ({
          path,
          views,
          percentage: totalPageViews > 0 ? (views / totalPageViews) * 100 : 0
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      // Calculate user retention
      metrics.userRetention = this.calculateUserRetention();

      // Calculate performance metrics
      const performanceEvents = events.filter(e => e.type === 'performance');
      const apiEvents = events.filter(e => e.type === 'api_call');
      const errorEvents = events.filter(e => e.type === 'error');

      metrics.performanceMetrics.averageLoadTime = performanceEvents
        .filter(e => e.action === 'page_load' && e.value !== undefined)
        .reduce((sum, e) => sum + e.value!, 0) / Math.max(1, performanceEvents.length);

      metrics.performanceMetrics.apiResponseTime = apiEvents
        .filter(e => e.value !== undefined)
        .reduce((sum, e) => sum + e.value!, 0) / Math.max(1, apiEvents.length);

      metrics.performanceMetrics.errorRate = events.length > 0
        ? (errorEvents.length / events.length) * 100
        : 0;

      return metrics;
    } catch (error) {
      console.error('Error calculating usage metrics:', error);
      return metrics;
    }
  }

  public getUserActivities(filter?: {
    userId?: string;
    active?: boolean;
    since?: string;
  }): UserActivity[] {
    let activities = Array.from(this.userActivities.values());

    if (filter) {
      if (filter.userId) {
        activities = activities.filter(a => a.userId === filter.userId);
      }
      if (filter.active !== undefined) {
        const threshold = filter.active ? 7 : 0; // Active if seen in last 7 days
        activities = activities.filter(a => {
          const lastSeen = new Date(a.lastSeen);
          const cutoff = new Date(Date.now() - threshold * 24 * 60 * 60 * 1000);
          return filter.active ? lastSeen >= cutoff : lastSeen < cutoff;
        });
      }
      if (filter.since) {
        activities = activities.filter(a => a.firstSeen >= filter.since!);
      }
    }

    return activities.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
  }

  public async getFeatureUsageReport(): Promise<{
    features: Array<{
      name: string;
      users: number;
      sessions: number;
      frequency: number;
      adoption: number;
    }>;
    mostPopular: string;
    leastPopular: string;
  }> {
    const features = new Map<string, {
      users: Set<string>;
      sessions: Set<string>;
      frequency: number;
    }>();

    // Aggregate feature usage from all metrics
    for (const metrics of this.dailyMetrics.values()) {
      for (const [featureName, usage] of Object.entries(metrics.featureUsage)) {
        if (!features.has(featureName)) {
          features.set(featureName, {
            users: new Set(),
            sessions: new Set(),
            frequency: 0
          });
        }

        const feature = features.get(featureName)!;
        feature.frequency += usage.frequency;

        // Add users (this is approximate since we don't track individual users per feature in daily metrics)
        // In a real implementation, you'd want to track this more precisely
      }
    }

    // Convert to array format
    const featureArray = Array.from(features.entries()).map(([name, data]) => ({
      name,
      users: data.users.size,
      sessions: data.sessions.size,
      frequency: data.frequency,
      adoption: 0 // Will be calculated below
    }));

    // Calculate adoption rates
    const totalUsers = this.userActivities.size;
    if (totalUsers > 0) {
      featureArray.forEach(feature => {
        feature.adoption = (feature.users / totalUsers) * 100;
      });
    }

    // Sort by popularity
    featureArray.sort((a, b) => b.frequency - a.frequency);

    return {
      features: featureArray,
      mostPopular: featureArray[0]?.name || 'N/A',
      leastPopular: featureArray[featureArray.length - 1]?.name || 'N/A'
    };
  }

  public async exportUsageData(): Promise<string> {
    const usageData = {
      timestamp: new Date().toISOString(),
      userActivities: Array.from(this.userActivities.values()),
      dailyMetrics: Array.from(this.dailyMetrics.entries()).map(([date, metrics]) => ({ date, metrics })),
      currentMetrics: await this.getUsageMetrics(),
      featureReport: await this.getFeatureUsageReport()
    };

    return JSON.stringify(usageData, null, 2);
  }

  public resetUsageData(): void {
    this.userActivities.clear();
    this.dailyMetrics.clear();
    console.log('📊 Usage data reset');
  }
}