import React, { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectUser } from '../store/slices/authSlice';
import { AnimatedBox } from '../animations/AnimationComponents';
import {
  SparklesIcon,
  UserIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  ArrowPathIcon,
  ClockIcon,
  TagIcon,
  LightBulbIcon,
  ChartPieIcon,
  AdjustmentsHorizontalIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface UserBehavior {
  userId: string;
  sessionId: string;
  timestamp: Date;
  action: 'view' | 'click' | 'hover' | 'scroll' | 'resize' | 'filter' | 'sort';
  target: string;
  metadata: {
    widgetType?: string;
    duration?: number;
    position?: { x: number; y: number };
    value?: string | number | boolean | Record<string, unknown>;
    previousValue?: string | number | boolean | Record<string, unknown>;
  };
  context: {
    page: string;
    viewport: { width: number; height: number };
    device: 'desktop' | 'tablet' | 'mobile';
    timezone: string;
  };
}

interface BehaviorPattern {
  id: string;
  name: string;
  description: string;
  frequency: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  segments: string[];
  recommendedWidgets: string[];
  priority: number;
}

interface DashboardRecommendation {
  id: string;
  type: 'widget' | 'layout' | 'theme' | 'settings';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  reasoning: string;
  preview?: Record<string, unknown>;
  userFeedback?: 'liked' | 'disliked' | null;
}

interface UserSegment {
  id: string;
  name: string;
  description: string;
  criteria: {
    behaviorPatterns: string[];
    usageFrequency: 'daily' | 'weekly' | 'monthly';
    featureUsage: string[];
    engagementLevel: 'high' | 'medium' | 'low';
  };
  characteristics: {
    preferredWidgets: string[];
    optimalLayout: string;
    themePreference: string;
    notificationFrequency: number;
  };
  size: number;
  confidence: number;
}

interface AIDashboardConfig {
  enabled: boolean;
  learningRate: number;
  confidenceThreshold: number;
  recommendationFrequency: number;
  behaviorTracking: boolean;
  personalization: boolean;
  predictiveAnalytics: boolean;
  autoOptimization: boolean;
}

interface IntelligentDashboardState {
  behaviorPatterns: BehaviorPattern[];
  recommendations: DashboardRecommendation[];
  userSegments: UserSegment[];
  currentSegment: UserSegment | null;
  personalizedWidgets: string[];
  learningProgress: number;
  lastUpdate: Date;
  userFeedback: Record<string, 'liked' | 'disliked'>;
}

// Mock user behaviors for demonstration
const mockUserBehaviors: UserBehavior[] = [
  {
    userId: 'user-001',
    sessionId: 'session-123',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    action: 'view',
    target: 'performance-widget',
    metadata: { widgetType: 'line-chart', duration: 120 },
    context: { page: 'dashboard', viewport: { width: 1920, height: 1080 }, device: 'desktop', timezone: 'UTC' },
  },
  {
    userId: 'user-001',
    sessionId: 'session-123',
    timestamp: new Date(Date.now() - 3 * 60 * 1000),
    action: 'click',
    target: 'bot-status-widget',
    metadata: { widgetType: 'status-indicator', position: { x: 150, y: 200 } },
    context: { page: 'dashboard', viewport: { width: 1920, height: 1080 }, device: 'desktop', timezone: 'UTC' },
  },
  {
    userId: 'user-001',
    sessionId: 'session-123',
    timestamp: new Date(Date.now() - 1 * 60 * 1000),
    action: 'filter',
    target: 'analytics-widget',
    metadata: { widgetType: 'bar-chart', value: 'last-7-days', previousValue: 'last-24-hours' },
    context: { page: 'dashboard', viewport: { width: 1920, height: 1080 }, device: 'desktop', timezone: 'UTC' },
  },
];

const mockBehaviorPatterns: BehaviorPattern[] = [
  {
    id: 'pattern-001',
    name: 'Performance Monitor',
    description: 'User frequently checks performance metrics and system health',
    frequency: 0.85,
    confidence: 0.92,
    trend: 'increasing',
    segments: ['power-user', 'admin'],
    recommendedWidgets: ['performance-monitor', 'system-health', 'resource-usage'],
    priority: 1,
  },
  {
    id: 'pattern-002',
    name: 'Analytics Explorer',
    description: 'User explores analytics data and trends regularly',
    frequency: 0.73,
    confidence: 0.88,
    trend: 'stable',
    segments: ['analyst', 'manager'],
    recommendedWidgets: ['analytics-dashboard', 'trend-analysis', 'data-visualization'],
    priority: 2,
  },
  {
    id: 'pattern-003',
    name: 'Quick Glancer',
    description: 'User prefers quick overview with minimal interaction',
    frequency: 0.62,
    confidence: 0.79,
    trend: 'decreasing',
    segments: ['casual-user'],
    recommendedWidgets: ['summary-cards', 'quick-stats', 'status-overview'],
    priority: 3,
  },
];

const mockUserSegments: UserSegment[] = [
  {
    id: 'segment-001',
    name: 'Power Users',
    description: 'Highly engaged users who use advanced features frequently',
    criteria: {
      behaviorPatterns: ['pattern-001', 'pattern-002'],
      usageFrequency: 'daily',
      featureUsage: ['advanced-analytics', 'performance-monitoring', 'system-config'],
      engagementLevel: 'high',
    },
    characteristics: {
      preferredWidgets: ['performance-monitor', 'analytics-dashboard', 'system-health'],
      optimalLayout: 'grid-3x3',
      themePreference: 'dark',
      notificationFrequency: 5,
    },
    size: 150,
    confidence: 0.89,
  },
  {
    id: 'segment-002',
    name: 'Casual Users',
    description: 'Users who prefer simple, quick-access information',
    criteria: {
      behaviorPatterns: ['pattern-003'],
      usageFrequency: 'weekly',
      featureUsage: ['basic-stats', 'status-overview'],
      engagementLevel: 'low',
    },
    characteristics: {
      preferredWidgets: ['summary-cards', 'quick-stats', 'status-overview'],
      optimalLayout: 'list-2x2',
      themePreference: 'light',
      notificationFrequency: 1,
    },
    size: 320,
    confidence: 0.76,
  },
];

const defaultConfig: AIDashboardConfig = {
  enabled: true,
  learningRate: 0.1,
  confidenceThreshold: 0.7,
  recommendationFrequency: 30, // minutes
  behaviorTracking: true,
  personalization: true,
  predictiveAnalytics: true,
  autoOptimization: true,
};

export const IntelligentDashboard: React.FC = () => {
  const currentUser = useAppSelector(selectUser);
  const [config, setConfig] = useState<AIDashboardConfig>(defaultConfig);
  const [state, setState] = useState<IntelligentDashboardState>({
    behaviorPatterns: mockBehaviorPatterns,
    recommendations: [],
    userSegments: mockUserSegments,
    currentSegment: null,
    personalizedWidgets: [],
    learningProgress: 0,
    lastUpdate: new Date(),
    userFeedback: {},
  });
  const [isLoading, setIsLoading] = useState(false);
  const [confidenceLevel, setConfidenceLevel] = useState(0.75);

  // Simulate AI learning and recommendation generation
  useEffect(() => {
    if (!config.enabled) return;

    const interval = setInterval(() => {
      simulateLearning();
    }, config.recommendationFrequency * 60 * 1000);

    // Initial learning
    simulateLearning();

    return () => clearInterval(interval);
  }, [config]);

  const simulateLearning = useCallback(() => {
    setIsLoading(true);

    // Simulate ML processing delay
    setTimeout(() => {
      const newRecommendations = generateRecommendations();
      const currentSegment = identifyUserSegment();
      const personalizedWidgets = generatePersonalizedWidgets();
      const learningProgress = calculateLearningProgress();

      setState(prev => ({
        ...prev,
        recommendations: newRecommendations,
        currentSegment,
        personalizedWidgets,
        learningProgress,
        lastUpdate: new Date(),
      }));

      setIsLoading(false);
    }, 1500);
  }, [config]);

  const generateRecommendations = (): DashboardRecommendation[] => {
    const recommendations: DashboardRecommendation[] = [];

    // Generate widget recommendations based on behavior patterns
    state.behaviorPatterns.forEach(pattern => {
      if (pattern.confidence > confidenceLevel) {
        pattern.recommendedWidgets.forEach(widgetId => {
          recommendations.push({
            id: `rec-${widgetId}-${Date.now()}`,
            type: 'widget',
            title: `Add ${widgetId.replace('-', ' ')} Widget`,
            description: `Based on your ${pattern.name.toLowerCase()} pattern`,
            confidence: pattern.confidence,
            impact: pattern.priority === 1 ? 'high' : pattern.priority === 2 ? 'medium' : 'low',
            reasoning: pattern.description,
            preview: { widgetId, type: 'preview' },
          });
        });
      }
    });

    // Generate layout recommendations
    if (state.currentSegment) {
      recommendations.push({
        id: `rec-layout-${Date.now()}`,
        type: 'layout',
        title: 'Optimize Dashboard Layout',
        description: `Switch to ${state.currentSegment.characteristics.optimalLayout} layout`,
        confidence: state.currentSegment.confidence,
        impact: 'medium',
        reasoning: `Based on your ${state.currentSegment.name} usage pattern`,
      });
    }

    // Generate theme recommendations
    if (state.currentSegment) {
      recommendations.push({
        id: `rec-theme-${Date.now()}`,
        type: 'theme',
        title: 'Recommended Theme',
        description: `Switch to ${state.currentSegment.characteristics.themePreference} theme`,
        confidence: state.currentSegment.confidence,
        impact: 'low',
        reasoning: `Optimized for ${state.currentSegment.name} segment`,
      });
    }

    return recommendations.slice(0, 5); // Limit to 5 recommendations
  };

  const identifyUserSegment = (): UserSegment | null => {
    // Simple segment identification based on behavior patterns
    const segment = state.userSegments.find(segment =>
      segment.confidence > confidenceLevel &&
      segment.criteria.behaviorPatterns.some(pattern =>
        state.behaviorPatterns.find(p => p.id === pattern && p.confidence > confidenceLevel)
      )
    );

    return segment || null;
  };

  const generatePersonalizedWidgets = (): string[] => {
    if (!state.currentSegment) return [];

    return state.currentSegment.characteristics.preferredWidgets.filter(widget => {
      const pattern = state.behaviorPatterns.find(p =>
        p.recommendedWidgets.includes(widget) && p.confidence > confidenceLevel
      );
      return pattern !== undefined;
    });
  };

  const calculateLearningProgress = (): number => {
    const totalPatterns = state.behaviorPatterns.length;
    const highConfidencePatterns = state.behaviorPatterns.filter(p => p.confidence > confidenceLevel).length;
    const segmentConfidence = state.currentSegment?.confidence || 0;

    return Math.min(100, (highConfidencePatterns / totalPatterns) * 100 * segmentConfidence);
  };

  const handleRecommendationFeedback = (recommendationId: string, feedback: 'liked' | 'disliked') => {
    setState(prev => ({
      ...prev,
      userFeedback: {
        ...prev.userFeedback,
        [recommendationId]: feedback,
      },
    }));

    // Simulate learning from feedback
    setTimeout(() => {
      console.log(`Learning from ${feedback} feedback for recommendation ${recommendationId}`);
    }, 500);
  };

  const applyRecommendation = (recommendation: DashboardRecommendation) => {
    console.log('Applying recommendation:', recommendation);

    // Simulate application
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        recommendations: prev.recommendations.filter(r => r.id !== recommendation.id),
      }));
    }, 1000);
  };

  const adjustConfidenceLevel = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfidenceLevel(parseFloat(e.target.value));
  };

  const toggleFeature = (feature: keyof AIDashboardConfig) => {
    setConfig(prev => ({
      ...prev,
      [feature]: !prev[feature],
    }));
  };

  if (!currentUser) {
    return (
      <AnimatedBox
        animation="fade-in"
        className="p-6 flex justify-center items-center min-h-[400px]"
      >
        <div className="card bg-base-100 shadow-xl max-w-md text-center">
          <div className="card-body">
            <SparklesIcon className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="card-title justify-center mb-2">
              AI-Powered Dashboard
            </h2>
            <p className="text-base-content/70">
              Please log in to access intelligent dashboard features.
            </p>
          </div>
        </div>
      </AnimatedBox>
    );
  }

  return (
    <AnimatedBox
      animation="slide-up"
      className="w-full space-y-6"
    >
      {/* AI Dashboard Header */}
      <div className="card bg-base-100 shadow-lg border-l-4 border-primary">
        <div className="card-body p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <SparklesIcon className="w-10 h-10 text-primary" />
              <div>
                <h2 className="card-title text-2xl">
                  Intelligent Dashboard
                </h2>
                <p className="text-base-content/70">
                  {state.currentSegment ? `${state.currentSegment.name} • ${state.learningProgress.toFixed(0)}% learned` : 'Learning your preferences...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="badge badge-primary">
                {state.recommendations.length} Recommendations
              </div>
              <div className={`badge ${config.enabled ? 'badge-success' : 'badge-ghost'}`}>
                {config.enabled ? 'AI Active' : 'AI Disabled'}
              </div>
              <button
                className="btn btn-circle btn-ghost btn-sm"
                onClick={simulateLearning}
                disabled={isLoading}
              >
                <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Learning Progress */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">AI Learning Progress</h3>
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm">Personalization Level</span>
              <span className="text-sm font-bold">{state.learningProgress.toFixed(0)}%</span>
            </div>
            <progress
              className={`progress w-full ${state.learningProgress > 80 ? 'progress-success' : state.learningProgress > 50 ? 'progress-warning' : 'progress-primary'}`}
              value={state.learningProgress}
              max="100"
            ></progress>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="stat bg-base-200 rounded-box p-4">
              <div className="stat-title">Behavior Patterns</div>
              <div className="stat-value text-primary text-2xl">{state.behaviorPatterns.length}</div>
            </div>
            <div className="stat bg-base-200 rounded-box p-4">
              <div className="stat-title">User Segments</div>
              <div className="stat-value text-secondary text-2xl">{state.userSegments.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* User Segment Identification */}
      {state.currentSegment && (
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">Identified User Segment</h3>
            <div className="flex items-start gap-4 mb-4">
              <UserIcon className="w-12 h-12 text-primary bg-primary/10 rounded-full p-2" />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-xl">{state.currentSegment.name}</h4>
                    <p className="text-base-content/70">{state.currentSegment.description}</p>
                  </div>
                  <div className={`badge ${state.currentSegment.confidence > 0.8 ? 'badge-success' : 'badge-warning'}`}>
                    {(state.currentSegment.confidence * 100).toFixed(0)}% confidence
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h5 className="font-bold text-sm mb-2">Preferred Widgets:</h5>
              <div className="flex flex-wrap gap-2">
                {state.currentSegment.characteristics.preferredWidgets.map(widget => (
                  <div key={widget} className="badge badge-outline p-3">
                    {widget}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h5 className="font-bold text-sm mb-2">Optimal Layout:</h5>
              <div className="badge badge-ghost p-3">
                {state.currentSegment.characteristics.optimalLayout}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Personalized Widgets */}
      {state.personalizedWidgets.length > 0 && (
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">Personalized Widgets</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {state.personalizedWidgets.map(widgetId => (
                <div key={widgetId} className="card bg-base-200 border border-base-300">
                  <div className="card-body p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <SparklesIcon className="w-5 h-5 text-primary" />
                      <h4 className="font-bold text-sm">{widgetId.replace('-', ' ')}</h4>
                    </div>
                    <p className="text-xs text-base-content/60">AI Recommended</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">
            AI Recommendations ({state.recommendations.length})
          </h3>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {state.recommendations.map(recommendation => (
                <div key={recommendation.id} className="card bg-base-200 border border-base-300">
                  <div className="card-body p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-sm">{recommendation.title}</h4>
                      <div className={`badge badge-sm ${recommendation.impact === 'high' ? 'badge-error' :
                          recommendation.impact === 'medium' ? 'badge-warning' : 'badge-info'
                        }`}>
                        {recommendation.impact.toUpperCase()}
                      </div>
                    </div>
                    <p className="text-sm text-base-content/70 mb-3">
                      {recommendation.description}
                    </p>
                    <div className="flex justify-between items-center mt-auto">
                      <div className="badge badge-outline badge-sm">
                        {(recommendation.confidence * 100).toFixed(0)}% confidence
                      </div>
                      <div className="flex gap-1">
                        <button
                          className={`btn btn-ghost btn-xs btn-square ${state.userFeedback[recommendation.id] === 'liked' ? 'text-primary' : ''}`}
                          onClick={() => handleRecommendationFeedback(recommendation.id, 'liked')}
                        >
                          <HandThumbUpIcon className="w-4 h-4" />
                        </button>
                        <button
                          className={`btn btn-ghost btn-xs btn-square ${state.userFeedback[recommendation.id] === 'disliked' ? 'text-error' : ''}`}
                          onClick={() => handleRecommendationFeedback(recommendation.id, 'disliked')}
                        >
                          <HandThumbDownIcon className="w-4 h-4" />
                        </button>
                        <button
                          className="btn btn-primary btn-xs ml-2"
                          onClick={() => applyRecommendation(recommendation)}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-base-content/50 mt-2 italic">
                      {recommendation.reasoning}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Configuration */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">AI Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Confidence Threshold</span>
                <span className="text-sm font-bold">{confidenceLevel.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.95"
                step="0.05"
                value={confidenceLevel}
                onChange={adjustConfidenceLevel}
                className="range range-primary range-sm"
              />
              <div className="w-full flex justify-between text-xs px-2 mt-2">
                <span>50%</span>
                <span>70%</span>
                <span>90%</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-sm"
                  checked={config.enabled}
                  onChange={() => toggleFeature('enabled')}
                />
                <span className="label-text">AI Learning Enabled</span>
              </label>
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-sm"
                  checked={config.behaviorTracking}
                  onChange={() => toggleFeature('behaviorTracking')}
                />
                <span className="label-text">Behavior Tracking</span>
              </label>
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-sm"
                  checked={config.personalization}
                  onChange={() => toggleFeature('personalization')}
                />
                <span className="label-text">Personalization</span>
              </label>
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-sm"
                  checked={config.predictiveAnalytics}
                  onChange={() => toggleFeature('predictiveAnalytics')}
                />
                <span className="label-text">Predictive Analytics</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </AnimatedBox>
  );
};

export default IntelligentDashboard;