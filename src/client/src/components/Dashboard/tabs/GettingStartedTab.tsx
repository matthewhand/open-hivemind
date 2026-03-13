import React from 'react';
import Card from '../../DaisyUI/Card';
import Button from '../../DaisyUI/Button';
import { Shield, Sparkles, BookOpen, ArrowRight, Video } from 'lucide-react';
import { Link } from 'react-router-dom';

interface GettingStartedTabProps {
  botsLength: number;
}

export function GettingStartedTab({ botsLength }: GettingStartedTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <Card className="bg-base-100 shadow-md hover:shadow-lg transition-shadow border-t-4 border-t-primary">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="card-title text-lg">Define Personas</h2>
          </div>
          <p className="text-sm text-base-content/70 flex-grow">
            Give your agents unique personalities, instructions, and communication styles.
          </p>
          <div className="card-actions justify-end mt-4">
            <Link to="/admin/personas">
              <Button variant="ghost" size="small" endIcon={<ArrowRight className="w-4 h-4" />}>
                Manage Personas
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      <Card className="bg-base-100 shadow-md hover:shadow-lg transition-shadow border-t-4 border-t-secondary">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="card-title text-lg">Configure Guards</h2>
          </div>
          <p className="text-sm text-base-content/70 flex-grow">
            Set up Model Context Protocol (MCP) servers and establish tool usage permissions.
          </p>
          <div className="card-actions justify-end mt-4">
            <Link to="/admin/guards">
              <Button variant="ghost" size="small" endIcon={<ArrowRight className="w-4 h-4" />}>
                Setup Guards
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      <Card className="bg-base-100 shadow-md hover:shadow-lg transition-shadow border-t-4 border-t-accent">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-accent/10 rounded-lg text-accent">
              <BookOpen className="w-6 h-6" />
            </div>
            <h2 className="card-title text-lg">Agent Blueprints</h2>
          </div>
          <p className="text-sm text-base-content/70 flex-grow">
            Browse built-in templates or use your existing {botsLength} configuration{botsLength === 1 ? '' : 's'} as a starting point.
          </p>
          <div className="card-actions justify-end mt-4">
            <Link to="/admin/bots">
              <Button variant="ghost" size="small" endIcon={<ArrowRight className="w-4 h-4" />}>
                View Blueprints
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      <Card className="bg-base-100 shadow-md md:col-span-2 xl:col-span-3 mt-4">
        <div className="card-body flex flex-col md:flex-row items-center gap-6">
          <div className="flex-grow">
            <h2 className="card-title text-xl mb-2">Need Help Getting Started?</h2>
            <p className="text-base-content/70">
              Watch our 3-minute quickstart guide to learn how to deploy your first guarded agent to Discord or Slack.
            </p>
          </div>
          <Button variant="outline" startIcon={<Video className="w-5 h-5" />} onClick={() => window.open('https://github.com/matthewhand/open-hivemind', '_blank')}>
            Watch Tutorial
          </Button>
        </div>
      </Card>
    </div>
  );
}
