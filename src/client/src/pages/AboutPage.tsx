import React, { useEffect, useState } from 'react';
import { Info, Github, Heart, Lightbulb } from 'lucide-react';
import Card from '../components/DaisyUI/Card';
import PageHeader from '../components/DaisyUI/PageHeader';
import TipRotator from '../components/TipRotator';
import AnnouncementBanner from '../components/AnnouncementBanner';
import { apiService } from '../services/api';

const AboutPage: React.FC = () => {
  const [healthData, setHealthData] = useState<any>(null);

  useEffect(() => {
    apiService.get('/api/health').then((d: any) => setHealthData(d?.data || d)).catch(() => {});
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="About Open-Hivemind"
        description="Your multi-agent AI platform for seamless communication across platforms"
        icon={Info}
      />

      <AnnouncementBanner />

      <Card title="System Info">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-base-content/60">Version:</span> <span className="font-mono">{healthData?.version || '1.0.0'}</span></div>
          <div><span className="text-base-content/60">Platform:</span> <span className="font-mono">{healthData?.system?.platform || 'unknown'}</span></div>
          <div><span className="text-base-content/60">Node.js:</span> <span className="font-mono">{healthData?.system?.nodeVersion || 'unknown'}</span></div>
          <div><span className="text-base-content/60">Status:</span> <span className={`badge badge-sm ${healthData?.status === 'healthy' ? 'badge-success' : 'badge-warning'}`}>{healthData?.status || 'checking...'}</span></div>
        </div>
      </Card>

      <Card title="Tips & Hints">
        <div className="space-y-3">
          <TipRotator className="py-2" />
          <p className="text-xs text-base-content/50">Tips rotate every 8 seconds. Edit TIPS.md to customize.</p>
        </div>
      </Card>

      <Card title="Links">
        <div className="flex flex-wrap gap-3">
          <a href="https://github.com/matthewhand/open-hivemind" target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline gap-2">
            <Github className="w-4 h-4" /> GitHub Repository
          </a>
          <a href="https://github.com/matthewhand/open-hivemind/issues" target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline gap-2">
            <Heart className="w-4 h-4" /> Report Issue / Feedback
          </a>
          <a href="https://github.com/matthewhand/open-hivemind/blob/main/docs/COMMUNITY_PACKAGES.md" target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline gap-2">
            <Lightbulb className="w-4 h-4" /> Community Packages Guide
          </a>
        </div>
      </Card>
    </div>
  );
};

export default AboutPage;
