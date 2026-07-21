import React from 'react';
import { X } from 'lucide-react';
import Badge from '../../components/DaisyUI/Badge';
import Button from '../../components/DaisyUI/Button';
import Card from '../../components/DaisyUI/Card';
import Checkbox from '../../components/DaisyUI/Checkbox';
import Input from '../../components/DaisyUI/Input';
import Join from '../../components/DaisyUI/Join';
import SearchFilterBar from '../../components/SearchFilterBar';

interface ActivityFiltersProps {
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  selectedBot: string;
  setSelectedBot: (v: string) => void;
  selectedProvider: string;
  setSelectedProvider: (v: string) => void;
  selectedLlmProvider: string;
  setSelectedLlmProvider: (v: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  handleClearFilters: () => void;
  handleQuickTimeRange: (range: '1h' | '6h' | '24h' | '7d' | '30d') => void;
  botOptions: { value: string; label: string }[];
  providerOptions: { value: string; label: string }[];
  llmOptions: { value: string; label: string }[];
  eventTypes: Set<string>;
  toggleEventType: (type: string) => void;
}

export const ActivityFilters: React.FC<ActivityFiltersProps> = ({
  loading,
  searchQuery,
  setSearchQuery,
  selectedBot,
  setSelectedBot,
  selectedProvider,
  setSelectedProvider,
  selectedLlmProvider,
  setSelectedLlmProvider,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  handleClearFilters,
  handleQuickTimeRange,
  botOptions,
  providerOptions,
  llmOptions,
  eventTypes,
  toggleEventType,
}) => {
  return (
    <>
      {/* Filters */}
      <SearchFilterBar
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Filter activity..."
        className={loading ? 'opacity-50 pointer-events-none' : ''}
        onClear={handleClearFilters}
        filters={[
          {
            key: 'bot',
            value: selectedBot,
            onChange: setSelectedBot,
            options: botOptions,
            className: "w-full sm:w-1/4"
          },
          {
            key: 'provider',
            value: selectedProvider,
            onChange: setSelectedProvider,
            options: providerOptions,
            className: "w-full sm:w-1/4"
          },
          {
            key: 'llm',
            value: selectedLlmProvider,
            onChange: setSelectedLlmProvider,
            options: llmOptions,
            className: "w-full sm:w-1/4"
          }
        ]}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Join>
            {(['1h', '6h', '24h', '7d', '30d'] as const).map((range) => (
              <Button
                key={range}
                size="sm"
                variant="ghost"
                className="join-item btn-xs"
                onClick={() => handleQuickTimeRange(range)}
                title={`Last ${range}`}
              >
                {range}
              </Button>
            ))}
          </Join>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input-sm w-auto"
            placeholder="Start Date"
            aria-label="Start date"
          />
          <span className="text-base-content/50">-</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input-sm w-auto"
            placeholder="End Date"
            aria-label="End date"
          />
          {(selectedBot !== 'all' || selectedProvider !== 'all' || selectedLlmProvider !== 'all' || startDate || endDate || searchQuery) && (
             <Button
               size="sm"
               variant="ghost"
               className="btn-square"
               onClick={handleClearFilters}
               title="Clear All Filters"
               aria-label="Clear All Filters"
             >
               <X className="w-4 h-4" />
             </Button>
          )}
        </div>
      </SearchFilterBar>

      {/* Event Type Filter Checkboxes */}
      <Card compact>
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">Filter by type:</span>
          <label className="flex items-center gap-1.5 cursor-pointer text-sm">
            <Checkbox
              checked={eventTypes.has('all')}
              onChange={() => toggleEventType('all')}
              aria-label="Show all event types"
            />
            <span className="text-base-content/70">All</span>
          </label>
          <span className="text-base-content/20">|</span>
          <label className="flex items-center gap-1.5 cursor-pointer text-sm">
            <Checkbox
              checked={eventTypes.has('incoming') || eventTypes.has('all')}
              onChange={() => toggleEventType('incoming')}
              aria-label="Show incoming events"
            />
            <Badge variant="primary" size="xs">📥 Incoming</Badge>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-sm">
            <Checkbox
              checked={eventTypes.has('outgoing') || eventTypes.has('all')}
              onChange={() => toggleEventType('outgoing')}
              aria-label="Show outgoing events"
            />
            <Badge variant="secondary" size="xs">📤 Outgoing</Badge>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-sm">
            <Checkbox
              checked={eventTypes.has('timeout') || eventTypes.has('all')}
              onChange={() => toggleEventType('timeout')}
              aria-label="Show timeout events"
            />
            <Badge variant="warning" size="xs">⏱️ Timeout</Badge>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-sm">
            <Checkbox
              checked={eventTypes.has('error') || eventTypes.has('all')}
              onChange={() => toggleEventType('error')}
              aria-label="Show error events"
            />
            <Badge variant="error" size="xs">❌ Error</Badge>
          </label>
        </div>
      </Card>
    </>
  );
};
