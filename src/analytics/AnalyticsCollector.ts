import { EventEmitter } from 'events';

export interface AnalyticsEvent {
  id: string;
  timestamp: string;
  type: 'page_view' | 'click' | 'form_submit' | 'api_call' | 'error' | 'performance' | 'user_action';
  category: string;
  action: string;
  label?: string;
  value?: number;
  userId?: string;
  sessionId: string;
  userAgent?: string;
  referrer?: string;
  url?: string;
  metadata?: Record<string, any>;
}

export interface UserSession {
  id: string;
  userId?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  pageViews: number;
  events: AnalyticsEvent[];
  userAgent?: string;
  ipAddress?: string;
  location?: {
    country?: string;
    city?: string;
  };
  device?: {
    type?: 'desktop' | 'mobile' | 'tablet';
    os?: string;
    browser?: string;
  };
}

export interface AnalyticsSummary {
  totalEvents: number;
  totalSessions: number;
  averageSessionDuration: number;
  bounceRate: number;
  topPages: Array<{ path: string; views: number }>;
  topEvents: Array<{ type: string; count: number }>;
  userActivity: {
    newUsers: number;
    returningUsers: number;
    activeUsers: number;
  };
  performance: {
    averagePageLoad: number;
    averageApiResponse: number;
    errorRate: number;
  };
}

export class AnalyticsCollector extends EventEmitter {
  private sessions: Map<string, UserSession> = new Map();
  private events: AnalyticsEvent[] = [];
  private maxEvents: number;
  private maxSessions: number;
  private sessionTimeout: number;
  private isAnonymous: boolean;

  constructor(
    maxEvents: number = 10000,
    maxSessions: number = 1000,
    sessionTimeout: number = 1800000, // 30 minutes
    isAnonymous: boolean = true
  ) {
    super();
    this.maxEvents = maxEvents;
    this.maxSessions = maxSessions;
    this.sessionTimeout = sessionTimeout;
    this.isAnonymous = isAnonymous;

    // Start session cleanup
    this.startSessionCleanup();
  }

  public async trackEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp' | 'sessionId'>): Promise<void> {
    const sessionId = await this.getOrCreateSessionId(event.userId);

    const analyticsEvent: AnalyticsEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      sessionId,
      ...event
    };

    // Store event
    this.events.push(analyticsEvent);

    // Update session
    const session = this.sessions.get(sessionId);
    if (session) {
      session.events.push(analyticsEvent);

      // Update session duration
      session.endTime = analyticsEvent.timestamp;
      session.duration = new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
    }

    // Clean up old events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Emit event
    this.emit('eventTracked', analyticsEvent);

    // Process real-time analytics
    this.processRealTimeAnalytics(analyticsEvent);
  }

  public async trackPageView(
    path: string,
    userId?: string,
    referrer?: string,
    userAgent?: string
  ): Promise<void> {
    await this.trackEvent({
      type: 'page_view',
      category: 'navigation',
      action: 'page_view',
      label: path,
      userId,
      url: path,
      referrer,
      userAgent,
      metadata: {
        loadTime: performance.now() - (window as any).performance.timing.navigationStart
      }
    });
  }

  public async trackClick(
    element: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent({
      type: 'click',
      category: 'interaction',
      action: 'click',
      label: element,
      userId,
      metadata
    });
  }

  public async trackFormSubmit(
    formName: string,
    success: boolean,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent({
      type: 'form_submit',
      category: 'form',
      action: success ? 'submit_success' : 'submit_error',
      label: formName,
      value: success ? 1 : 0,
      userId,
      metadata
    });
  }

  public async trackApiCall(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    userId?: string
  ): Promise<void> {
    await this.trackEvent({
      type: 'api_call',
      category: 'api',
      action: `${method}_${statusCode}`,
      label: endpoint,
      value: responseTime,
      userId,
      metadata: {
        method,
        statusCode,
        responseTime
      }
    });
  }

  public async trackError(
    errorType: string,
    errorMessage: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent({
      type: 'error',
      category: 'error',
      action: errorType,
      label: errorMessage,
      userId,
      metadata
    });
  }

  public async trackPerformance(
    metricName: string,
    value: number,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent({
      type: 'performance',
      category: 'performance',
      action: metricName,
      value,
      userId,
      metadata
    });
  }

  private async getOrCreateSessionId(userId?: string): Promise<string> {
    // Try to find existing session
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId && !session.endTime) {
        // Check if session is still active
        const now = new Date().getTime();
        const sessionAge = now - new Date(session.startTime).getTime();

        if (sessionAge < this.sessionTimeout) {
          return sessionId;
        } else {
          // End expired session
          session.endTime = new Date().toISOString();
          session.duration = sessionAge;
        }
      }
    }

    // Create new session
    const sessionId = this.generateSessionId();
    const session: UserSession = {
      id: sessionId,
      userId: this.isAnonymous ? undefined : userId,
      startTime: new Date().toISOString(),
      pageViews: 0,
      events: []
    };

    // Detect device and browser info
    if (typeof window !== 'undefined') {
      session.userAgent = navigator.userAgent;
      session.device = this.detectDevice();
    }

    this.sessions.set(sessionId, session);

    // Clean up old sessions
    if (this.sessions.size > this.maxSessions) {
      const oldestSession = Array.from(this.sessions.values())
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

      this.sessions.delete(oldestSession.id);
    }

    this.emit('sessionCreated', session);

    return sessionId;
  }

  private detectDevice(): UserSession['device'] {
    if (typeof window === 'undefined') {
      return {};
    }

    const userAgent = navigator.userAgent;
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    let os = '';
    let browser = '';

    // Device type detection
    if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) {
      deviceType = /iPad/i.test(userAgent) ? 'tablet' : 'mobile';
    }

    // OS detection
    if (/Windows/i.test(userAgent)) os = 'Windows';
    else if (/Mac/i.test(userAgent)) os = 'macOS';
    else if (/Linux/i.test(userAgent)) os = 'Linux';
    else if (/Android/i.test(userAgent)) os = 'Android';
    else if (/iOS|iPhone|iPad/i.test(userAgent)) os = 'iOS';

    // Browser detection
    if (/Chrome/i.test(userAgent)) browser = 'Chrome';
    else if (/Firefox/i.test(userAgent)) browser = 'Firefox';
    else if (/Safari/i.test(userAgent)) browser = 'Safari';
    else if (/Edge/i.test(userAgent)) browser = 'Edge';
    else if (/Opera/i.test(userAgent)) browser = 'Opera';

    return {
      type: deviceType,
      os,
      browser
    };
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private processRealTimeAnalytics(event: AnalyticsEvent): void {
    // Process page views
    if (event.type === 'page_view') {
      const session = this.sessions.get(event.sessionId);
      if (session) {
        session.pageViews++;
      }
    }

    // Track error rates
    if (event.type === 'error') {
      this.emit('errorDetected', event);
    }

    // Track performance issues
    if (event.type === 'performance') {
      if (event.value && event.value > 3000) { // 3 seconds threshold
        this.emit('performanceIssue', event);
      }
    }

    // Track API response times
    if (event.type === 'api_call' && event.value) {
      if (event.value > 5000) { // 5 seconds threshold
        this.emit('slowApiResponse', event);
      }
    }
  }

  private startSessionCleanup(): void {
    // Clean up expired sessions every 5 minutes
    setInterval(() => {
      const now = new Date().getTime();
      let cleanedCount = 0;

      for (const [sessionId, session] of this.sessions.entries()) {
        if (!session.endTime) {
          const sessionAge = now - new Date(session.startTime).getTime();

          if (sessionAge > this.sessionTimeout) {
            session.endTime = new Date().toISOString();
            session.duration = sessionAge;
            this.emit('sessionEnded', session);
            cleanedCount++;
          }
        }
      }

      if (cleanedCount > 0) {
        console.log(`📊 Cleaned up ${cleanedCount} expired sessions`);
      }
    }, 300000); // 5 minutes
  }

  public getEvents(filter?: {
    type?: AnalyticsEvent['type'];
    category?: string;
    userId?: string;
    since?: string;
    until?: string;
  }): AnalyticsEvent[] {
    let events = [...this.events];

    if (filter) {
      if (filter.type) {
        events = events.filter(e => e.type === filter.type);
      }
      if (filter.category) {
        events = events.filter(e => e.category === filter.category);
      }
      if (filter.userId) {
        events = events.filter(e => e.userId === filter.userId);
      }
      if (filter.since) {
        events = events.filter(e => e.timestamp >= filter.since);
      }
      if (filter.until) {
        events = events.filter(e => e.timestamp <= filter.until);
      }
    }

    return events;
  }

  public getSessions(filter?: {
    userId?: string;
    active?: boolean;
    since?: string;
    until?: string;
  }): UserSession[] {
    let sessions = Array.from(this.sessions.values());

    if (filter) {
      if (filter.userId) {
        sessions = sessions.filter(s => s.userId === filter.userId);
      }
      if (filter.active !== undefined) {
        sessions = sessions.filter(s => (filter.active && !s.endTime) || (!filter.active && s.endTime));
      }
      if (filter.since) {
        sessions = sessions.filter(s => s.startTime >= filter.since);
      }
      if (filter.until) {
        sessions = sessions.filter(s => s.startTime <= filter.until);
      }
    }

    return sessions;
  }

  public async getAnalyticsSummary(timeRange?: {
    since?: string;
    until?: string;
  }): Promise<AnalyticsSummary> {
    const since = timeRange?.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const until = timeRange?.until || new Date().toISOString();

    const events = this.getEvents({ since, until });
    const sessions = this.getSessions({ since, until });

    // Calculate total events and sessions
    const totalEvents = events.length;
    const totalSessions = sessions.length;

    // Calculate average session duration
    const completedSessions = sessions.filter(s => s.duration);
    const averageSessionDuration = completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / completedSessions.length
      : 0;

    // Calculate bounce rate (sessions with only one page view)
    const singlePageSessions = sessions.filter(s => s.pageViews === 1);
    const bounceRate = sessions.length > 0 ? (singlePageSessions.length / sessions.length) * 100 : 0;

    // Get top pages
    const pageViews = events
      .filter(e => e.type === 'page_view' && e.label)
      .reduce((acc, e) => {
        const path = e.label || '/';
        acc[path] = (acc[path] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const topPages = Object.entries(pageViews)
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Get top events by type
    const eventTypes = events
      .reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const topEvents = Object.entries(eventTypes)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate user activity
    const userIds = new Set(events.map(e => e.userId).filter(Boolean));
    const userSessions = sessions.filter(s => s.userId);
    const uniqueUsers = new Set(userSessions.map(s => s.userId));

    const userActivity = {
      newUsers: 0, // Would need to compare with previous period
      returningUsers: uniqueUsers.size,
      activeUsers: userIds.size
    };

    // Calculate performance metrics
    const performanceEvents = events.filter(e => e.type === 'performance');
    const apiEvents = events.filter(e => e.type === 'api_call');
    const errorEvents = events.filter(e => e.type === 'error');

    const averagePageLoad = performanceEvents
      .filter(e => e.action === 'page_load' && e.value)
      .reduce((sum, e) => sum + (e.value || 0), 0) / Math.max(1, performanceEvents.length);

    const averageApiResponse = apiEvents
      .filter(e => e.value)
      .reduce((sum, e) => sum + e.value, 0) / Math.max(1, apiEvents.length);

    const errorRate = events.length > 0 ? (errorEvents.length / events.length) * 100 : 0;

    return {
      totalEvents,
      totalSessions,
      averageSessionDuration,
      bounceRate,
      topPages,
      topEvents,
      userActivity,
      performance: {
        averagePageLoad,
        averageApiResponse,
        errorRate
      }
    };
  }

  public async exportAnalyticsData(): Promise<string> {
    const analyticsData = {
      timestamp: new Date().toISOString(),
      events: this.events,
      sessions: Array.from(this.sessions.values()),
      summary: await this.getAnalyticsSummary()
    };

    return JSON.stringify(analyticsData, null, 2);
  }

  public resetAnalytics(): void {
    this.events = [];
    this.sessions.clear();
    console.log('📊 Analytics data reset');
  }

  public getEventStream(eventTypes?: AnalyticsEvent['type'][]): EventEmitter {
    const stream = new EventEmitter();

    const eventHandler = (event: AnalyticsEvent) => {
      if (!eventTypes || eventTypes.includes(event.type)) {
        stream.emit('event', event);
      }
    };

    this.on('eventTracked', eventHandler);

    // Return a way to stop the stream
    stream.stop = () => {
      this.off('eventTracked', eventHandler);
    };

    return stream;
  }
}