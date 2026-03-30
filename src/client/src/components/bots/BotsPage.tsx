import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Bot, Plus, Trash2, RefreshCw, AlertCircle, AlertTriangle, Download, Upload
} from 'lucide-react';
import { useIsBelowBreakpoint } from '../../hooks/useBreakpoint';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import PageHeader from '../DaisyUI/PageHeader';
import SearchFilterBar from '../SearchFilterBar';
import EmptyState from '../DaisyUI/EmptyState';
import { SkeletonPage } from '../DaisyUI/Skeleton';
import BulkActionBar from '../BulkActionBar';
import { ConfirmModal } from '../DaisyUI/Modal';

import { useBotPageLogic } from './useBotPageLogic';
import { BotCard } from './BotCard';
import { BotStatusPanel } from './BotStatusPanel';
import { BotConfigModal } from './BotConfigModal';

const BotsPage: React.FC = () => {
  const logic = useBotPageLogic();
  const isMobile = useIsBelowBreakpoint('md');

  const {
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,
    onMoveUp,
    onMoveDown,
    getItemStyle,
  } = useDragAndDrop({
    items: logic.filteredBots,
    idAccessor: (b) => b.id,
    onReorder: logic.handleReorder,
  });

  const botsParentRef = useRef<HTMLDivElement>(null);
  const shouldVirtualizeBots = logic.filteredBots.length > 50;
  const botsGridRowVirtualizer = useVirtualizer({
    count: Math.ceil(logic.filteredBots.length / 2),
    getScrollElement: () => botsParentRef.current,
    estimateSize: () => 350,
    overscan: 2,
    enabled: shouldVirtualizeBots,
  });

  if (logic.loading && logic.bots.length === 0 && !logic.error) {
    return <SkeletonPage variant="cards" statsCount={4} showFilters />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Swarm Management"
        description="Configure, monitor, and deploy your specialized AI agents."
        icon={<Bot className="w-8 h-8 text-primary" />}
        actions={
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" onClick={logic.handleExportAll} title="Export all bots">
              <Download className="w-4 h-4 mr-1" /> Export All
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => logic.setIsImportModalOpen(true)} title="Import bots from file">
              <Upload className="w-4 h-4 mr-1" /> Import
            </button>
            <button className="btn btn-primary" onClick={() => logic.setIsCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create New Bot
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${logic.error && logic.bots.length === 0 ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-4`}>
          <SearchFilterBar
            searchValue={logic.searchQuery}
            onSearchChange={logic.setSearchQuery}
            searchPlaceholder="Search agents by name or purpose..."
          >
            <div className="flex gap-2">
              <select className="select select-bordered select-sm" value={logic.filterType} onChange={(e) => logic.setFilterType(e.target.value as any)}>
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
              <button className="btn btn-ghost btn-sm btn-square" onClick={logic.fetchBots} title="Refresh list" aria-label="Refresh list">
                <RefreshCw className={`w-4 h-4 ${logic.botsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </SearchFilterBar>

          {logic.error && logic.bots.length > 0 && (
            <div className="alert alert-error shadow-sm mb-4">
              <AlertCircle className="w-5 h-5" />
              <span>{logic.error}</span>
              <button className="btn btn-ghost btn-xs" onClick={logic.fetchBots}>Try Again</button>
            </div>
          )}

          {logic.error && logic.bots.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="Failed to load swarm"
              description="We encountered an error while trying to load your AI agents. Please try again."
              actionLabel={
                <button className="btn btn-outline btn-error" onClick={logic.fetchBots}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Retry Connection
                </button>
              }
            />
          ) : logic.filteredBots.length === 0 ? (
            <EmptyState
              icon={Bot}
              title={logic.searchQuery ? "No agents found" : "Your swarm is empty"}
              description={logic.searchQuery ? "No agents match your search criteria." : "Start by creating your first specialized AI agent."}
              actionLabel={
                !logic.searchQuery && (
                  <button className="btn btn-primary" onClick={() => logic.setIsCreateModalOpen(true)}>
                    Create First Bot
                  </button>
                )
              }
            />
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm checkbox-primary"
                  checked={logic.bulk.isAllSelected}
                  onChange={() => logic.bulk.toggleAll(logic.filteredBots.map(b => b.id))}
                  aria-label="Select all bots"
                />
                <span className="text-xs text-base-content/60">Select all</span>
              </div>
              <BulkActionBar
                selectedCount={logic.bulk.selectedCount}
                onClearSelection={logic.bulk.clearSelection}
                actions={[
                  { key: 'export', label: 'Export', icon: <Download className="w-4 h-4" />, variant: 'primary', onClick: logic.handleBulkExport },
                  { key: 'delete', label: 'Delete', icon: <Trash2 className="w-4 h-4" />, variant: 'error', onClick: logic.handleBulkDelete, loading: logic.bulkDeleting },
                ]}
              />

              {shouldVirtualizeBots ? (
                <div ref={botsParentRef} className="overflow-auto" style={{ height: '800px' }}>
                  <div style={{ height: `${botsGridRowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                    {botsGridRowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const startIndex = virtualRow.index * 2;
                      const rowBots = logic.filteredBots.slice(startIndex, startIndex + 2);
                      return (
                        <div key={virtualRow.key} style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)` }}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                            {rowBots.map((bot, index) => {
                              const globalIndex = startIndex + index;
                              return (
                                <BotCard
                                  key={bot.id}
                                  bot={bot}
                                  index={globalIndex}
                                  isSelected={logic.previewBot?.id === bot.id}
                                  isMobile={isMobile}
                                  bulk={logic.bulk}
                                  filteredBotsLength={logic.filteredBots.length}
                                  onPreview={() => logic.handlePreviewBot(bot)}
                                  onEdit={() => logic.setEditingBot(bot)}
                                  onDelete={() => logic.setDeletingBot(bot)}
                                  onToggleStatus={() => logic.handleToggleBotStatus(bot)}
                                  onDragStart={onDragStart}
                                  onDragOver={onDragOver}
                                  onDragEnd={onDragEnd}
                                  onDrop={onDrop}
                                  onMoveUp={onMoveUp}
                                  onMoveDown={onMoveDown}
                                  itemStyle={getItemStyle(globalIndex)}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {logic.filteredBots.map((bot, index) => (
                    <BotCard
                      key={bot.id}
                      bot={bot}
                      index={index}
                      isSelected={logic.previewBot?.id === bot.id}
                      isMobile={isMobile}
                      bulk={logic.bulk}
                      filteredBotsLength={logic.filteredBots.length}
                      onPreview={() => logic.handlePreviewBot(bot)}
                      onEdit={() => logic.setEditingBot(bot)}
                      onDelete={() => logic.setDeletingBot(bot)}
                      onToggleStatus={() => logic.handleToggleBotStatus(bot)}
                      onDragStart={onDragStart}
                      onDragOver={onDragOver}
                      onDragEnd={onDragEnd}
                      onDrop={onDrop}
                      onMoveUp={onMoveUp}
                      onMoveDown={onMoveDown}
                      itemStyle={getItemStyle(index)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {!(logic.error && logic.bots.length === 0) && (
          <div className="lg:col-span-1">
            <BotStatusPanel
              previewBot={logic.previewBot}
              setPreviewBot={logic.setPreviewBot}
              previewTab={logic.previewTab}
              setPreviewTab={logic.setPreviewTab}
              logFilter={logic.logFilter}
              setLogFilter={logic.setLogFilter}
              activityLogs={logic.activityLogs}
              activityError={logic.activityError}
              fetchPreviewActivity={logic.fetchPreviewActivity}
              chatHistory={logic.chatHistory}
              chatError={logic.chatError}
              fetchPreviewChat={logic.fetchPreviewChat}
              setEditingBot={logic.setEditingBot}
              handleExportSingleBot={logic.handleExportSingleBot}
              handleToggleBotStatus={logic.handleToggleBotStatus}
            />
          </div>
        )}
      </div>

      <BotConfigModal
        isCreateModalOpen={logic.isCreateModalOpen}
        setIsCreateModalOpen={logic.setIsCreateModalOpen}
        handleCreateBot={logic.handleCreateBot}
        editingBot={logic.editingBot}
        setEditingBot={logic.setEditingBot}
        handleUpdateBot={logic.handleUpdateBot}
        setDeletingBot={logic.setDeletingBot}
        setPreviewBot={logic.setPreviewBot}
        isImportModalOpen={logic.isImportModalOpen}
        setIsImportModalOpen={logic.setIsImportModalOpen}
        existingBotNames={logic.bots.map(b => b.name)}
        fetchBots={logic.fetchBots}
        personas={logic.personas}
        llmProfiles={logic.llmProfiles}
        getIntegrationOptions={logic.getIntegrationOptions}
      />

      <ConfirmModal
        isOpen={!!logic.deletingBot}
        title="Delete Agent"
        message={`Are you sure you want to delete ${logic.deletingBot?.name}? This action cannot be undone.`}
        confirmText="Delete Bot"
        confirmVariant="error"
        onConfirm={logic.handleDeleteBot}
        onClose={() => logic.setDeletingBot(null)}
      />
    </div>
  );
};

export default BotsPage;
