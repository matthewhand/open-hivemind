/**
 * Caption contract for every screenshot embedded in docs/USER_GUIDE.md.
 * Capture must assert every mustSee string is visible before writing PNG.
 *
 * Keep in sync: a structural test parses USER_GUIDE embeds ≡ keys here.
 */

export type GuideEmbed = {
  /** Basename under docs/screenshots/ */
  file: string;
  /** Substrings that must appear in the page at capture time (case-insensitive OK via regex in runner) */
  mustSee: string[];
  /** Primary route or short flow description for operators */
  routeOrFlow: string;
  /** Which suite owns the capture */
  suite: 'journey' | 'recapture';
};

/** Non-journey embeds captured by guide-embed-recapture / specialized specs */
export const RECAPTURE_EMBEDS: GuideEmbed[] = [
  {
    file: 'chat-monitor.png',
    mustSee: ['Activity Feed', 'TOTAL EVENTS'],
    routeOrFlow: '/admin/overview?tab=activity',
    suite: 'recapture',
  },
  {
    file: 'bots-page.png',
    mustSee: ['Bots', 'Create Bot'],
    routeOrFlow: '/admin/bots',
    suite: 'recapture',
  },
  {
    file: 'clone-bot-modal.png',
    mustSee: ['Clone Bot', 'Duplicate Bot'],
    routeOrFlow: '/admin/bots → Configure → Clone Configuration',
    suite: 'recapture',
  },
  {
    file: 'bot-create-page.png',
    mustSee: ['Create', 'Bot'],
    routeOrFlow: '/admin/bots/create',
    suite: 'recapture',
  },
  {
    file: 'message-providers-list.png',
    mustSee: ['Message Providers'],
    routeOrFlow: '/admin/message',
    suite: 'recapture',
  },
  {
    file: 'message-add-provider-modal.png',
    mustSee: ['Provider', 'Create'],
    routeOrFlow: '/admin/message → Create Profile',
    suite: 'recapture',
  },
  {
    file: 'llm-add-profile-modal.png',
    mustSee: ['LLM', 'Provider'],
    routeOrFlow: '/admin/llm → Create Profile',
    suite: 'recapture',
  },
  {
    file: 'guards-modal.png',
    mustSee: ['Create Profile'],
    routeOrFlow: '/admin/guards → Create Profile',
    suite: 'recapture',
  },
  {
    file: 'mcp-tools-list.png',
    mustSee: ['MCP Tools', 'get_weather'],
    routeOrFlow: '/admin/mcp/tools (mocked tools)',
    suite: 'recapture',
  },
  {
    file: 'mcp-tool-run-modal.png',
    mustSee: ['Run', 'get_weather'],
    routeOrFlow: '/admin/mcp/tools → Run Tool',
    suite: 'recapture',
  },
  {
    file: 'mcp-add-server-modal.png',
    mustSee: ['Add Server', 'Server'],
    routeOrFlow: '/admin/mcp/servers → Add Server',
    suite: 'recapture',
  },
  {
    file: 'marketplace-page.png',
    mustSee: ['Marketplace', 'Install from URL'],
    routeOrFlow: '/admin/marketplace',
    suite: 'recapture',
  },
  {
    file: 'marketplace-install-modal.png',
    mustSee: ['Install Package from GitHub', 'GitHub'],
    routeOrFlow: '/admin/marketplace → Install from URL',
    suite: 'recapture',
  },
  {
    file: 'webhook-integration.png',
    mustSee: ['Webhook'],
    routeOrFlow: '/admin/integrations/webhook',
    suite: 'recapture',
  },
  {
    file: 'system-management-page.png',
    mustSee: ['System Management'],
    routeOrFlow: '/admin/system-management',
    suite: 'recapture',
  },
  {
    file: 'static-pages.png',
    mustSee: ['Static Pages'],
    routeOrFlow: '/admin/developer?tab=static-pages',
    suite: 'recapture',
  },
  {
    file: 'demo-mode-banner.png',
    mustSee: ['Demo Mode Active', 'Get Started'],
    routeOrFlow: '/admin/overview with demo status isDemoMode',
    suite: 'recapture',
  },
  {
    file: 'demo-mode-dashboard.png',
    mustSee: ['Demo Mode Active', 'Dashboard'],
    routeOrFlow: '/admin/overview (full shell with banner)',
    suite: 'recapture',
  },
];

/** Journey embeds — mustSee for post-capture verification (journey suite owns write) */
export const JOURNEY_EMBEDS: GuideEmbed[] = [
  {
    file: 'journey-01-onboarding.png',
    mustSee: ['Welcome', 'Open-Hivemind'],
    routeOrFlow: '/onboarding',
    suite: 'journey',
  },
  {
    file: 'journey-02-discord-add.png',
    mustSee: ['Golden-Discord', 'discord'],
    routeOrFlow: 'message profiles',
    suite: 'journey',
  },
  {
    file: 'journey-03-openai-add.png',
    mustSee: ['Golden-OpenAI'],
    routeOrFlow: 'llm profiles',
    suite: 'journey',
  },
  {
    file: 'journey-04-bot-create.png',
    mustSee: ['Golden-Journey-Bot'],
    routeOrFlow: '/admin/bots',
    suite: 'journey',
  },
  {
    file: 'journey-05-bot-chat.png',
    mustSee: ['Golden-Journey-Bot', 'gpt-4o'],
    routeOrFlow: 'bot test drive',
    suite: 'journey',
  },
  {
    file: 'journey-06-activity.png',
    mustSee: ['Activity', 'success'],
    routeOrFlow: 'activity tab',
    suite: 'journey',
  },
  {
    file: 'journey-07-personas.png',
    mustSee: ['Support Concierge'],
    routeOrFlow: '/admin/personas',
    suite: 'journey',
  },
  {
    file: 'journey-08-guards.png',
    mustSee: ['Guards'],
    routeOrFlow: '/admin/guards',
    suite: 'journey',
  },
  {
    file: 'journey-09-memory.png',
    mustSee: ['Golden-Memory'],
    routeOrFlow: '/admin/memory',
    suite: 'journey',
  },
  {
    file: 'journey-10-monitoring.png',
    mustSee: ['Monitoring', 'healthy'],
    routeOrFlow: 'monitoring tab',
    suite: 'journey',
  },
  {
    file: 'journey-11-export.png',
    mustSee: ['Export', 'Backup'],
    routeOrFlow: '/admin/export',
    suite: 'journey',
  },
];

export const ALL_GUIDE_EMBEDS: GuideEmbed[] = [...JOURNEY_EMBEDS, ...RECAPTURE_EMBEDS];

export function embedByFile(file: string): GuideEmbed | undefined {
  return ALL_GUIDE_EMBEDS.find((e) => e.file === file);
}
