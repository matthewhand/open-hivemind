import React from 'react';
import Card from '../../DaisyUI/Card';
import { ArrowRight, FileText, Settings, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

export const GettingStartedTab: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {/* 1. Configuration Setup */}
      <Card
        className="shadow-md hover:shadow-lg transition-all duration-300 border border-primary/20 bg-gradient-to-br from-base-100 to-primary/5 hover:-translate-y-1 group"
        bodyClassName="p-6 flex flex-col h-full"
      >
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4 text-primary group-hover:scale-110 transition-transform">
          <Settings className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold mb-2">1. System Config</h3>
        <p className="text-base-content/70 flex-grow mb-6 leading-relaxed">
          Configure API keys, system globals, and authentication in the global settings area.
        </p>
        <Link to="/admin/config" className="btn btn-primary w-full group/btn relative overflow-hidden">
          <span className="relative z-10 flex items-center justify-center">
            Configure Globals <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
          </span>
        </Link>
      </Card>

      {/* 2. Provider Integration */}
      <Card
        className="shadow-md hover:shadow-lg transition-all duration-300 border border-secondary/20 bg-gradient-to-br from-base-100 to-secondary/5 hover:-translate-y-1 group"
        bodyClassName="p-6 flex flex-col h-full"
      >
        <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center mb-4 text-secondary group-hover:scale-110 transition-transform">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold mb-2">2. Setup Providers</h3>
        <p className="text-base-content/70 flex-grow mb-6 leading-relaxed">
          Connect your Large Language Models (LLMs) and select supported message routing integrations.
        </p>
        <div className="grid grid-cols-2 gap-2 mt-auto">
          <Link to="/admin/llm-providers" className="btn btn-secondary btn-sm flex-1">
            LLMs
          </Link>
          <Link to="/admin/message-providers" className="btn btn-secondary btn-sm flex-1">
            Messengers
          </Link>
        </div>
      </Card>

      {/* 3. Create Bots */}
      <Card
        className="shadow-md hover:shadow-lg transition-all duration-300 border border-accent/20 bg-gradient-to-br from-base-100 to-accent/5 hover:-translate-y-1 group"
        bodyClassName="p-6 flex flex-col h-full"
      >
        <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center mb-4 text-accent group-hover:scale-110 transition-transform">
          <Play className="w-6 h-6 ml-1" />
        </div>
        <h3 className="text-xl font-bold mb-2">3. Build Bots</h3>
        <p className="text-base-content/70 flex-grow mb-6 leading-relaxed">
          Create AI personas, define safety guards, and deploy conversational agents to your channels.
        </p>
        <Link to="/admin/bots" className="btn btn-accent w-full group/btn">
          Manage Bots <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
        </Link>
      </Card>
    </div>
  );
};
