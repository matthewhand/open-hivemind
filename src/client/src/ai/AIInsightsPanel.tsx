import React, { useState } from 'react';
import { Card, Badge, Button, Alert, Progress } from '../components/DaisyUI';
import {
  SparklesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

export interface SimpleInsight {
  id: string;
  type: 'performance' | 'error' | 'optimization' | 'prediction';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  confidence: number;
  recommendation: string;
}

const insights: SimpleInsight[] = [
  {
    id: '1',
    type: 'performance',
    severity: 'high',
    title: 'Bot Response Time Degradation',
    description: 'Average response time increased by 45% over the last hour',
    confidence: 92,
    recommendation: 'Check bot resource allocation and consider scaling'
  },
  {
    id: '2',
    type: 'optimization',
    severity: 'medium',
    title: 'Unused Widget Detection',
    description: '3 widgets haven\'t been accessed in 7 days',
    confidence: 88,
    recommendation: 'Consider removing unused widgets to improve dashboard performance'
  },
  {
    id: '3',
    type: 'prediction',
    severity: 'low',
    title: 'Traffic Increase Expected',
    description: 'Based on historical patterns, expect 30% more traffic tomorrow',
    confidence: 75,
    recommendation: 'Prepare additional resources for anticipated load'
  },
  {
    id: '4',
    type: 'error',
    severity: 'critical',
    title: 'Memory Leak Detected',
    description: 'Memory usage trending upward with unusual pattern',
    confidence: 95,
    recommendation: 'Restart affected services and investigate memory allocation'
  },
];

export const AIInsightsPanel: React.FC = () => {
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setTimeout(() => setIsAnalyzing(false), 2000);
  };

  const getSeverityColor = (severity: string): 'info' | 'warning' | 'error' | 'success' => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'info';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'performance': return '⚡';
      case 'error': return '🚨';
      case 'optimization': return '🎯';
      case 'prediction': return '🔮';
      default: return '💡';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <ExclamationTriangleIcon className="w-4 h-4 text-error" />;
      case 'high': return <ExclamationTriangleIcon className="w-4 h-4 text-warning" />;
      case 'medium': return <InformationCircleIcon className="w-4 h-4 text-info" />;
      case 'low': return <CheckCircleIcon className="w-4 h-4 text-success" />;
      default: return <InformationCircleIcon className="w-4 h-4" />;
    }
  };

  const sortedInsights = insights.sort((a, b) => {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
  });

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg border-l-4 border-primary">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SparklesIcon className="w-8 h-8 text-primary" />
              <div>
                <h2 className="card-title text-2xl">AI Insights</h2>
                <p className="text-sm opacity-70">Intelligent system analysis and recommendations</p>
              </div>
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="btn-primary"
            >
              {isAnalyzing ? (
                <>
                  <div className="loading loading-spinner loading-sm mr-2" />
                  Analyzing...
                </>
              ) : (
                'Analyze System'
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-error">{insights.filter(i => i.severity === 'critical').length}</div>
            <p className="text-sm opacity-70">Critical Issues</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-warning">{insights.filter(i => i.severity === 'high').length}</div>
            <p className="text-sm opacity-70">High Priority</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-info">{insights.filter(i => i.severity === 'medium').length}</div>
            <p className="text-sm opacity-70">Medium Priority</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-success">{insights.filter(i => i.severity === 'low').length}</div>
            <p className="text-sm opacity-70">Low Priority</p>
          </div>
        </Card>
      </div>

      {/* Insights List */}
      <Card className="shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">Active Insights</h3>
          <div className="space-y-3">
            {sortedInsights.map((insight) => (
              <div key={insight.id} className="border border-base-300 rounded-lg overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-base-200 transition-colors"
                  onClick={() => setExpandedInsight(expandedInsight === insight.id ? null : insight.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{getTypeIcon(insight.type)}</span>
                      <div className="flex items-center gap-2">
                        {getSeverityIcon(insight.severity)}
                        <h4 className="font-semibold">{insight.title}</h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getSeverityColor(insight.severity)} size="sm">
                        {insight.severity}
                      </Badge>
                      {expandedInsight === insight.id ? (
                        <ChevronUpIcon className="w-4 h-4" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {expandedInsight === insight.id && (
                  <div className="px-4 pb-4 border-t border-base-200">
                    <div className="pt-3 space-y-3">
                      <div>
                        <p className="text-sm opacity-70 mb-1">Description</p>
                        <p className="text-sm">{insight.description}</p>
                      </div>
                      <div>
                        <p className="text-sm opacity-70 mb-1">Confidence</p>
                        <Progress value={insight.confidence} max={100} className="w-full h-2" />
                        <p className="text-xs opacity-70 mt-1">{insight.confidence}% confidence</p>
                      </div>
                      <div>
                        <p className="text-sm opacity-70 mb-1">Recommendation</p>
                        <Alert variant={getSeverityColor(insight.severity)} className="text-sm">
                          {insight.recommendation}
                        </Alert>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" className="btn-primary btn-outline">
                          Apply Fix
                        </Button>
                        <Button size="sm" className="btn-ghost">
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Alert variant="info" className="flex items-center gap-3">
        <SparklesIcon className="w-5 h-5 flex-shrink-0" />
        <div>
          <p className="font-medium">AI insights update automatically</p>
          <p className="text-sm opacity-70">System monitors patterns and generates recommendations in real-time</p>
        </div>
      </Alert>
    </div>
  );
};

export default AIInsightsPanel;