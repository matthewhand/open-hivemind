import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import Dashboard from '../../components/Dashboard';
import { apiService } from '../../services/api';
import Toggle from '../../components/DaisyUI/Toggle';
import DashboardWidgetSystem from '../../components/DaisyUI/DashboardWidgetSystem';
import GettingStarted from '../../components/GettingStarted';
import QuickActions from '../../components/QuickActions';
import PendingActions from '../../components/PendingActions';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [showGettingStarted, setShowGettingStarted] = useState(
    () => localStorage.getItem('hivemind-hide-getting-started') !== 'true',
  );

  // Track preference for widget vs static layout
  const [useWidgetLayout, setUseWidgetLayout] = useState(() => {
    const saved = localStorage.getItem('hivemind-dashboard-layout');
    return saved === 'widget';
  });

  // Save preference when it changes
  useEffect(() => {
    localStorage.setItem('hivemind-dashboard-layout', useWidgetLayout ? 'widget' : 'static');
  }, [useWidgetLayout]);

  useEffect(() => {
    const checkOnboarding = async (): Promise<void> => {
      try {
        const data = await apiService.get<any>('/api/onboarding/status');
        const completed = data?.completed ?? data?.data?.completed ?? false;
        if (!completed) {
          navigate('/onboarding', { replace: true });
          return;
        }
      } catch {
        // If the endpoint is unavailable, proceed to dashboard normally
      }
      setChecked(true);
    };
    // Check once on mount — no polling needed here.
    // The GettingStarted component handles config-status on its own refresh cycle.
    checkOnboarding();
  }, [navigate]);

  if (!checked) {
    return null; // brief blank while checking onboarding status
  }

  const dismissGettingStarted = () => {
    localStorage.setItem('hivemind-hide-getting-started', 'true');
    setShowGettingStarted(false);
  };

  const restoreGettingStarted = () => {
    localStorage.removeItem('hivemind-hide-getting-started');
    setShowGettingStarted(true);
  };

  const gettingStartedVisible = showGettingStarted;

  return (
    <div>
      {/* Getting Started checklist — visible until user dismisses */}
      {gettingStartedVisible && (
        <div className="mb-6">
          <GettingStarted onDismiss={dismissGettingStarted} />
        </div>
      )}

      <PendingActions />

      <div className="divider" />

      {/* Overview heading + controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-base-content/60">Overview</h3>
          {!gettingStartedVisible && (
            <button
              className="btn btn-ghost btn-xs gap-1 text-base-content/40 hover:text-primary"
              onClick={restoreGettingStarted}
              title="Show Getting Started guide"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Getting Started
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 bg-base-100/50 p-2 rounded-lg shadow-sm">
          <span className="text-sm font-medium opacity-80">Static Layout</span>
          <Toggle
            color="primary"
            checked={useWidgetLayout}
            onChange={(e) => setUseWidgetLayout(e.target.checked)}
            aria-label="Toggle widget dashboard layout"
          />
          <span className="text-sm font-medium text-primary">Widgets Layout</span>
        </div>
      </div>

      <QuickActions onRefresh={() => {}} />

      {useWidgetLayout ? (
        <div className="animate-in fade-in duration-300">
          <DashboardWidgetSystem />
        </div>
      ) : (
        <div className="animate-in fade-in duration-300">
          <Dashboard />
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
