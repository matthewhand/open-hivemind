/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React from 'react';
import { Wrench as ToolIcon } from 'lucide-react';
import Card from '../components/DaisyUI/Card';

const ToolProvidersPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <ToolIcon className="w-6 h-6" />
        <div>
          <h1 className="text-2xl font-bold">Tool Providers</h1>
          <p className="text-sm opacity-60">Manage MCP and tool integrations for your bots.</p>
        </div>
      </div>
      <Card className="bg-base-100 shadow-sm border border-base-200">
        <div className="card-body items-center text-center p-10">
          <ToolIcon className="w-12 h-12 opacity-30 mb-2" />
          <h2 className="font-bold text-lg">Coming Soon</h2>
          <p className="text-sm opacity-60">
            Tool provider management is under development. Use the MCP Servers page to manage tool integrations.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ToolProvidersPage;
