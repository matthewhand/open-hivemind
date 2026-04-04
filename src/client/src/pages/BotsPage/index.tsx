/* eslint-disable @typescript-eslint/no-explicit-any */
import { Download, RefreshCw, Trash2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CreateBotWizard } from '../../components/BotManagement/CreateBotWizard';
import ImportBotsModal from '../../components/BotManagement/ImportBotsModal';
import { BotSettingsModal } from '../../components/BotSettingsModal';
import BulkActionBar from '../../components/BulkActionBar';
import Button from '../../components/DaisyUI/Button';
import { SkeletonPage } from '../../components/DaisyUI/Skeleton';
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
import { BotPreviewSidebar } from './BotPreviewSidebar';
// Components
import { BotsPageHeader } from './BotsPageHeader';
import { useBotActions } from './hooks/useBotActions';
import { useBotExport } from './hooks/useBotExport';
import { useBotPreview } from './hooks/useBotPreview';
import { useBotsList } from './hooks/useBotsList';
// Hooks
import { useBotsPageData } from './hooks/useBotsPageData';
import Checkbox from '../../components/DaisyUI/Checkbox';
import { useSavedStamp } from '../../contexts/SavedStampContext';

const BotsPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const { values: urlParams, setValue: setUrlParam } = useUrlParams({
    search: { type: 'string', default: '', debounce: 300 },
    status: { type: 'string', default: 'all' },
  });
  const searchQuery = urlParams.search;
  const setSearchQuery = (v: string) => setUrlParam('search', v);
  const filterType = urlParams.status as 'all' | 'active' | 'inactive';
  const setFilterType = (v: 'all' | 'active' | 'inactive') => setUrlParam('status', v);

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

  if (loading && bots.length === 0 && !error) {
    return <SkeletonPage variant="cards" statsCount={4} showFilters />;
  }

  return (
    <div className="space-y-6">
      <BotsPageHeader
        onExportAll={handleExportAll}
        onImportClick={() => setIsImportModalOpen(true)}
        onCreateClick={() => setIsCreateModalOpen(true)}
        onQuickAddMessage={() => navigate('/admin/providers/message')}
        onQuickAddLLM={() => navigate('/admin/providers/llm')}
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
              <select
                className="select select-bordered select-sm"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
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
                    key: 'export',
                    label: 'Export',
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
                onBotDragStart={onBotDragStart}
                onBotDragOver={onBotDragOver}
                onBotDragEnd={onBotDragEnd}
                onBotDrop={onBotDrop}
                getBotItemStyle={getBotItemStyle}
                onBotMoveUp={onBotMoveUp}
                onBotMoveDown={onBotMoveDown}
              />
            </>
          )}
        </div>

        {/* Sidebar: Bot Preview/Details */}
        {!(error && bots.length === 0) && (
          <div className="lg:col-span-1">
            <BotPreviewSidebar
              previewBot={previewBot}
              setPreviewBot={setPreviewBot}
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
            />
          </div>
        )}
      </div>

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
        existingBotNames={bots.map((b) => b.name)}
        onImportComplete={() => {
          setIsImportModalOpen(false);
          fetchBots();
        }}
      />
    </div>
  );
};

export default BotsPage;
