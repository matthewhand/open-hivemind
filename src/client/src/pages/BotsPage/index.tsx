/* eslint-disable @typescript-eslint/no-explicit-any */
import { Bot as BotIcon, Download, LayoutGrid, List, Pause, Play, Plus, RefreshCw, Settings, Trash2, Upload as UploadIcon } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Tabs from '../../components/DaisyUI/Tabs';
import BotSettingsTab from './BotSettingsTab';
import { CreateBotWizard } from '../../components/BotManagement/CreateBotWizard';
import ImportBotsModal from '../../components/BotManagement/ImportBotsModal';
import { BotSettingsModal } from '../../components/BotSettingsModal';
import BulkActionBar from '../../components/BulkActionBar';
import Button from '../../components/DaisyUI/Button';
import DetailDrawer from '../../components/DaisyUI/DetailDrawer';
import { SkeletonPage } from '../../components/DaisyUI/Skeleton';
import Swap from '../../components/DaisyUI/Swap';
import { useErrorToast, useSuccessToast } from '../../components/DaisyUI/ToastNotification';
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
// Hooks
import { useBotsPageData } from './hooks/useBotsPageData';
import Checkbox from '../../components/DaisyUI/Checkbox';
import { useSavedStamp } from '../../contexts/SavedStampContext';
import Select from '../../components/DaisyUI/Select';

const BotsPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const { values: urlParams, setValue: setUrlParam } = useUrlParams({
    search: { type: 'string', default: '', debounce: 300 },
    status: { type: 'string', default: 'all' },
    view: { type: 'string', default: 'default' },
  });
  const searchQuery = urlParams.search;
  const setSearchQuery = (v: string) => setUrlParam('search', v);
  const filterType = urlParams.status as 'all' | 'active' | 'inactive';
  const setFilterType = (v: 'all' | 'active' | 'inactive') => setUrlParam('status', v);
  const viewMode = urlParams.view as 'default' | 'compact' | 'swarm3d';
  const setViewMode = (v: 'default' | 'compact' | 'swarm3d') => setUrlParam('view', v);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBot, setEditingBot] = useState<BotConfig | null>(null);
  const [, setDeletingBot] = useState<BotConfig | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toastSuccess = useSuccessToast();
  const toastError = useErrorToast();
  const { showStamp } = useSavedStamp();
  const location = useLocation();
  const navigate = useNavigate();
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
            <Tooltip content={
              viewMode === 'swarm3d' ? 'Switch to grid view'
                : viewMode === 'compact' ? 'Switch to 3D swarm view'
                : 'Switch to compact view'
            }>
              <div
                className="btn btn-ghost btn-sm btn-square"
                role="button"
                tabIndex={0}
                onClick={() => setViewMode(
                  viewMode === 'default' ? 'compact'
                    : viewMode === 'compact' ? 'swarm3d'
                    : 'default'
                )}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault();
                  setViewMode(viewMode === 'default' ? 'compact' : viewMode === 'compact' ? 'swarm3d' : 'default');
                }}}
                aria-label="Switch view"
              >
                {viewMode === 'swarm3d' ? (
                  <LayoutGrid className="w-4 h-4" />
                ) : viewMode === 'compact' ? (
                  <BotIcon className="w-4 h-4" />
                ) : (
                  <List className="w-4 h-4" />
                )}
              </div>
            </Tooltip>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content: Bot List */}
        <div
          className={`${error && bots.length === 0 ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-4`}
        >
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
        </div>
      </div>

      <DetailDrawer
        isOpen={!!previewBot}
        onClose={() => setPreviewBot(null)}
        title={previewBot?.name || 'Bot Details'}
        renderDock={
          previewBot && !error && (
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
        {previewBot && (
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
        )}
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
            await handleUpdateBot({ ...bot, [key]: value });
          }}
          onUpdatePersona={async (bot, personaId) => {
            await handleUpdateBot({ ...bot, persona: personaId });
          }}
          onClone={(bot) => {
            setEditingBot(null);
            handleCreateBot({ ...bot, name: `${bot.name}-copy`, id: undefined });
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
    </div>
  );
};

export default BotsPage;
