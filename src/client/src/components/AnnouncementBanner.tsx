import React, { useEffect, useState } from 'react';
import { Alert } from './DaisyUI/Alert';
import { apiService } from '../services/api';

/**
 * Displays an announcement banner from ANNOUNCEMENT.md in the repo root.
 * Fetches on mount, dismissible per session.
 */
const AnnouncementBanner: React.FC = () => {
  const [content, setContent] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem('announcement-dismissed');
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    apiService
      .get('/api/dashboard/announcement')
      .then((data: any) => {
        if (data?.data?.hasAnnouncement && data.data.content) {
          setContent(data.data.content);
        }
      })
      .catch(() => {});
  }, []);

  if (dismissed || !content) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('announcement-dismissed', 'true');
  };

  return (
    <div className="mb-4">
      <Alert status="info" className="shadow-md" onClose={handleDismiss}>
        <div className="flex-1 whitespace-pre-wrap text-sm">{content}</div>
      </Alert>
    </div>
  );
};

export default AnnouncementBanner;
