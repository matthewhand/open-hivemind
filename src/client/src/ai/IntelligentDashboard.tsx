/**
 * @wip ROADMAP ITEM — NOT ACTIVE
 *
 * This component is part of the AI Dashboard & Intelligence Features planned for future implementation.
 * It has been removed from the active UI navigation and routing.
 *
 * See docs/reference/IMPROVEMENT_ROADMAP.md — "🤖 AI Dashboard & Intelligence Features (Future Roadmap)"
 * for implementation prerequisites and planned scope.
 *
 * DO NOT import or route to this component until the backend AI APIs are implemented.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectUser, selectToken } from '../store/slices/authSlice';
import { AnimatedBox } from '../animations/AnimationComponents';
import {
  SparklesIcon,
  UserIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

// Interfaces match server
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
  const token = useAppSelector(selectToken);
  const [config, setConfig] = useState<AIDashboardConfig>(defaultConfig);
  const [state, setState] = useState<IntelligentDashboardState>({
    behaviorPatterns: [],
    recommendations: [],
    userSegments: [],
    currentSegment: null,
    personalizedWidgets: [],
    learningProgress: 0,
    lastUpdate: new Date(),
    userFeedback: {},
  });
  const [isLoading, setIsLoading] = useState(false);
  const [confidenceLevel, setConfidenceLevel] = useState(0.75);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      const [configRes, statsRes, segmentsRes, patternsRes, recsRes] = await Promise.all([
        fetch('/api/dashboard/api/ai/config', { headers }),
        fetch('/api/dashboard/api/ai/stats', { headers }),
        fetch('/api/dashboard/api/ai/segments', { headers }),
        fetch('/api/dashboard/api/ai/patterns', { headers }),
        fetch('/api/dashboard/api/ai/recommendations', { headers })
      ]);

      if (configRes.ok) setConfig(await configRes.json());

      const stats = statsRes.ok ? await statsRes.json() : {};
      const segments = segmentsRes.ok ? await segmentsRes.json() : [];
      const patterns = patternsRes.ok ? await patternsRes.json() : [];
      const recommendations = recsRes.ok ? await recsRes.json() : [];

      // Determine current segment (simple logic for now, or fetch from backend if endpoint existed)
      const currentSegment = segments.length > 0 ? segments[0] : null;

      // Generate personalized widgets based on patterns
      const personalizedWidgets = patterns
        .filter((p: BehaviorPattern) => p.confidence > confidenceLevel)
        .flatMap((p: BehaviorPattern) => p.recommendedWidgets);

      setState(prev => ({
        ...prev,
        behaviorPatterns: patterns,
        recommendations: recommendations,
        userSegments: segments,
        currentSegment,
        personalizedWidgets: [...new Set(personalizedWidgets)] as string[],
        learningProgress: stats.learningProgress || 0,
        lastUpdate: new Date()
      }));

    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setIsLoading(false);
    }
  }, [token, confidenceLevel]);


  useEffect(() => {
    if (config.enabled && token) {
      fetchData();
    }
  }, [config.enabled, token, fetchData]);

  const handleRecommendationFeedback = async (recommendationId: string, feedback: 'liked' | 'disliked') => {
    // Capture previous feedback for rollback
    const previousFeedback = state.userFeedback[recommendationId];

    // Optimistically update UI immediately
    setState(prev => ({
      ...prev,
      userFeedback: {
        ...prev.userFeedback,
        [recommendationId]: feedback,
      },
    }));

    if (token) {
      try {
        await fetch('/api/dashboard/api/ai/feedback', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ recommendationId, feedback })
        });
      } catch (e) {
        console.error("Failed to send feedback, reverting optimistic update", e);
        // Rollback to previous state on failure
        setState(prev => ({
          ...prev,
          userFeedback: {
            ...prev.userFeedback,
            ...(previousFeedback !== undefined
              ? { [recommendationId]: previousFeedback }
              : Object.fromEntries(
                Object.entries(prev.userFeedback).filter(([k]) => k !== recommendationId)
              )
            ),
          },
        }));
      }
    }
  };

  const applyRecommendation = (recommendation: DashboardRecommendation) => {
    console.log('Applying recommendation:', recommendation);
    // Simulate application or call API
    setState(prev => ({
      ...prev,
      recommendations: prev.recommendations.filter(r => r.id !== recommendation.id),
    }));
  };

  const adjustConfidenceLevel = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfidenceLevel(parseFloat(e.target.value));
  };

  const toggleFeature = (feature: keyof AIDashboardConfig) => {
    const newConfig = { ...config, [feature]: !config[feature] };
    setConfig(newConfig);
    // Persist config
    if (token) {
      fetch('/api/dashboard/api/ai/config', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newConfig)
      }).catch(console.error);
    }
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
      {/* WIP Banner */}
      <div role="alert" className="alert alert-warning">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        <span>Warning: This AI Dashboard is currently Work In Progress (WIP). Data shown may be simulated.</span>
      </div>

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
                onClick={fetchData}
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
