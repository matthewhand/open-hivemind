import React from 'react';
import Card from '../DaisyUI/Card';

interface GettingStartedTabProps {
  activeTab: string;
  botsLength: number;
  handleOpenCreateModal: () => void;
  navigate: (path: string) => void;
}

export const GettingStartedTab: React.FC<GettingStartedTabProps> = ({
  activeTab,
  botsLength,
  handleOpenCreateModal,
  navigate
}) => {
  if (activeTab !== 'getting-started') return null;

  return (
    <section
      id="dashboard-panel-getting-started"
      role="tabpanel"
      aria-labelledby="dashboard-tab-getting-started"
      className="space-y-6"
    >
      <div className="hero bg-base-200 rounded-2xl p-8">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold">Welcome to Open Hivemind</h1>
            <p className="py-6">
              Let's get your multi-agent system up and running. Follow the steps below to configure your environment.
            </p>

            {botsLength === 0 && (
              <div className="alert alert-warning shadow-lg mb-6 text-left">
                <div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <span>Warning: No active bots found. You need at least one bot to start processing messages.</span>
                </div>
              </div>
            )}
            <button className="btn btn-primary" onClick={handleOpenCreateModal}>Create Your First Bot</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer border border-base-200" onClick={() => navigate('/settings')}>
          <div className="card-body items-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <h2 className="card-title">1. System Settings</h2>
            <p className="text-sm opacity-70">Configure database, monitoring, and core application settings.</p>
          </div>
        </Card>

        <Card className="bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer border border-base-200" onClick={() => navigate('/providers')}>
          <div className="card-body items-center text-center">
            <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <h2 className="card-title">2. Connect Providers</h2>
            <p className="text-sm opacity-70">Link your Discord, Slack, and LLM provider accounts.</p>
          </div>
        </Card>

        <Card className="bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer border border-base-200" onClick={handleOpenCreateModal}>
          <div className="card-body items-center text-center">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
            </div>
            <h2 className="card-title">3. Create Bots</h2>
            <p className="text-sm opacity-70">Design intelligent agents and deploy them to your platforms.</p>
          </div>
        </Card>
      </div>
    </section>
  );
};
