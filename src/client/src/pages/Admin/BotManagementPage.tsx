/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import EnhancedBotManager from '../../components/Admin/EnhancedBotManager';

const BotManagementPage: React.FC = () => {
  const navigate = useNavigate();

  const handleBotSelect = (bot: any) => {
    console.log('Selected bot:', bot);
    // Could navigate to bot details page or open modal
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        {/* Breadcrumbs */}
        <div className="text-sm breadcrumbs mb-4">
          <ul>
            <li>
              <a onClick={() => navigate('/admin')} className="cursor-pointer">
                Admin Dashboard
              </a>
            </li>
            <li>Bot Management</li>
          </ul>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Bot Management</h1>
            <p className="text-base-content/70 mt-1">
              Create, configure, and manage your AI bot instances
            </p>
          </div>
          <button
            className="btn btn-outline gap-2"
            onClick={() => navigate('/admin')}
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>

        {/* Info Alert */}
        <div className="alert alert-info shadow-sm mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <div>
            <h3 className="font-bold">Enhanced Bot Management</h3>
            <div className="text-xs">
              Manage your bots with visual status indicators, persistent storage, and advanced configuration options.
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-base-100 rounded-box shadow-lg border border-base-200">
          <EnhancedBotManager onBotSelect={handleBotSelect} />
        </div>
      </div>
    </div>
  );
};

export default BotManagementPage;