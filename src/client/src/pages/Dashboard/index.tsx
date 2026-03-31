import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '../../components/Dashboard';

import Carousel from '../../components/DaisyUI/Carousel';
import DashboardWidgetSystem from '../../components/DaisyUI/DashboardWidgetSystem';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [useWidgetLayout, setUseWidgetLayout] = useState(false);

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
      description: 'Connect to Discord, Slack, Mattermost, and more with unified management.',
      bgGradient: 'linear-gradient(135deg, #dc2626, #ef4444)',
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6 px-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="form-control">
          <label className="label cursor-pointer gap-3">
            <span className="label-text font-medium">Use Widget Layout</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={useWidgetLayout}
              onChange={() => setUseWidgetLayout(!useWidgetLayout)}
              aria-label="Toggle Widget Layout"
            />
          </label>
        </div>
      </div>

      {!useWidgetLayout && (
        <div className="mb-8">
          <Carousel items={carouselItems} autoplay={true} interval={6000} variant="full-width" />
        </div>
      )}

      {useWidgetLayout ? (
        <DashboardWidgetSystem />
      ) : (
        <Dashboard />
      )}
    </div>
  );
};

export default DashboardPage;
