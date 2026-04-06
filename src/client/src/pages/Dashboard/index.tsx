import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Rocket } from 'lucide-react';
import Dashboard from '../../components/Dashboard';
import { apiService } from '../../services/api';
import { Alert } from '../../components/DaisyUI/Alert';
import Button from '../../components/DaisyUI/Button';
import Toggle from '../../components/DaisyUI/Toggle';
import Carousel from '../../components/DaisyUI/Carousel';
import DashboardWidgetSystem from '../../components/DaisyUI/DashboardWidgetSystem';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

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
        if (!data.completed) {
          navigate('/onboarding', { replace: true });
          return;
        }

        // Even if onboarding is "completed", check if LLM is actually configured.
        // This catches the case where bots exist from env but no LLM key is set.
        try {
          const llm = await apiService.get<any>('/api/config/llm-status');
          if (!llm?.defaultConfigured) {
            setNeedsSetup(true);
          }
        } catch { /* proceed normally */ }
      } catch {
        // If the endpoint is unavailable, proceed to dashboard normally
      }
      setChecked(true);
    };
    checkOnboarding();
  }, [navigate]);

  if (!checked) {
    return null; // brief blank while checking onboarding status
  }

  const carouselItems = [
    {
      image: '', // Using styled content below instead
      title: 'Welcome to Open-Hivemind',
      description: 'Your multi-agent AI platform for seamless communication across platforms.',
      bgGradient: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    },
    {
      image: '',
      title: 'Real-time Monitoring',
      description: 'Monitor your bots\' performance and health in real-time with detailed metrics.',
      bgGradient: 'linear-gradient(135deg, #059669, #10b981)',
    },
    {
      image: '',
      title: 'Multi-Platform Support',
      description: 'Connect to Discord, Slack, Mattermost, and more with centralized management.',
      bgGradient: 'linear-gradient(135deg, #dc2626, #ef4444)',
    },
  ];

  return (
    <div>
      {/* Incomplete setup prompt */}
      {needsSetup && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <Alert status="warning" className="shadow-lg" onClose={() => setNeedsSetup(false)}>
            <Cpu className="w-5 h-5 shrink-0" />
            <div className="flex-1">
              <strong>Setup incomplete</strong> — no LLM provider is configured yet. Your bots won't be able to generate responses.
            </div>
            <Button variant="primary" size="sm" onClick={() => navigate('/onboarding')}>
              <Rocket className="w-4 h-4 mr-1" />
              Run Setup Wizard
            </Button>
          </Alert>
        </div>
      )}

      <div className="flex justify-end items-center mb-4 px-4 gap-3 bg-base-100/50 p-2 rounded-lg shadow-sm w-fit ml-auto">
        <span className="text-sm font-medium opacity-80">Static Layout</span>
        <Toggle
          color="primary"
          checked={useWidgetLayout}
          onChange={(e) => setUseWidgetLayout(e.target.checked)}
          aria-label="Toggle widget dashboard layout"
        />
        <span className="text-sm font-medium text-primary">Widgets Layout</span>
      </div>

      {useWidgetLayout ? (
        <div className="animate-in fade-in duration-300">
          <DashboardWidgetSystem />
        </div>
      ) : (
        <div className="animate-in fade-in duration-300">
          <div className="mb-8">
            <Carousel items={carouselItems} autoplay={true} interval={6000} variant="full-width" />
          </div>
          <Dashboard />
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
