import React from 'react';
import Card from '../DaisyUI/Card';

interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  throughput: number;
  stabilityScore: number;
}

interface PerformanceCard {
  id: string;
  icon: string;
  label: string;
  value: string;
  helper: string;
}

interface PerformanceTabProps {
  activeTab: string;
  performanceCards: PerformanceCard[];
  performanceMetrics: PerformanceMetrics;
}

export const PerformanceTab: React.FC<PerformanceTabProps> = ({ activeTab, performanceCards, performanceMetrics }) => {
  if (activeTab !== 'performance') return null;

  return (
    <section
      id="dashboard-panel-performance"
      role="tabpanel"
      aria-labelledby="dashboard-tab-performance"
      className="space-y-6"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {performanceCards.map(card => (
          <Card key={card.id} className="bg-base-100 shadow">
            <div className="card-body">
              <span className="text-2xl" aria-hidden>{card.icon}</span>
              <h3 className="uppercase text-xs tracking-wide text-base-content/60">
                {card.label}
              </h3>
              <p className="text-3xl font-semibold">{card.value}</p>
              <p className="text-sm text-base-content/60">{card.helper}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="bg-base-100 shadow-lg">
          <div className="card-body space-y-4">
            <h2 className="card-title text-lg">
              Real-time Performance Metrics
            </h2>
            <p className="text-sm text-base-content/60">
              Live telemetry across the swarm for quick operational checks.
            </p>

            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-8 justify-items-center py-6"
              data-testid="performance-metrics"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="radial-progress text-primary" style={{ '--value': performanceMetrics.cpuUsage, '--size': '6rem' } as React.CSSProperties} role="progressbar">
                  {Math.round(performanceMetrics.cpuUsage)}%
                </div>
                <span className="text-sm font-medium">CPU Usage</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div
                  className={`radial-progress ${performanceMetrics.memoryUsage > 80 ? 'text-error' : performanceMetrics.memoryUsage > 50 ? 'text-warning' : 'text-success'}`}
                  style={{ '--value': performanceMetrics.memoryUsage, '--size': '6rem' } as React.CSSProperties}
                  role="progressbar"
                >
                  {Math.round(performanceMetrics.memoryUsage)}%
                </div>
                <span className="text-sm font-medium">Memory Usage</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="radial-progress text-accent" style={{ '--value': performanceMetrics.throughput, '--size': '6rem' } as React.CSSProperties} role="progressbar">
                  {Math.round(performanceMetrics.throughput)}%
                </div>
                <span className="text-sm font-medium">Throughput</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div
                  className={`radial-progress ${performanceMetrics.stabilityScore >= 95 ? 'text-success' : performanceMetrics.stabilityScore >= 70 ? 'text-warning' : 'text-error'}`}
                  style={{ '--value': performanceMetrics.stabilityScore, '--size': '6rem' } as React.CSSProperties}
                  role="progressbar"
                >
                  {Math.round(performanceMetrics.stabilityScore)}%
                </div>
                <span className="text-sm font-medium">Stability</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};
