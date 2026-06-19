/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { memo } from 'react';
import Card from '../DaisyUI/Card';
import Button from '../DaisyUI/Button';
import Badge from '../DaisyUI/Badge';
import {
  Download as DownloadIcon,
  RefreshCw as UpdateIcon,
  Trash2 as UninstallIcon,
  Star as StarIcon,
  ExternalLink as ExternalLinkIcon,
  Brain as LLMIcon,
  MessageCircle as MessageIcon,
  Database as MemoryIcon,
  Wrench as ToolIcon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MarketplacePackage {
  name: string;
  displayName: string;
  description: string;
  type: 'llm' | 'message' | 'memory' | 'tool';
  version: string;
  status: 'built-in' | 'installed' | 'available';
  repoUrl?: string;
  feedbackUrl?: string;
  rating?: number;
  installedAt?: string;
  updatedAt?: string;
}

export interface MarketplaceCardProps {
  pkg: MarketplacePackage;
  isBusy?: boolean;
  actionInProgress?: string | null;
  onInstall?: (pkg: MarketplacePackage) => void;
  onUpdate?: (name: string) => void;
  onUninstall?: (name: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_ICONS = {
  llm: LLMIcon,
  message: MessageIcon,
  memory: MemoryIcon,
  tool: ToolIcon,
} as const;

const TYPE_COLORS = {
  llm: 'secondary',
  message: 'primary',
  memory: 'accent',
  tool: 'info',
} as const;

// Static full class strings — Tailwind JIT can't see interpolated names like
// `bg-${color}/10`, so those get purged and render colorless. Keep them verbatim.
const TYPE_ICON_BG = {
  llm: 'bg-secondary/10',
  message: 'bg-primary/10',
  memory: 'bg-accent/10',
  tool: 'bg-info/10',
} as const;
const TYPE_ICON_TEXT = {
  llm: 'text-secondary',
  message: 'text-primary',
  memory: 'text-accent',
  tool: 'text-info',
} as const;

const STATUS_BADGES = {
  'built-in': { label: 'Built-in', color: 'neutral' as const },
  installed: { label: 'Installed', color: 'success' as const },
  available: { label: 'Available', color: 'info' as const },
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MarketplaceCard: React.FC<MarketplaceCardProps> = ({
  pkg,
  isBusy = false,
  actionInProgress,
  onInstall,
  onUpdate,
  onUninstall,
}) => {
  const Icon = TYPE_ICONS[pkg.type];
  const color = TYPE_COLORS[pkg.type];
  const statusBadge = STATUS_BADGES[pkg.status];

  return (
    <Card className="bg-base-200 hover:bg-base-300 transition-colors">
      <Card.Body className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${TYPE_ICON_BG[pkg.type]}`}>
              <Icon className={`w-5 h-5 ${TYPE_ICON_TEXT[pkg.type]}`} />
            </div>
            <div>
              <h2 className="font-semibold">{pkg.displayName}</h2>
              <p className="text-xs text-base-content/80 font-mono">{pkg.name}</p>
            </div>
          </div>
          <Badge variant={statusBadge.color} size="sm">
            {statusBadge.label}
          </Badge>
        </div>

        <p className="text-sm text-base-content/70 mb-3 line-clamp-2">
          {pkg.description}
        </p>

        <div className="flex items-center justify-between text-xs text-base-content/80 mb-3">
          <span>v{pkg.version}</span>
          <span className="uppercase badge badge-sm badge-ghost">{pkg.type}</span>
        </div>

        {/* Star Rating & Feedback */}
        <div className="flex items-center justify-between mb-3">
          <div
            className="flex items-center gap-1"
            data-testid={`star-rating-${pkg.name}`}
            role="img"
            aria-label={`Rating: ${pkg.rating ?? 0} out of 5 stars`}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <StarIcon
                key={star}
                data-testid={`star-${star}`}
                className={`w-4 h-4 ${
                  (pkg.rating ?? 0) >= star
                    ? 'fill-warning text-warning'
                    : 'text-base-content/30'
                }`}
              />
            ))}
          </div>
          {pkg.feedbackUrl ? (
            <a
              href={pkg.feedbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link link-primary text-xs flex items-center gap-1"
              data-testid={`feedback-link-${pkg.name}`}
            >
              Feedback <ExternalLinkIcon className="w-3 h-3" />
            </a>
          ) : pkg.repoUrl ? (
            <a
              href={`${pkg.repoUrl}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className="link link-primary text-xs flex items-center gap-1"
              data-testid={`feedback-link-${pkg.name}`}
            >
              Feedback <ExternalLinkIcon className="w-3 h-3" />
            </a>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {pkg.status === 'installed' && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onUpdate?.(pkg.name)}
                disabled={isBusy}
              >
                {actionInProgress === `update-${pkg.name}` ? (
                  <span className="loading loading-spinner loading-xs" aria-hidden="true"></span>
                ) : (
                  <UpdateIcon className="w-4 h-4" />
                )}
                Update
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUninstall?.(pkg.name)}
                disabled={isBusy}
              >
                {actionInProgress === `uninstall-${pkg.name}` ? (
                  <span className="loading loading-spinner loading-xs" aria-hidden="true"></span>
                ) : (
                  <UninstallIcon className="w-4 h-4 text-error" />
                )}
              </Button>
            </>
          )}
          {pkg.status === 'available' && (
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() => onInstall?.(pkg)}
              disabled={isBusy}
            >
              <DownloadIcon className="w-4 h-4 mr-1" />
              Install
            </Button>
          )}
          {pkg.status === 'built-in' && (
            <span className="text-xs text-base-content/80 italic w-full text-center">
              Included with open-hivemind
            </span>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

// ⚡ Bolt Optimization: Added React.memo() to prevent unnecessary re-renders of the MarketplaceCard in large grids.
export default memo(MarketplaceCard);
