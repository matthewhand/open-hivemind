import React from 'react';
import ActivityMonitor from '../components/ActivityMonitor';

const StandaloneActivity: React.FC = () => {
  return (
    <div className="min-h-screen bg-base-200">
      <ActivityMonitor showPopoutButton={false} autoRefresh={true} />
    </div>
  );
};

export default StandaloneActivity;