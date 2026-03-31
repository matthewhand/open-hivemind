import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '../../components/Dashboard';

import Carousel from '../../components/DaisyUI/Carousel';
import DashboardWidgetSystem from '../../components/DaisyUI/DashboardWidgetSystem';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

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
    const checkOnboarding = async () => {
      try {
        const res = await fetch('/api/onboarding/status');
        if (res.ok) {
          const data = await res.json();
          if (!data.completed) {
            navigate('/onboarding', { replace: true });
            return;
          }
        }
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
      <div className="flex justify-end items-center mb-4 px-4 gap-3 bg-base-100/50 p-2 rounded-lg shadow-sm w-fit ml-auto">
        <span className="text-sm font-medium opacity-80">Static Layout</span>
        <input
          type="checkbox"
          className="toggle toggle-primary"
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
