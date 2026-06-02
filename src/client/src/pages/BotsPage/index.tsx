/* eslint-disable @typescript-eslint/no-explicit-any */
import { Bot as BotIcon, Check, Download, LayoutGrid, List, Pause, Play, Plus, RefreshCw, Settings, Trash2, Upload as UploadIcon } from 'lucide-react';
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import Tabs from '../../components/DaisyUI/Tabs';
import BotSettingsTab from './BotSettingsTab';
import { CreateBotWizard } from '../../components/BotManagement/CreateBotWizard';
import ImportBotsModal from '../../components/BotManagement/ImportBotsModal';
import { BotSettingsModal } from '../../components/BotSettingsModal';
import BulkActionBar from '../../components/BulkActionBar';
import Button from '../../components/DaisyUI/Button';
import DetailDrawer from '../../components/DaisyUI/DetailDrawer';
import { SkeletonPage } from '../../components/DaisyUI/Skeleton';
import Dropdown from '../../components/DaisyUI/Dropdown';
import { useErrorToast, useSuccessToast } from '../../components/DaisyUI/ToastNotification';
import MobileFAB from '../../components/MobileFAB';
import SearchFilterBar from '../../components/SearchFilterBar';
import Tooltip from '../../components/DaisyUI/Tooltip';
import { PROVIDER_CATEGORIES } from '../../config/providers';
import { useIsBelowBreakpoint } from '../../hooks/useBreakpoint';
import { useBulkSelection } from '../../hooks/useBulkSelection';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import useUrlParams from '../../hooks/useUrlParams';
import type { BotConfig } from '../../types/bot';
import { BotListErrorState } from './BotListErrorState';
import { BotListGrid } from './BotListGrid';
import { BotSwarm3DView } from './BotSwarm3DView';
// Components
import { useBotActions } from './hooks/useBotActions';
import { useBotExport } from './hooks/useBotExport';
import { useBotPreview } from './hooks/useBotPreview';
import { useBotsList } from './hooks/useBotsList';
import { useBotsPageData } from './hooks/useBotsPageData';
import Checkbox from '../../components/DaisyUI/Checkbox';
import { useSavedStamp } from '../../contexts/SavedStampContext';
import Select from '../../components/DaisyUI/Select';
import { BotDetailContent } from './BotDetailContent';

// Hoisted icon constants — passed as the `icon` prop to React.memo(MobileFAB).
// Inlining `<Plus className="..." />` at the call site allocates a new React
// element on every render, defeating MobileFAB's shallow-compare memoization.
const PLUS_ICON = <Plus className="w-6 h-6" />;
const REFRESH_ICON = <RefreshCw className="w-6 h-6" />;

const BotsPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const { values: urlParams, setValue: setUrlParam } = useUrlParams({
    search: { type: 'string', default: '', debounce: 300 },
    status: { type: 'string', default: 'all' },
    view: { type: 'string', default: 'default' },
  });
  const searchQuery = urlParams.search;
  // Wrap setters in useCallback so they're stable across renders. Without this,
  // these inline arrow functions are recreated every render and would invalidate
  // any downstream memoization (e.g. instancesContent useMemo) that depends on
  // them. setUrlParam is stable (memoized inside useUrlParams), so [setUrlParam]
  // is a sufficient dep list.
  const setSearchQuery = useCallback((v: string) => setUrlParam('search', v), [setUrlParam]);
  const filterType = urlParams.status as 'all' | 'active' | 'inactive';
  const setFilterType = useCallback(
    (v: 'all' | 'active' | 'inactive') => setUrlParam('status', v),
    [setUrlParam],
  );
  const viewMode = urlParams.view as 'default' | 'compact' | 'swarm3d';
  const setViewMode = useCallback(
    (v: 'default' | 'compact' | 'swarm3d') => setUrlParam('view', v),
    [setUrlParam],
  );

  // ---------------------------------------------------------------------------
  // View-mode dropdown a11y: WAI-ARIA "menu" pattern keyboard support.
  // Items are <button role="menuitemradio"> with roving tabindex; arrow keys,
  // Home, End, and Escape behave per APG. The Dropdown wrapper handles
  // open/close on Enter/Space/Esc on the trigger; this only handles
  // focus-traversal once an item has focus. See:
  // https://www.w3.org/WAI/ARIA/apg/patterns/menu/
  // ---------------------------------------------------------------------------
  const viewMenuId = useId();
  const viewMenuItemsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const viewTriggerRef = useRef<HTMLDivElement | null>(null);
  const handleViewMenuKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, index: number, count: number) => {
      const focusItem = (i: number) => {
        const next = ((i % count) + count) % count;
        viewMenuItemsRef.current[next]?.focus();
      };
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          focusItem(index + 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          focusItem(index - 1);
          break;
        case 'Home':
          e.preventDefault();
          focusItem(0);
          break;
        case 'End':
          e.preventDefault();
          focusItem(count - 1);
          break;
        case 'Escape': {
          e.preventDefault();
          // Closing is handled by Dropdown's outside-click + its own trigger Escape.
          // Move focus back to the trigger button so the menu collapses on blur
          // and the user lands somewhere predictable.
          const triggerButton = viewTriggerRef.current?.querySelector<HTMLElement>('[role="button"]');
          triggerButton?.focus();
          break;
        }
        default:
          break;
      }
    },
    []
  );

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBot, setEditingBot] = useState<BotConfig | null>(null);
  const [, setDeletingBot] = useState<BotConfig | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toastSuccess = useSuccessToast();
  const toastError = useErrorToast();
  const { showStamp } = useSavedStamp();
  const location = useLocation();
  const isMobile = useIsBelowBreakpoint('md');

  const { personas, llmProfiles, globalConfig, configLoading } = useBotsPageData(setError);
  const { bots, setBots, botsLoading, fetchBots } = useBotsList(setError, toastError);
  const {
    previewBot,
    setPreviewBot,
    previewTab,
    setPreviewTab,
    activityLogs,
    chatHistory,
    logFilter,
    setLogFilter,
    activityError,
    chatError,
    fetchPreviewActivity,
    fetchPreviewChat,
    handlePreviewBot,
  } = useBotPreview();

  const loading = botsLoading || configLoading;

  const getIntegrationOptions = (category: 'llm' | 'message') => {
    const allKeys = Object.keys(globalConfig);
    const validPrefixes = PROVIDER_CATEGORIES[category] || [];
    return allKeys.filter((key) =>
      validPrefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}-`))
    );
  };

  useEffect(() => {
    if (location.state?.openCreateModal) {
      setIsCreateModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const filteredBots = useMemo(() => {
    return bots.filter((bot) => {
      const matchesSearch =
        !searchQuery ||
        bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bot.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterType === 'all' || bot.status === filterType;
      return matchesSearch && matchesStatus;
    });
  }, [bots, searchQuery, filterType]);

  const filteredBotIds = useMemo(() => filteredBots.map((b) => b.id), [filteredBots]);
  // ⚡ Bolt Optimization: Memoized existingBotNames to prevent unnecessary re-creations of the array
  // on every render, avoiding unnecessary re-renders of the ImportBotsModal component
  const existingBotNames = useMemo(() => bots.map((b) => b.name), [bots]);
  const bulk = useBulkSelection(filteredBotIds);

  const {
    handleToggleBotStatus,
    handleUpdateBot,
    handleCreateBot,
    handleReorder,
    handleBulkDelete,
  } = useBotActions(
    bots,
    setBots,
    previewBot,
    setPreviewBot,
    toastSuccess,
    toastError,
    fetchBots,
    setIsCreateModalOpen,
    setEditingBot,
    bulk,
    setBulkDeleting,
    showStamp
  );

  const { handleBulkExport, handleExportAll, handleExportSingleBot } = useBotExport(
    bots,
    bulk,
    toastSuccess,
    toastError
  );

  const {
    onDragStart: onBotDragStart,
    onDragOver: onBotDragOver,
    onDragEnd: onBotDragEnd,
    onDrop: onBotDrop,
    onMoveUp: onBotMoveUp,
    onMoveDown: onBotMoveDown,
    getItemStyle: getBotItemStyle,
  } = useDragAndDrop({
    items: filteredBots,
    idAccessor: (b) => b.id,
    onReorder: handleReorder,
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'instances';
  const handleTabChange = (tabId: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tabId);
      return next;
    });
  };

  const instancesContent = useMemo(() => (
    <div className="space-y-4">
      <SearchFilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search agents by name or purpose..."
        >
          <div className="flex gap-2">
            <Select
              className="select-bordered"
              size="sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </Select>
            <div ref={viewTriggerRef} className="contents">
              <Dropdown
                trigger={
                  viewMode === 'swarm3d' ? (
                    <BotIcon className="w-4 h-4" aria-hidden="true" />
                  ) : viewMode === 'compact' ? (
                    <List className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <LayoutGrid className="w-4 h-4" aria-hidden="true" />
                  )
                }
                position="bottom"
                color="ghost"
                size="sm"
                className="dropdown-end"
                triggerClassName="gap-1 focus-visible:ring-2 ring-base-content focus-visible:ring-offset-2 ring-offset-base-100 focus-visible:outline-none"
                contentClassName="shadow-lg w-44 z-20"
                aria-label={`View mode: ${
                  viewMode === 'swarm3d' ? '3D Swarm' : viewMode === 'compact' ? 'Compact' : 'Grid'
                }`}
                aria-haspopup="menu"
                menuId={viewMenuId}
                triggerAriaControls={viewMenuId}
              >
                {(() => {
                  const items = [
                    { value: 'default', label: 'Grid', icon: <LayoutGrid className="w-4 h-4" aria-hidden="true" /> },
                    { value: 'compact', label: 'Compact', icon: <List className="w-4 h-4" aria-hidden="true" /> },
                    { value: 'swarm3d', label: '3D Swarm', icon: <BotIcon className="w-4 h-4" aria-hidden="true" /> },
                  ] as const;
                  // Reset the ref array each render so removed items don't linger.
                  viewMenuItemsRef.current = [];
                  return items.map((opt, idx) => {
                    const isActive = viewMode === opt.value;
                    return (
                      <li key={opt.value}>
                        <button
                          type="button"
                          ref={(el) => {
                            viewMenuItemsRef.current[idx] = el;
                          }}
                          role="menuitemradio"
                          aria-checked={isActive}
                          tabIndex={isActive ? 0 : -1}
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewMode(opt.value);
                          }}
                          onKeyDown={(e) => handleViewMenuKeyDown(e, idx, items.length)}
                          className={`flex items-center gap-2 w-full text-left ${
                            isActive ? 'active border-l-2 border-primary pl-2' : ''
                          }`}
                        >
                          {opt.icon}
                          <span className="flex-1">{opt.label}</span>
                          {isActive && <Check className="w-4 h-4 text-primary" aria-hidden="true" />}
                        </button>
                      </li>
                    );
                  });
                })()}
              </Dropdown>
            </div>
            <Tooltip content="Refresh list">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchBots}
                className="btn-square"
                aria-label="Refresh list"
              >
                <RefreshCw className={`w-4 h-4 ${botsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </Tooltip>
          </div>
        </SearchFilterBar>

        <BotListErrorState
          error={error}
          botsCount={bots.length}
          fetchBots={fetchBots}
          filteredBotsCount={filteredBots.length}
          searchQuery={searchQuery}
          setIsCreateModalOpen={setIsCreateModalOpen}
        />

        {!error && filteredBots.length > 0 && (
          viewMode === 'swarm3d' ? (
            <BotSwarm3DView
              bots={filteredBots}
              onPreviewBot={handlePreviewBot}
              onToggleStatus={handleToggleBotStatus}
            />
          ) : (
            <>
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                variant="primary"
                size="sm"
                checked={bulk.isAllSelected}
                onChange={() => bulk.toggleAll(filteredBotIds)}
                aria-label="Select all bots"
              />
              <span className="text-xs text-base-content/60">Select all</span>
            </div>
            <BulkActionBar
              selectedCount={bulk.selectedCount}
              onClearSelection={bulk.clearSelection}
              actions={[
                {
                  key: 'export-all',
                  label: 'Export All',
                  icon: <Download className="w-4 h-4" />,
                  variant: 'ghost',
                  onClick: handleExportAll,
                },
                {
                  key: 'import',
                  label: 'Import',
                  icon: <UploadIcon className="w-4 h-4" />,
                  variant: 'ghost',
                  onClick: () => setIsImportModalOpen(true),
                },
                {
                  key: 'export',
                  label: 'Export Selected',
                  icon: <Download className="w-4 h-4" />,
                  variant: 'primary',
                  onClick: handleBulkExport,
                },
                {
                  key: 'delete',
                  label: 'Delete',
                  icon: <Trash2 className="w-4 h-4" />,
                  variant: 'error',
                  onClick: handleBulkDelete,
                  loading: bulkDeleting,
                },
              ]}
            />
            <BotListGrid
              filteredBots={filteredBots}
              previewBot={previewBot}
              handlePreviewBot={handlePreviewBot}
              setEditingBot={setEditingBot}
              setDeletingBot={setDeletingBot}
              handleToggleBotStatus={handleToggleBotStatus}
              bulk={bulk}
              isMobile={isMobile}
              compactView={viewMode === 'compact'}
              onBotDragStart={onBotDragStart}
              onBotDragOver={onBotDragOver}
              onBotDragEnd={onBotDragEnd}
              onBotDrop={onBotDrop}
              getBotItemStyle={getBotItemStyle}
              onBotMoveUp={onBotMoveUp}
              onBotMoveDown={onBotMoveDown}
            />
            </>
          )
        )}
      </div>
  ), [
    searchQuery, setSearchQuery, filterType, setFilterType, viewMode, setViewMode,
    botsLoading, error, bots, filteredBots, filteredBotIds, setIsCreateModalOpen,
    handlePreviewBot, handleToggleBotStatus, bulk, isMobile,
    onBotDragStart, onBotDragOver, onBotDragEnd, onBotDrop, getBotItemStyle,
    onBotMoveUp, onBotMoveDown, previewBot, setEditingBot, setDeletingBot,
    handleExportAll, setIsImportModalOpen, handleBulkExport, handleBulkDelete, bulkDeleting,
  ]);

  const botsTabs = useMemo(() => [
    {
      id: 'instances',
      label: 'Instances',
      icon: <BotIcon className="w-4 h-4" />,
      content: instancesContent,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
      content: <BotSettingsTab />,
    },
  ], [instancesContent]);

  // Early return AFTER all hooks — hooks must never be called after a conditional return
  if (loading && bots.length === 0 && !error) {
    return <SkeletonPage variant="cards" statsCount={4} showFilters />;
  }

  return (
    <div>
      <div className="px-6 pt-6 pb-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bots</h1>
          <p className="text-base-content/60 text-sm mt-1">Create and manage your AI bot instances</p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Create Bot
        </Button>
      </div>
      <div className="px-6 pb-6 space-y-6">
      <Tabs
        variant="lifted"
        activeTab={activeTab}
        onChange={handleTabChange}
        tabs={botsTabs}
      />

      {/* Bot Detail Drawer — slides in from right when a bot is selected */}
      <DetailDrawer
        isOpen={!!previewBot}
        onClose={() => setPreviewBot(null)}
        title={previewBot?.name || 'Bot Details'}
        renderDock={
          previewBot && (
            <>
              <button
                className="text-info hover:bg-info/10 transition-colors"
                onClick={() => { setEditingBot(previewBot); setPreviewBot(null); }}
                title="Configuration"
              >
                <Settings className="w-5 h-5" />
                <span className="dock-label text-[10px]">Config</span>
              </button>
              <button
                className="text-secondary hover:bg-secondary/10 transition-colors"
                onClick={() => handleExportSingleBot(previewBot)}
                title="Export bot config"
              >
                <Download className="w-5 h-5" />
                <span className="dock-label text-[10px]">Export</span>
              </button>
              <button
                className={`${previewBot.status === 'active' ? 'text-error hover:bg-error/10' : 'text-success hover:bg-success/10'} transition-colors`}
                onClick={() => handleToggleBotStatus(previewBot)}
                title={previewBot.status === 'active' ? 'Deactivate' : 'Activate'}
              >
                {previewBot.status === 'active' ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                <span className="dock-label text-[10px]">{previewBot.status === 'active' ? 'Pause' : 'Start'}</span>
              </button>
            </>
          )
        }
      >
        <BotDetailContent
          previewBot={previewBot}
          previewTab={previewTab}
          setPreviewTab={setPreviewTab}
          activityLogs={activityLogs}
          chatHistory={chatHistory}
          logFilter={logFilter}
          setLogFilter={setLogFilter}
          activityError={activityError}
          chatError={chatError}
          fetchPreviewActivity={fetchPreviewActivity}
          fetchPreviewChat={fetchPreviewChat}
          setEditingBot={setEditingBot}
          handleExportSingleBot={handleExportSingleBot}
          handleToggleBotStatus={handleToggleBotStatus}
          onClose={() => setPreviewBot(null)}
        />
      </DetailDrawer>

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateBotWizard
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateBot}
        />
      )}

      {editingBot && (
        <BotSettingsModal
          isOpen={!!editingBot}
          bot={editingBot as any}
          onClose={() => setEditingBot(null)}
          personas={personas}
          llmProfiles={llmProfiles}
          integrationOptions={{ message: getIntegrationOptions('message') }}
          onUpdateConfig={async (bot, key, value) => {
            try {
              await handleUpdateBot({ ...bot, [key]: value });
            } catch {
              // Error is already handled by handleUpdateBot's toastError
            }
          }}
          onUpdatePersona={async (bot, personaId) => {
            try {
              await handleUpdateBot({ ...bot, persona: personaId });
            } catch {
              // Error is already handled by handleUpdateBot's toastError
            }
          }}
          onClone={async (bot) => {
            try {
              setEditingBot(null);
              await handleCreateBot({ ...bot, name: `${bot.name}-copy`, id: undefined });
            } catch {
              // Error is already handled by handleCreateBot's toastError
            }
          }}
          onDelete={(bot) => {
            setEditingBot(null);
            setDeletingBot(bot as any);
          }}
          onViewDetails={(bot) => setPreviewBot(bot as any)}
        />
      )}

      <ImportBotsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingBotNames={existingBotNames}
        onImportComplete={() => {
          setIsImportModalOpen(false);
          fetchBots();
        }}
      />
      </div>

      {/* Mobile FABs — primary page actions for small viewports.
          Desktop uses the inline header buttons; FABs are hidden via md:hidden. */}
      {isMobile && (
        <>
          <MobileFAB
            position="left"
            icon={PLUS_ICON}
            onClick={() => setIsCreateModalOpen(true)}
            ariaLabel="Create bot"
          />
          <MobileFAB
            position="right"
            icon={REFRESH_ICON}
            onClick={fetchBots}
            disabled={botsLoading}
            loading={botsLoading}
            ariaLabel="Refresh bots"
          />
        </>
      )}
    </div>
  );
};

export default BotsPage;
