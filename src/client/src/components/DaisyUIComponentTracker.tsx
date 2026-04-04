/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import type { DaisyUIComponentStats } from '../utils/DaisyUIComponentTracker';
import { daisyUITracker } from '../utils/DaisyUIComponentTracker';
import Button from './DaisyUI/Button';
import Badge from './DaisyUI/Badge';
import Card from './DaisyUI/Card';
import { Progress } from './DaisyUI/Loading';
import { Alert } from './DaisyUI/Alert';
import Modal from './DaisyUI/Modal';
import Tabs from './DaisyUI/Tabs';
import { Stat } from './DaisyUI/Stat';

interface Props {
  isOpen?: boolean;
  onClose?: () => void;
}

const DaisyUIComponentTracker: React.FC<Props> = ({ isOpen = true, onClose }) => {
  const [stats, setStats] = useState<DaisyUIComponentStats | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('overview');
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      const currentStats = daisyUITracker.getStats();
      setStats(currentStats);
    };

    updateStats();
    const interval = setInterval(updateStats, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleExportData = () => {
    const data = daisyUITracker.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'daisyui-usage-stats.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearData = () => {
    daisyUITracker.clearData();
    setStats(daisyUITracker.getStats());
  };

  if (!stats) {return null;}

  const usagePercentage = Math.round((stats.usedComponents / stats.totalComponents) * 100);
  const suggestions = daisyUITracker.getSuggestions();

  return (
    <div className={`${isOpen ? 'block' : 'hidden'}`}>
      <Card className="shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <Card.Title className="text-2xl">📊 DaisyUI Component Tracker</Card.Title>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ✕
              </Button>
            )}
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Stat title="Total Components" value={stats.totalComponents} valueClassName="text-primary" />
            <Stat title="Used Components" value={stats.usedComponents} valueClassName="text-success" />
            <Stat title="Usage Rate" value={`${usagePercentage}%`} valueClassName="text-info" />
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Component Coverage</span>
              <span className="text-sm">{stats.usedComponents}/{stats.totalComponents}</span>
            </div>
            <Progress
              value={usagePercentage}
              max={100}
              className="w-full"
              color={usagePercentage > 75 ? 'success' : usagePercentage > 50 ? 'warning' : 'error'}
            />
          </div>

          {/* Tabs */}
          <Tabs
            tabs={[
              { key: 'overview', label: 'Overview' },
              { key: 'used', label: `Used Components (${stats.usedComponents})` },
              { key: 'unused', label: `Unused (${stats.unusedComponents.length})` },
              { key: 'suggestions', label: `Suggestions (${suggestions.length})` },
              { key: 'categories', label: 'By Category' },
            ]}
            activeTab={selectedCategory}
            onChange={setSelectedCategory}
            className="w-full"
          />

          {/* Tab Content */}
          <div className="mt-6">
            {/* Overview Tab */}
            {selectedCategory === 'overview' && (
              <div className="space-y-4">
                <Alert>
                  <span className="font-semibold">Quick Summary:</span> You've used {stats.usedComponents} out of {stats.totalComponents} available DaisyUI components.
                  {stats.unusedComponents.length > 0 && ` Consider exploring ${stats.unusedComponents.length} unused components to enhance your UI.`}
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(stats.categories).map(([category, data]) => (
                    <Card key={category} className="bg-base-200">
                      <Card.Body className="card-body p-4">
                        <Card.Title tag="h3" className="text-lg capitalize">{category}</Card.Title>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{data.used}/{data.total} used</span>
                          <Badge
                            color={data.used === data.total ? 'success' : data.used > 0 ? 'warning' : 'ghost'}
                            size="sm"
                          >
                            {Math.round((data.used / data.total) * 100)}%
                          </Badge>
                        </div>
                        <Progress
                          value={(data.used / data.total) * 100}
                          max={100}
                          size="sm"
                          className="w-full mt-2"
                        />
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Used Components Tab */}
            {selectedCategory === 'used' && (
              <div className="space-y-2">
                {stats.componentUsage.map((usage) => (
                  <div key={usage.component} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium">{usage.component}</span>
                      <Badge variant="primary" size="xs">{usage.usageCount} uses</Badge>
                    </div>
                    <div className="text-sm text-base-content/60">
                      <a href={usage.uri} className="link link-primary" target="_blank" rel="noopener noreferrer">
                        View in code
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Unused Components Tab */}
            {selectedCategory === 'unused' && (
              <div className="space-y-2">
                {stats.unusedComponents.length === 0 ? (
                  <Alert color="success">
                    🎉 Congratulations! You've used all available DaisyUI components!
                  </Alert>
                ) : (
                  stats.unusedComponents.map((component) => (
                    <div key={component} className="flex items-center justify-between p-3 bg-base-200 rounded-lg opacity-75">
                      <span className="font-medium">{component}</span>
                      <Badge variant="ghost" size="xs">Not used yet</Badge>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Suggestions Tab */}
            {selectedCategory === 'suggestions' && (
              <div className="space-y-3">
                {suggestions.length === 0 ? (
                  <Alert color="success">
                    Great job! You're using a wide variety of DaisyUI components.
                  </Alert>
                ) : (
                  suggestions.map((suggestion, index) => (
                    <Card key={index} className="bg-base-200">
                      <Card.Body className="card-body p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{suggestion.component}</h3>
                          <Badge variant="info" size="xs">{suggestion.category}</Badge>
                        </div>
                        <p className="text-sm text-base-content/80">{suggestion.suggestedUse}</p>
                      </Card.Body>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Categories Tab */}
            {selectedCategory === 'categories' && (
              <div className="space-y-4">
                {Object.entries(stats.categories).map(([category, data]) => (
                  <div key={category} className="collapse collapse-arrow bg-base-200">
                    <input type="checkbox" defaultChecked={data.used > 0} aria-label={`Toggle category ${category}`} />
                    <div className="collapse-title text-lg font-medium capitalize">
                      {category} ({data.used}/{data.total} components)
                    </div>
                    <div className="collapse-content">
                      <div className="space-y-2 mt-2">
                        {data.components.length > 0 ? (
                          data.components.map((component) => {
                            const usage = stats.componentUsage.find(u => u.component === component);
                            return (
                              <div key={component} className="flex items-center justify-between p-2 bg-base-100 rounded">
                                <span>{component}</span>
                                {usage && (
                                  <Badge variant="success" size="xs">{usage.usageCount} uses</Badge>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-base-content/60 italic">No components from this category used yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <Card.Actions className="mt-6">
            <Button variant="ghost" onClick={handleClearData}>
              Clear Data
            </Button>
            <Button variant="ghost" onClick={() => setShowSuggestions(!showSuggestions)}>
              {showSuggestions ? 'Hide' : 'Show'} Suggestions
            </Button>
            <Button onClick={handleExportData}>
              Export Data
            </Button>
          </Card.Actions>
      </Card>
    </div>
  );
};

export default DaisyUIComponentTracker;