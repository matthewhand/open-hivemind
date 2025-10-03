import React from 'react';
import Dashboard from '../../components/Dashboard';
import { Breadcrumbs, Carousel } from '../../components/DaisyUI';

const DashboardPage: React.FC = () => {
  const breadcrumbItems = [{ label: 'Dashboard', href: '/dashboard', isActive: true }];

  const carouselItems = [
    {
      image: 'https://via.placeholder.com/800x400/4f46e5/ffffff?text=Welcome+to+Open-Hivemind',
      title: 'Welcome to Open-Hivemind',
      description: 'Your multi-agent AI platform for seamless communication across platforms.',
    },
    {
      image: 'https://via.placeholder.com/800x400/059669/ffffff?text=Real-time+Monitoring',
      title: 'Real-time Monitoring',
      description: 'Monitor your bots\' performance and health in real-time with detailed metrics.',
    },
    {
      image: 'https://via.placeholder.com/800x400/dc2626/ffffff?text=Multi-Platform+Support',
      title: 'Multi-Platform Support',
      description: 'Connect to Discord, Slack, Mattermost, and more with unified management.',
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
