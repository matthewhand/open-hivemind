import React from 'react';
import PageHeader from '../components/DaisyUI/PageHeader';
import Accordion from '../components/DaisyUI/Accordion';
import Card from '../components/DaisyUI/Card';
import Kbd from '../components/DaisyUI/Kbd';
import Badge from '../components/DaisyUI/Badge';
import { HelpCircle, BookOpen, Keyboard, Settings } from 'lucide-react';

const faqItems = [
  {
    id: 'what-is',
    title: 'What is Open-Hivemind?',
    content: (
      <p>Open-Hivemind is a multi-agent orchestration framework that lets you deploy coordinated AI bots across Discord, Slack, and Mattermost simultaneously. Each bot can have its own personality, memory, and response behavior.</p>
    ),
  },
  {
    id: 'get-started',
    title: 'How do I get started?',
    content: (
      <div className="space-y-2">
        <p>1. <strong>Configure an LLM provider</strong> — Go to LLM Providers and add your OpenAI API key (or other provider).</p>
        <p>2. <strong>Create a persona</strong> — Go to Personas and create a personality for your bot.</p>
        <p>3. <strong>Create a bot</strong> — Go to Bots and create a new bot, assigning it a persona and message provider (Discord, Slack, etc.).</p>
        <p>4. <strong>Connect</strong> — Add your platform tokens (Discord bot token, Slack app token, etc.) and the bot will come online.</p>
      </div>
    ),
  },
  {
    id: 'response-behavior',
    title: 'How does the bot decide when to respond?',
    content: (
      <div className="space-y-2">
        <p>Bots use a probability-based system with multiple modifiers:</p>
        <ul className="list-disc ml-6 space-y-1">
          <li><strong>Base chance</strong> — Starting probability of an unsolicited response</li>
          <li><strong>Mention bonus</strong> — Extra probability when directly @mentioned</li>
          <li><strong>Off-topic penalty</strong> — Reduced chance for irrelevant messages</li>
          <li><strong>Burst traffic penalty</strong> — Stays quieter in busy channels</li>
          <li><strong>Only when spoken to</strong> — Only responds when directly addressed</li>
        </ul>
        <p>These can be configured globally or per-persona in the Response Behavior section.</p>
      </div>
    ),
  },
  {
    id: 'multiple-bots',
    title: 'Can I run multiple bots at once?',
    content: (
      <p>Yes! Open-Hivemind is designed for multi-agent orchestration. You can run as many bots as you want, each with different personas, LLM providers, and platform connections. They have built-in "social awareness" to avoid talking over each other.</p>
    ),
  },
  {
    id: 'providers',
    title: 'Which LLM providers are supported?',
    content: (
      <div className="space-y-2">
        <p>Currently supported providers:</p>
        <div className="flex flex-wrap gap-2">
          <Badge color="primary">OpenAI</Badge>
          <Badge color="secondary">Anthropic</Badge>
          <Badge color="accent">Flowise</Badge>
          <Badge color="info">Ollama</Badge>
          <Badge>Perplexity</Badge>
          <Badge>Replicate</Badge>
          <Badge>n8n</Badge>
          <Badge>OpenSwarm</Badge>
        </div>
        <p className="text-sm opacity-60 mt-2">New providers can be added via the packages system.</p>
      </div>
    ),
  },
  {
    id: 'guard-profiles',
    title: 'What are Guard Profiles?',
    content: (
      <p>Guard Profiles are safety rules you can apply to bots. They include access control (who can talk to the bot), rate limiting (how often it responds), and content filtering (blocking certain topics or words). Create them in the Guards page and assign to bots.</p>
    ),
  },
  {
    id: 'mcp-servers',
    title: 'What are MCP Servers?',
    content: (
      <p>MCP (Model Context Protocol) servers give your bots access to external tools — web search, file operations, database queries, etc. Connect MCP servers in the MCP Servers page and bots can use their tools during conversations.</p>
    ),
  },
  {
    id: 'env-vs-webui',
    title: 'Should I configure via .env or the WebUI?',
    content: (
      <div className="space-y-2">
        <p><strong>Developers</strong> — Set API keys and platform tokens in <code className="kbd kbd-sm">.env</code> for security. These appear as read-only "System Default" providers in the WebUI.</p>
        <p><strong>Admins</strong> — Use the WebUI for everything else: creating bots, personas, guard profiles, and managing settings. Changes are saved to config files and persist across restarts.</p>
      </div>
    ),
  },
];

const shortcutItems = [
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    content: (
      <div className="space-y-3">
        <div>
          <h4 className="font-semibold text-sm mb-2">Global</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span><Kbd size="sm">Ctrl</Kbd> + <Kbd size="sm">K</Kbd></span><span className="opacity-70">Command palette</span>
            <span><Kbd size="sm">Shift</Kbd> + <Kbd size="sm">?</Kbd></span><span className="opacity-70">Show all shortcuts</span>
            <span><Kbd size="sm">Esc</Kbd></span><span className="opacity-70">Close modal/overlay</span>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-2">Navigation</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span><Kbd size="sm">H</Kbd></span><span className="opacity-70">Overview</span>
            <span><Kbd size="sm">B</Kbd></span><span className="opacity-70">Bots</span>
            <span><Kbd size="sm">P</Kbd></span><span className="opacity-70">Personas</span>
            <span><Kbd size="sm">L</Kbd></span><span className="opacity-70">LLM Providers</span>
            <span><Kbd size="sm">M</Kbd></span><span className="opacity-70">Monitoring</span>
            <span><Kbd size="sm">Shift</Kbd> + <Kbd size="sm">G</Kbd></span><span className="opacity-70">Settings</span>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-2">Actions</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span><Kbd size="sm">Ctrl</Kbd> + <Kbd size="sm">N</Kbd></span><span className="opacity-70">Create new bot</span>
            <span><Kbd size="sm">/</Kbd></span><span className="opacity-70">Focus search</span>
          </div>
        </div>
      </div>
    ),
  },
];

const HelpPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Help & FAQ"
        description="Common questions, keyboard shortcuts, and getting started guides."
        icon={HelpCircle}
      />

      <Card className="shadow-sm border border-base-200">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Frequently Asked Questions
        </h2>
        <Accordion
          items={faqItems}
          allowMultiple
          variant="bordered"
          indicatorStyle="plus"
        />
      </Card>

      <Card className="shadow-sm border border-base-200">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Keyboard className="w-5 h-5 text-primary" /> Keyboard Shortcuts
        </h2>
        <Accordion
          items={shortcutItems}
          variant="bordered"
          indicatorStyle="plus"
          defaultOpenItems={['shortcuts']}
        />
      </Card>
    </div>
  );
};

export default HelpPage;
