import React, { useState, useEffect } from 'react';
import type { DaisyUIComponentStats } from '../utils/DaisyUIComponentTracker';
import { daisyUITracker } from '../utils/DaisyUIComponentTracker';
import { Button, Badge, Card, Tabs, Tab, Progress, Alert, Modal } from './DaisyUI';

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
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 className="card-title text-2xl">📊 DaisyUI Component Tracker</h2>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ✕
              </Button>
            )}
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="stat">
              <div className="stat-title">Total Components</div>
              <div className="stat-value text-primary">{stats.totalComponents}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Used Components</div>
              <div className="stat-value text-success">{stats.usedComponents}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Usage Rate</div>
              <div className="stat-value text-info">{usagePercentage}%</div>
            </div>
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
          <Tabs className="w-full">
            <Tab
              active={selectedCategory === 'overview'}
              onClick={() => setSelectedCategory('overview')}
            >
              Overview
            </Tab>
            <Tab
              active={selectedCategory === 'used'}
              onClick={() => setSelectedCategory('used')}
            >
              Used Components ({stats.usedComponents})
            </Tab>
            <Tab
              active={selectedCategory === 'unused'}
              onClick={() => setSelectedCategory('unused')}
            >
              Unused ({stats.unusedComponents.length})
            </Tab>
            <Tab
              active={selectedCategory === 'suggestions'}
              onClick={() => setSelectedCategory('suggestions')}
            >
              Suggestions ({suggestions.length})
            </Tab>
            <Tab
              active={selectedCategory === 'categories'}
              onClick={() => setSelectedCategory('categories')}
            >
              By Category
            </Tab>
          </Tabs>

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
                      <div className="card-body p-4">
                        <h3 className="card-title text-lg capitalize">{category}</h3>
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
                      </div>
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
                    <div key={index} className="card bg-base-200">
                      <div className="card-body p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{suggestion.component}</h3>
                          <Badge variant="info" size="xs">{suggestion.category}</Badge>
                        </div>
                        <p className="text-sm text-base-content/80">{suggestion.suggestedUse}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Categories Tab */}
            {selectedCategory === 'categories' && (
              <div className="space-y-4">
                {Object.entries(stats.categories).map(([category, data]) => (
                  <div key={category} className="collapse collapse-arrow bg-base-200">
                    <input type="checkbox" defaultOpen={data.used > 0} />
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
          <div className="card-actions justify-end mt-6">
            <Button variant="ghost" onClick={handleClearData}>
              Clear Data
            </Button>
            <Button variant="ghost" onClick={() => setShowSuggestions(!showSuggestions)}>
              {showSuggestions ? 'Hide' : 'Show'} Suggestions
            </Button>
            <Button onClick={handleExportData}>
              Export Data
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DaisyUIComponentTracker;