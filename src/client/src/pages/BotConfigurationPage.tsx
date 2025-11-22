import React from 'react';
import ConfigurationEditor from '../components/ConfigurationEditor';

const BotConfigurationPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <ConfigurationEditor />
    </div>
  );
};

export default BotConfigurationPage;