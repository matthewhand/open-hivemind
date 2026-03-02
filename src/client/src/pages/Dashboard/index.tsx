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
      bgClass: 'bg-gradient-to-br from-indigo-500 to-purple-600',
    },
    {
      image: '',
      title: 'Real-time Monitoring',
      description: 'Monitor your bots\' performance and health in real-time with detailed metrics.',
      bgClass: 'bg-gradient-to-br from-emerald-600 to-emerald-400',
    },
    {
      image: '',
      title: 'Multi-Platform Support',
      description: 'Connect to Discord, Slack, Mattermost, and more with unified management.',
      bgClass: 'bg-gradient-to-br from-red-600 to-red-400',
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
