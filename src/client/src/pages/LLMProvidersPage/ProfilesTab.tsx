import React from 'react';
import Card from '../../components/DaisyUI/Card';
import Button from '../../components/DaisyUI/Button';
import Badge from '../../components/DaisyUI/Badge';
import StatsCards from '../../components/DaisyUI/StatsCards';
import EmptyState from '../../components/DaisyUI/EmptyState';
import ConfigKeyValueCard from '../../components/DaisyUI/ConfigKeyValueCard';
import { SkeletonTableLayout } from '../../components/DaisyUI/Skeleton';
import SearchFilterBar from '../../components/SearchFilterBar';
import { LoadingSpinner } from '../../components/DaisyUI/Loading';
import BulkActionBar from '../../components/BulkActionBar';
import Checkbox from '../../components/DaisyUI/Checkbox';
import {
  Brain as BrainIcon,
  Plus as AddIcon,
  Settings as ConfigIcon,
  CheckCircle as CheckIcon,
  XCircle as XIcon,
  AlertCircle as WarningIcon,
  Zap as ZapIcon,
  MessageSquare as ChatIcon,
  Trash2 as DeleteIcon,
  Edit as EditIcon,
  ChevronDown as ExpandIcon,
  ChevronRight as CollapseIcon,
  RefreshCw,
  ToggleLeft as ToggleOffIcon,
  ToggleRight as ToggleOnIcon,
} from 'lucide-react';
import { LLM_PROVIDER_CONFIGS } from '../../types/bot';
import { useBulkSelection } from '../../hooks/useBulkSelection';

export const ProfilesTab: React.FC<{
  profiles: any[];
  filteredProfiles: any[];
  providerTypes: { label: string; value: string }[];
  stats: any[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  filterType: string;
  defaultChatbotProfile: string;
  webuiIntelligenceProvider: string;
  defaultEmbeddingProvider: string;
  libraryStatus: Record<string, { installed: boolean; package: string }>;
  expandedProfile: string | null;
  onSearchChange: (q: string) => void;
  onFilterChange: (f: string) => void;
  onClearError: () => void;
  onRefresh: () => void;
  onAddProfile: () => void;
  onEditProfile: (profile: any) => void;
  onDeleteProfile: (key: string) => void;
  onToggleExpand: (key: string) => void;
  onTestProfile?: (key: string, provider: string) => void;
}> = ({
  profiles,
  filteredProfiles,
  providerTypes,
  stats,
  loading,
  error,
  searchQuery,
  filterType,
  defaultChatbotProfile,
  webuiIntelligenceProvider,
  defaultEmbeddingProvider,
  libraryStatus,
  expandedProfile,
  onSearchChange,
  onFilterChange,
  onClearError,
  onRefresh,
  onAddProfile,
  onEditProfile,
  onDeleteProfile,
  onToggleExpand,
  onTestProfile,
}) => {
    const getProviderIcon = (type: string) => {
      const config = (LLM_PROVIDER_CONFIGS as any)[type as any];
      return config?.icon || <BrainIcon className="w-5 h-5" />;
    };

    const renderLibraryCheck = (type: string) => {
      const status = libraryStatus[type];
      if (!status?.installed)
        return status ? (
          <div className="tooltip tooltip-bottom" data-tip={`Missing: ${status.package}`}>
            <Badge variant="error" size="small" className="gap-1 cursor-help">
              <XIcon className="w-3 h-3" /> Lib Missing
            </Badge>
          </div>
        ) : null;
      return null;
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-end mb-4">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onRefresh} disabled={loading} aria-busy={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant="primary" onClick={onAddProfile}>
              <AddIcon className="w-4 h-4 mr-2" /> Create Profile
            </Button>
          </div>
        </div>

        <StatsCards stats={stats} isLoading={loading} />

        <SearchFilterBar
          searchValue={searchQuery}
          onSearchChange={onSearchChange}
          searchPlaceholder="Search profiles..."
          filters={[
            {
              key: 'type',
              value: filterType,
              onChange: onFilterChange,
              options: [{ label: 'All Types', value: 'all' }, ...providerTypes],
              className: 'w-48',
            },
          ]}
        />

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : profiles.length === 0 ? (
          <EmptyState
            icon={BrainIcon}
            title="No Profiles Created"
            description="Create a custom profile to override system defaults for specific bots."
            actionLabel="Create Profile"
            actionIcon={AddIcon}
            onAction={onAddProfile}
            variant="noData"
          />
        ) : filteredProfiles.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching profiles"
            description="Try adjusting your search or filters."
            actionLabel="Clear Filters"
            onAction={() => {
              onSearchChange('');
              onFilterChange('all');
            }}
            variant="noResults"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredProfiles.map((profile) => (
              <Card
                key={profile.key}
                className="bg-base-100 shadow-sm border border-base-200 transition-all hover:shadow-md"
              >
                <div className="card-body p-0">
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer"
                    onClick={() => onToggleExpand(profile.key)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 text-primary rounded-xl">
                        {getProviderIcon(profile.provider)}
                      </div>
                      <div>
                        <h2 className="font-bold text-lg flex items-center gap-2">
                          {profile.name}
                          <span className="text-xs font-normal opacity-80 px-2 py-0.5 bg-base-200 rounded-full font-mono">
                            {profile.key}
                          </span>
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" size="small" style="outline">
                            {profile.provider}
                          </Badge>
                          {profile.source === 'env' && (
                            <Badge variant="info" size="small" style="outline">
                              env
                            </Badge>
                          )}
                          <Badge
                            variant={
                              normalizeModelType(profile.modelType) === 'embedding'
                                ? 'warning'
                                : normalizeModelType(profile.modelType) === 'both'
                                  ? 'info'
                                  : 'neutral'
                            }
                            size="small"
                          >
                            {normalizeModelType(profile.modelType)}
                          </Badge>
                          {renderLibraryCheck(profile.provider)}
                          {profile.key === defaultChatbotProfile && (
                            <Badge variant="primary" size="small">
                              Default Chatbot
                            </Badge>
                          )}
                          {profile.key === webuiIntelligenceProvider && (
                            <Badge variant="warning" size="small">
                              WebUI AI
                            </Badge>
                          )}
                          {profile.key === defaultEmbeddingProvider && (
                            <Badge variant="secondary" size="small">
                              Default Embedding
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {onTestProfile && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-success hover:bg-success/10"
                          aria-label={`Test ${profile.name} provider`}
                          onClick={(e) => { e.stopPropagation(); onTestProfile(profile.key, profile.provider); }}
                        >
                          <ChatIcon className="w-4 h-4" />
                        </Button>
                      )}
                      {profile.source !== 'env' && (
                        <>
                          <Button size="sm" variant="ghost" aria-label={`Edit ${profile.name} profile`} onClick={(e) => { e.stopPropagation(); onEditProfile(profile); }}>
                            <EditIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-error hover:bg-error/10"
                            aria-label={`Delete ${profile.name} profile`}
                            onClick={(e) => { e.stopPropagation(); onDeleteProfile(profile.key); }}
                          >
                            <DeleteIcon className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={expandedProfile === profile.key ? 'Collapse details' : 'Expand details'}
                        onClick={() => onToggleExpand(profile.key)}
                      >
                        {expandedProfile === profile.key ? (
                          <CollapseIcon className="w-4 h-4" />
                        ) : (
                          <ExpandIcon className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {expandedProfile === profile.key && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="bg-base-200/50 rounded-xl p-4 border border-base-200">
                        <h4 className="text-xs font-bold uppercase opacity-50 mb-3 flex items-center gap-2">
                          <ConfigIcon className="w-3 h-3" /> Configuration
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {Object.entries(profile.config || {}).map(([k, v]) => (
                            <div
                              key={k}
                              className="bg-base-100 p-2 rounded border border-base-200/50 flex flex-col"
                            >
                              <span className="font-mono text-[10px] opacity-50 uppercase tracking-wider mb-1">
                                {k}
                              </span>
                              <span className="font-medium text-sm truncate" title={String(v)}>
                                {String(k).toLowerCase().includes('key') ||
                                  String(k).toLowerCase().includes('token') ||
                                  String(k).toLowerCase().includes('password')
                                  ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'
                                  : String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };
