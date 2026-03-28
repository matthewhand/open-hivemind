import React from 'react';
import ActivityMonitor from '../components/Monitoring/ActivityMonitor';

const StandaloneActivity: React.FC = () => {
  return (
    <div className="min-h-screen bg-base-200">
      <ActivityMonitor />
    </div>
  );
};

export default StandaloneActivity;