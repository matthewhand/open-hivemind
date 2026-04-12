/**
 * GettingStarted — checklist-style setup guide shown on the dashboard.
 *
 * Inspired by the "Get started" panel from Anthropic Console:
 * - Title + "N of M completed" subtitle
 * - Each task shows icon, title, description and an action button
 * - Completed tasks display a green tick and the title is struck-through
 * - A "Dismiss" button hides the whole panel (saved to localStorage)
 */

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Cpu, Bot, MessageSquare, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

interface TaskStatus {
  llmConfigured: boolean;
  botConfigured: boolean;
  messengerConfigured: boolean;
}

interface Task {
  id: keyof TaskStatus;
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  actionLink: string;
}

const TASKS: Task[] = [
  {
    id: 'llmConfigured',
    icon: <Cpu className="w-5 h-5" />,
    title: 'Connect an LLM provider',
    description: 'Add an OpenAI, Anthropic, Ollama, or other AI model to power your bots.',
    actionLabel: 'Start',
    actionLink: '/admin/providers/llm',
  },
  {
    id: 'messengerConfigured',
    icon: <MessageSquare className="w-5 h-5" />,
    title: 'Connect a messenger',
    description: 'Link Discord, Slack, Mattermost, or another platform to your bots.',
    actionLabel: 'Start',
    actionLink: '/admin/providers/message',
  },
  {
    id: 'botConfigured',
    icon: <Bot className="w-5 h-5" />,
    title: 'Create a bot',
    description: 'Set up your first AI agent — assign an LLM, a persona, and a messaging platform.',
    actionLabel: 'Start',
    actionLink: '/admin/bots',
  },
];

interface GettingStartedProps {
  onDismiss?: () => void;
}

const GettingStarted: React.FC<GettingStartedProps> = ({ onDismiss }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<TaskStatus>({
    llmConfigured: false,
    botConfigured: false,
    messengerConfigured: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService
      .get<any>('/api/dashboard/config-status')
      .then((data: any) => {
        const s = data?.data || data;
        setStatus({
          llmConfigured: !!s?.llmConfigured,
          botConfigured: !!s?.botConfigured,
          messengerConfigured: !!s?.messengerConfigured,
        });
      })
      .catch(() => {/* proceed with defaults */})
      .finally(() => setLoading(false));
  }, []);

  const completedCount = TASKS.filter((t) => status[t.id]).length;
  const totalCount = TASKS.length;

  return (
    <div data-testid="getting-started-panel" className="rounded-xl border border-base-300 bg-base-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-3">
        <div>
          <h3 className="font-bold text-base">Get started</h3>
          <p className="text-sm text-base-content/50 mt-0.5">
            {loading ? 'Loading…' : `${completedCount} of ${totalCount} completed`}
          </p>
        </div>
        {onDismiss && (
          <button
            className="btn btn-ghost btn-sm text-base-content/40 hover:text-base-content/70 -mt-1 -mr-1"
            onClick={onDismiss}
            aria-label="Dismiss getting started"
          >
            Dismiss
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="divider my-0 mx-5 opacity-50" />

      {/* Task list */}
      <ul className="divide-y divide-base-200">
        {TASKS.map((task) => {
          const done = status[task.id];
          return (
            <li
              key={task.id}
              className={`flex items-center gap-4 px-5 py-4 transition-colors ${
                done ? 'opacity-60' : 'hover:bg-base-200/40'
              }`}
            >
              {/* Status icon */}
              <div className={`flex-shrink-0 ${done ? 'text-success' : 'text-base-content/30'}`}>
                {done ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </div>

              {/* Task icon */}
              <div
                className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                  done ? 'bg-base-200 text-base-content/40' : 'bg-primary/10 text-primary'
                }`}
              >
                {task.icon}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${done ? 'line-through text-base-content/40' : ''}`}>
                  {task.title}
                </p>
                <p className="text-xs text-base-content/50 mt-0.5 truncate">{task.description}</p>
              </div>

              {/* Action button — only shown when not done */}
              {!done && (
                <button
                  className="btn btn-sm btn-ghost border border-base-300 flex-shrink-0"
                  onClick={() => navigate(task.actionLink)}
                >
                  {task.actionLabel}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default GettingStarted;
