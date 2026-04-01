/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Alert } from '../../components/DaisyUI/Alert';
import ToolResultModal from '../../components/ToolResultModal';
import { ToolRegistryPanel, ToolExecutionPanel } from '../../components/mcp-tools';
import ToolResultHistory from '../../components/ToolResultHistory';
import { useMCPTools } from './hooks/useMCPTools';
import PageHeader from './components/PageHeader';
import ExecutionHistoryModal from './components/ExecutionHistoryModal';

const MCPToolsPage: React.FC = () => {
  const {
    tools, filteredTools, loading, alert, setAlert,
    favorites, recentlyUsed,
    selectedTool, setSelectedTool, initialArgs, isRunning,
    showHistory, setShowHistory, executionHistory, loadingHistory,
    selectedResult, showResultModal, setShowResultModal,
    recentResults, setRecentResults,
    urlParams, setUrlParam,
    handleToggleTool, handleExecuteTool, fetchHistory,
    handleToggleFavorite, handleRunTool,
  } = useMCPTools();

  return (
    <div className="p-6">
      <PageHeader onShowHistory={() => { setShowHistory(true); fetchHistory(); }} />
      {alert && <div className="mb-6"><Alert status={alert.type === 'success' ? 'success' : 'error'} message={alert.message} onClose={() => setAlert(null)} /></div>}
      <ToolRegistryPanel
        tools={tools} filteredTools={filteredTools} loading={loading} favorites={favorites} recentlyUsed={recentlyUsed}
        onToggleFavorite={handleToggleFavorite}
        onToggleTool={handleToggleTool} onRunTool={handleRunTool}
        searchTerm={urlParams.search} setSearchTerm={(v) => setUrlParam('search', v)}
        categoryFilter={urlParams.category} setCategoryFilter={(v) => setUrlParam('category', v)}
        serverFilter={urlParams.server} setServerFilter={(v) => setUrlParam('server', v)}
        viewFilter={urlParams.view} setViewFilter={(v) => setUrlParam('view', v)}
        sortBy={urlParams.sortBy} setSortBy={(v) => setUrlParam('sortBy', v)}
        categories={Array.from(new Set(tools.map(t => t.category)))}
        servers={Array.from(new Set(tools.map(t => ({ id: t.serverId, name: t.serverName }))))}
      />
      <ToolExecutionPanel tool={selectedTool} onClose={() => setSelectedTool(null)} onExecute={handleExecuteTool} isRunning={isRunning} initialArgs={initialArgs} />
      <div className="mt-8">
        <ToolResultHistory
          results={recentResults}
          onViewResult={(result) => { setSelectedResult(result); setShowResultModal(true); }}
          onClear={() => setRecentResults([])}
        />
      </div>
      {showHistory && (
        <ExecutionHistoryModal
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          loading={loadingHistory}
          history={executionHistory}
        />
      )}
      {selectedResult && <ToolResultModal isOpen={showResultModal} onClose={() => setShowResultModal(false)} result={selectedResult} />}
    </div>
  );
};

export default MCPToolsPage;
