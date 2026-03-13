/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useMemo } from 'react';
import Card from '../DaisyUI/Card';
import Button from '../DaisyUI/Button';
import Badge from '../DaisyUI/Badge';
import EmptyState from '../DaisyUI/EmptyState';
import { LoadingSpinner } from '../DaisyUI/Loading';
import SearchFilterBar from '../SearchFilterBar';
import {
  Settings as ConfigIcon,
  Trash2 as DeleteIcon,
  Edit as EditIcon,
  ChevronDown as ExpandIcon,
  ChevronRight as CollapseIcon,
  Search,
} from 'lucide-react';

export interface ProfileItem {
  key: string;
  name: string;
  provider: string;
  config?: any;
  [key: string]: any;
}

interface GenericProvidersListProps {
  profiles: ProfileItem[];
  loading: boolean;
  emptyStateIcon: React.ElementType;
  emptyStateTitle: string;
  emptyStateDescription: string;
  onAddProfile: () => void;
  onEditProfile: (profile: ProfileItem) => void;
  onDeleteProfile: (key: string) => void;
  getProviderIcon: (type: string) => React.ReactNode;
  renderExtraBadges?: (profile: ProfileItem) => React.ReactNode;
}

const GenericProvidersList: React.FC<GenericProvidersListProps> = ({
  profiles,
  loading,
  emptyStateIcon,
  emptyStateTitle,
  emptyStateDescription,
  onAddProfile,
  onEditProfile,
  onDeleteProfile,
  getProviderIcon,
  renderExtraBadges,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null);

  const toggleExpand = (key: string) => setExpandedProfile(expandedProfile === key ? null : key);

  const filteredProfiles = useMemo(() =>
    profiles.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.provider.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || p.provider === filterType;
      return matchesSearch && matchesType;
    }), [profiles, searchQuery, filterType]);

  const providerTypes = useMemo(() => {
    const types = new Set(profiles.map(p => p.provider));
    return Array.from(types).map(type => ({ label: type, value: type }));
  }, [profiles]);

  return (
    <div className="space-y-6">
      <SearchFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search profiles..."
        filters={[{
          key: 'type',
          value: filterType,
          onChange: setFilterType,
          options: [{ label: 'All Types', value: 'all' }, ...providerTypes],
          className: 'w-48',
        }]}
      />

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : profiles.length === 0 ? (
        <EmptyState
          icon={emptyStateIcon}
          title={emptyStateTitle}
          description={emptyStateDescription}
          actionLabel="Create Profile"
          onAction={onAddProfile}
          variant="noData"
        />
      ) : filteredProfiles.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching profiles"
          description="Try adjusting your search or filters."
          actionLabel="Clear Filters"
          onAction={() => { setSearchQuery(''); setFilterType('all'); }}
          variant="noResults"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredProfiles.map((profile) => (
            <Card key={profile.key} className="bg-base-100 shadow-sm border border-base-200 transition-all hover:shadow-md">
              <div className="card-body p-0">
                <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(profile.key)}>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 text-primary rounded-xl">
                      {getProviderIcon(profile.provider)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        {profile.name}
                        <span className="text-xs font-normal opacity-50 px-2 py-0.5 bg-base-200 rounded-full font-mono">{profile.key}</span>
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" size="small" style="outline">{profile.provider}</Badge>
                        {renderExtraBadges && renderExtraBadges(profile)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => onEditProfile(profile)}>
                      <EditIcon className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-error hover:bg-error/10" onClick={() => onDeleteProfile(profile.key)}>
                      <DeleteIcon className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleExpand(profile.key)}>
                      {expandedProfile === profile.key ? <CollapseIcon className="w-4 h-4" /> : <ExpandIcon className="w-4 h-4" />}
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
                          <div key={k} className="bg-base-100 p-2 rounded border border-base-200/50 flex flex-col">
                            <span className="font-mono text-[10px] opacity-50 uppercase tracking-wider mb-1">{k}</span>
                            <span className="font-medium text-sm truncate" title={String(v)}>
                              {String(k).toLowerCase().includes('key') || String(k).toLowerCase().includes('token') || String(k).toLowerCase().includes('password') || String(k).toLowerCase().includes('secret')
                                ? '••••••••'
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

export default GenericProvidersList;
