import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import GlobalConfigSection from '../components/GlobalConfigSection';


const IntegrationsPage: React.FC = () => {
  const { type } = useParams<{ type: string }>();

  if (!type) {
    return <Navigate to="/admin/settings" replace />;
  }

  return (
    <div className="p-6">
      <div className="mt-6">
        <GlobalConfigSection section={type} />
      </div>
    </div>
  );
};

export default IntegrationsPage;
