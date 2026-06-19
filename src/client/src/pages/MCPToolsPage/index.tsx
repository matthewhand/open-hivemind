/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { Alert } from '../../components/DaisyUI/Alert';
import ToolResultModal from '../../components/ToolResultModal';
import type { ToolResult } from './types';
import { ToolRegistryPanel, ToolExecutionPanel } from '../../components/mcp-tools';
import ToolResultHistory from '../../components/ToolResultHistory';
import { useMCPTools } from './hooks/useMCPTools';
import PageHeader from '../../components/DaisyUI/PageHeader';
import { Wrench, Clock } from 'lucide-react';
import Button from '../../components/DaisyUI/Button';
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

  // Result selected from the recent-results history list (distinct from the
  // execution-flow result owned by the hook, which has no exported setter).
  const [viewedResult, setViewedResult] = useState<ToolResult | null>(null);

  return (
    <div className="p-6">
      <PageHeader 
        title="MCP Tools" 
        description="Browse and manage tools available from your MCP servers"
        icon={Wrench}
        actions={
          <Button buttonStyle="outline" size="sm" onClick={() => { setShowHistory(true); fetchHistory(); }}>
            <Clock className="w-4 h-4 mr-1" /> Execution History
          </Button>
        }
      />
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
          onViewResult={(result) => { setViewedResult(result); }}
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
      {viewedResult && <ToolResultModal isOpen={!!viewedResult} onClose={() => setViewedResult(null)} result={viewedResult} />}
    </div>
  );
};

export default MCPToolsPage;
