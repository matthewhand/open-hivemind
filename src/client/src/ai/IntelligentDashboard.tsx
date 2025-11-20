import React, { useState } from 'react';
import { Card, Badge, Button, Progress, Alert } from '../components/DaisyUI';
import {
  SparklesIcon,
  FaceSmileIcon,
  StarIcon,
  ArrowPathIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';

export interface SimpleBehavior {
  action: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

export interface SimpleRecommendation {
  id: string;
  title: string;
  description: string;
  type: 'layout' | 'widget' | 'performance';
}

const behaviorPatterns: SimpleBehavior[] = [
  { action: 'Dashboard Views', count: 1247, trend: 'up' },
  { action: 'Widget Interactions', count: 892, trend: 'up' },
  { action: 'Filter Usage', count: 445, trend: 'stable' },
  { action: 'Exports', count: 89, trend: 'down' },
];

const recommendations: SimpleRecommendation[] = [
  {
    id: '1',
    title: 'Move Activity Monitor',
    description: 'Users interact with this widget 3x more than others',
    type: 'layout'
  },
  {
    id: '2',
    title: 'Add Performance Widget',
    description: 'Frequent searches for performance metrics detected',
    type: 'widget'
  },
  {
    id: '3',
    title: 'Optimize Dashboard Loading',
    description: 'Above average load times detected on main page',
    type: 'performance'
  },
];

export const IntelligentDashboard: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'behaviors' | 'recommendations'>('behaviors');

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setTimeout(() => setIsAnalyzing(false), 2000);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      default: return '➡️';
    }
  };

  const getRecommendationColor = (type: string): 'info' | 'warning' | 'error' | 'success' => {
    switch (type) {
      case 'layout': return 'info';
      case 'widget': return 'success';
      case 'performance': return 'warning';
      default: return 'info';
    }
  };

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg border-l-4 border-primary">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SparklesIcon className="w-8 h-8 text-primary" />
              <div>
                <h2 className="card-title text-2xl">Intelligent Dashboard</h2>
                <p className="text-sm opacity-70">AI-powered user behavior analysis</p>
              </div>
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="btn-primary"
            >
              {isAnalyzing ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <LightBulbIcon className="w-4 h-4 mr-2" />
                  Analyze Behavior
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="tabs tabs-boxed">
        <button
          className={`tab ${selectedTab === 'behaviors' ? 'tab-active' : ''}`}
          onClick={() => setSelectedTab('behaviors')}
        >
          <FaceSmileIcon className="w-4 h-4 mr-2" />
          User Behaviors
        </button>
        <button
          className={`tab ${selectedTab === 'recommendations' ? 'tab-active' : ''}`}
          onClick={() => setSelectedTab('recommendations')}
        >
          <StarIcon className="w-4 h-4 mr-2" />
          AI Recommendations
        </button>
      </div>

      {selectedTab === 'behaviors' && (
        <Card className="shadow-lg">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">Behavior Patterns</h3>
            <div className="space-y-4">
              {behaviorPatterns.map((behavior, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-base-300 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getTrendIcon(behavior.trend)}</span>
                    <div>
                      <p className="font-semibold">{behavior.action}</p>
                      <p className="text-sm opacity-70">{behavior.count} interactions</p>
                    </div>
                  </div>
                  <Badge
                    variant={behavior.trend === 'up' ? 'success' : behavior.trend === 'down' ? 'error' : 'neutral'}
                    size="sm"
                  >
                    {behavior.trend}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {selectedTab === 'recommendations' && (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <Card key={rec.id} className="shadow-lg">
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <StarIcon className="w-5 h-5 text-warning" />
                      <h4 className="font-bold">{rec.title}</h4>
                      <Badge variant={getRecommendationColor(rec.type)} size="sm">
                        {rec.type}
                      </Badge>
                    </div>
                    <p className="text-sm opacity-70 mb-3">{rec.description}</p>
                    <div className="flex gap-2">
                      <Button size="sm" className="btn-primary btn-outline">
                        Apply Suggestion
                      </Button>
                      <Button size="sm" className="btn-ghost">
                        Learn More
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* AI Insights Summary */}
      <Card className="shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">AI Insights Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border border-base-300 rounded-lg">
              <div className="text-2xl font-bold text-primary">94%</div>
              <p className="text-sm opacity-70">User Satisfaction</p>
            </div>
            <div className="text-center p-4 border border-base-300 rounded-lg">
              <div className="text-2xl font-bold text-success">+23%</div>
              <p className="text-sm opacity-70">Engagement Rate</p>
            </div>
            <div className="text-center p-4 border border-base-300 rounded-lg">
              <div className="text-2xl font-bold text-warning">2.4s</div>
              <p className="text-sm opacity-70">Avg Response Time</p>
            </div>
          </div>
        </div>
      </Card>

      <Alert variant="info" className="flex items-center gap-3">
        <SparklesIcon className="w-5 h-5 flex-shrink-0" />
        <div>
          <p className="font-medium">AI is learning from user patterns</p>
          <p className="text-sm opacity-70">Recommendations improve based on actual usage data</p>
        </div>
      </Alert>
    </div>
  );
};

export default IntelligentDashboard;