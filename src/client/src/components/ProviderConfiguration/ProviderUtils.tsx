import React from 'react';
import { MessageSquare, Bot, Cpu, Webhook, HelpCircle, Hash, Zap, Server } from 'lucide-react';

/**
 * Provider type definitions
 */
export type MessageProvider = 'discord' | 'slack' | 'mattermost' | 'webhook' | 'custom';
export type LlmProvider = 'openai' | 'flowise' | 'openwebui' | 'local' | 'custom';
export type ProviderCategory = 'message' | 'llm' | 'other';

/**
 * Provider metadata interface
 */
export interface ProviderMetadata {
    id: string;
    name: string;
    category: ProviderCategory;
    description: string;
    badgeColor: string;
    icon: React.ComponentType<{ className?: string }>;
    websiteUrl: string;
    isPopular: boolean;
}

/**
 * Centralized provider metadata registry
 * This ensures consistent UI representation across all components
 */
export const PROVIDER_METADATA: Record<string, ProviderMetadata> = {
    // Message Providers
    discord: {
        id: 'discord',
        name: 'Discord',
        category: 'message',
        description: 'Discord Bot integration for community chat',
        badgeColor: 'badge-primary',
        icon: MessageSquare,
        websiteUrl: 'https://discord.com/developers/applications',
        isPopular: true,
    },
    slack: {
        id: 'slack',
        name: 'Slack',
        category: 'message',
        description: 'Slack Bot integration for workspace messaging',
        badgeColor: 'badge-secondary',
        icon: Hash,
        websiteUrl: 'https://api.slack.com/apps',
        isPopular: true,
    },
    mattermost: {
        id: 'mattermost',
        name: 'Mattermost',
        category: 'message',
        description: 'Mattermost integration for team collaboration',
        badgeColor: 'badge-info',
        icon: Zap,
        websiteUrl: 'https://developers.mattermost.com/integrate/',
        isPopular: true,
    },
    webhook: {
        id: 'webhook',
        name: 'Webhook',
        category: 'message',
        description: 'Generic webhook integration',
        badgeColor: 'badge-warning',
        icon: Webhook,
        websiteUrl: '',
        isPopular: false,
    },

    // LLM Providers
    openai: {
        id: 'openai',
        name: 'OpenAI',
        category: 'llm',
        description: 'OpenAI GPT models for advanced AI responses',
        badgeColor: 'badge-success',
        icon: Bot,
        websiteUrl: 'https://platform.openai.com/',
        isPopular: true,
    },
    flowise: {
        id: 'flowise',
        name: 'Flowise',
        category: 'llm',
        description: 'Flowise AI workflow integration',
        badgeColor: 'badge-accent',
        icon: Cpu,
        websiteUrl: 'https://flowiseai.com/',
        isPopular: false,
    },
    openwebui: {
        id: 'openwebui',
        name: 'Open WebUI',
        category: 'llm',
        description: 'Open WebUI integration for local LLMs',
        badgeColor: 'badge-neutral',
        icon: Server,
        websiteUrl: 'https://openwebui.com/',
        isPopular: true,
    },
    local: {
        id: 'local',
        name: 'Local LLM',
        category: 'llm',
        description: 'Locally hosted LLM integration',
        badgeColor: 'badge-ghost',
        icon: Cpu,
        websiteUrl: '',
        isPopular: false,
    },
};

/**
 * Get provider metadata by ID
 */
export const getProviderMetadata = (providerId: string): ProviderMetadata | undefined => {
    return PROVIDER_METADATA[providerId.toLowerCase()];
};

/**
 * Get badge color class for a provider
 */
export const getProviderBadgeColor = (provider: string): string => {
    const metadata = getProviderMetadata(provider);
    return metadata?.badgeColor || 'badge-ghost';
};

/**
 * Get provider display name
 */
export const getProviderDisplayName = (provider: string): string => {
    const metadata = getProviderMetadata(provider);
    return metadata?.name || provider || 'Unknown';
};

/**
 * Get provider icon component
 */
export const getProviderIcon = (provider: string): React.ComponentType<{ className?: string }> => {
    const metadata = getProviderMetadata(provider);
    return metadata?.icon || HelpCircle;
};

/**
 * Get all providers by category
 */
export const getProvidersByCategory = (category: ProviderCategory): ProviderMetadata[] => {
    return Object.values(PROVIDER_METADATA).filter(p => p.category === category);
};

/**
 * Get popular providers
 */
export const getPopularProviders = (): ProviderMetadata[] => {
    return Object.values(PROVIDER_METADATA).filter(p => p.isPopular);
};

/**
 * Provider badge component with icon
 */
export interface ProviderBadgeProps {
    provider: string;
    showIcon?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const ProviderBadge: React.FC<ProviderBadgeProps> = ({
    provider,
    showIcon = true,
    size = 'md',
    className = '',
}) => {
    const metadata = getProviderMetadata(provider);
    const displayName = metadata?.name || provider || 'Unknown';
    const Icon = metadata?.icon || HelpCircle;
    const badgeColor = metadata?.badgeColor || 'badge-ghost';

    const sizeClasses = {
        sm: 'badge-sm gap-1',
        md: 'gap-1',
        lg: 'badge-lg gap-1.5',
    };

    const iconSizes = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5',
    };

    return (
        <span className={`badge ${badgeColor} ${sizeClasses[size]} ${className}`}>
            {showIcon && <Icon className={iconSizes[size]} />}
            {displayName}
        </span>
    );
};

/**
 * Provider card component for selection UI
 */
export interface ProviderCardProps {
    provider: string;
    isSelected?: boolean;
    onClick?: () => void;
    disabled?: boolean;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({
    provider,
    isSelected = false,
    onClick,
    disabled = false,
}) => {
    const metadata = getProviderMetadata(provider);
    const displayName = metadata?.name || provider || 'Unknown';
    const description = metadata?.description || 'Custom provider';
    const Icon = metadata?.icon || HelpCircle;
    const badgeColor = metadata?.badgeColor?.replace('badge-', '') || 'ghost';

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`
        relative flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-200
        ${isSelected
                    ? `border-${badgeColor} bg-${badgeColor}/10 ring-2 ring-${badgeColor}/50`
                    : 'border-base-300 hover:border-base-content/30 bg-base-100'
                }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
            aria-pressed={isSelected}
            aria-label={`Select ${displayName}`}
        >
            <Icon className={`w-8 h-8 mb-2 ${isSelected ? `text-${badgeColor}` : 'text-base-content/60'}`} />
            <span className="font-semibold text-sm text-center">{displayName}</span>
            <span className="text-xs text-base-content/50 text-center mt-1 line-clamp-2">
                {description}
            </span>
            {isSelected && (
                <span className="absolute top-2 right-2">
                    <span className={`badge badge-${badgeColor} badge-xs`}>Selected</span>
                </span>
            )}
        </button>
    );
};

export default ProviderBadge;
