import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Alert } from './DaisyUI/Alert';
import { apiService } from '../services/api';

/**
 * Displays an announcement banner from ANNOUNCEMENT.md in the repo root.
 * Fetches on mount, dismissible per session. Includes refresh + telemetry.
 */
const AnnouncementBanner: React.FC = () => {
  const [content, setContent] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnnouncement = useCallback(async () => {
    // Collect telemetry: local package ratings
    let telemetryParams = '';
    try {
      const ratings = JSON.parse(localStorage.getItem('pkg-ratings') || '{}');
      const ratedPkgs = Object.entries(ratings)
        .filter(([, v]) => (v as number) > 0)
        .map(([k, v]) => `${k}:${v}`)
        .join(',');
      if (ratedPkgs) {
        telemetryParams = `?ratings=${encodeURIComponent(ratedPkgs)}`;
      }
    } catch { /* ignore */ }

    try {
      const data: any = await apiService.get(`/api/dashboard/announcement${telemetryParams}`);
      if (data?.data?.hasAnnouncement && data.data.content) {
        setContent(data.data.content);
      } else {
        setContent(null);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem('announcement-dismissed');
    if (wasDismissed) {
      setDismissed(true);
      return;
    }
    fetchAnnouncement();
  }, [fetchAnnouncement]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnnouncement();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('announcement-dismissed', 'true');
  };

  if (dismissed || !content) return null;

  return (
    <div className="mb-4">
      <Alert status="info" className="shadow-md" onClose={handleDismiss}>
        <div className="flex-1 whitespace-pre-wrap text-sm">{content}</div>
        <button
          className="btn btn-ghost btn-xs btn-circle"
          onClick={handleRefresh}
          title="Refresh announcement"
          aria-label="Refresh announcement"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </Alert>
    </div>
  );
};

export default AnnouncementBanner;
