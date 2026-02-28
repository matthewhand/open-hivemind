import React from 'react';
import Dashboard from '../../components/Dashboard';
import { Breadcrumbs, Carousel } from '../../components/DaisyUI';

const DashboardPage: React.FC = () => {
  const breadcrumbItems = [{ label: 'Dashboard', href: '/dashboard', isActive: true }];

  const carouselItems = [
    {
      image: '', // Using styled content below instead
      title: 'Welcome to Open-Hivemind',
      description: 'Your multi-agent AI platform for seamless communication across platforms.',
      bgGradient: 'linear-gradient(135deg, var(--color-primary, #4f46e5), var(--color-secondary, #7c3aed))',
    },
    {
      image: '',
      title: 'Real-time Monitoring',
      description: 'Monitor your bots\' performance and health in real-time with detailed metrics.',
      bgGradient: 'linear-gradient(135deg, var(--color-success, #059669), var(--color-success-content, #10b981))',
    },
    {
      image: '',
      title: 'Multi-Platform Support',
      description: 'Connect to Discord, Slack, Mattermost, and more with unified management.',
      bgGradient: 'linear-gradient(135deg, var(--color-error, #dc2626), var(--color-error-content, #ef4444))',
    },
  ];

  return (
    <div>
      <Breadcrumbs items={breadcrumbItems} />
      <div className="mb-8">
        <Carousel items={carouselItems} autoplay={true} interval={6000} variant="full-width" />
      </div>
      <Dashboard />
    </div>
  );
};

export default DashboardPage;
