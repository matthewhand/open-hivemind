import React from 'react';
import Dashboard from '../../components/Dashboard';
import Breadcrumbs from '../../components/DaisyUI/Breadcrumbs';
import Carousel from '../../components/DaisyUI/Carousel';
import { useI18n } from '../../i18n/I18nProvider';

const DashboardPage: React.FC = () => {
  const { t } = useI18n();
  const breadcrumbItems = [{ label: 'Dashboard', href: '/dashboard', isActive: true }];

  const carouselItems = [
    {
      image: '', // Using styled content below instead
      title: t('dashboard.welcome.title'),
      description: t('dashboard.welcome.description'),
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
      <Breadcrumbs items={breadcrumbItems} />
      <div className="mb-8">
        <Carousel items={carouselItems} autoplay={true} interval={6000} variant="full-width" />
      </div>
      <Dashboard />
    </div>
  );
};

export default DashboardPage;
