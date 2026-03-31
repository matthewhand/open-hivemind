import React, { useState } from 'react';
import { MCPTool } from './types';
import Modal from '../DaisyUI/Modal';
import ToolConfigPanel from './ToolConfigPanel';

interface ToolExecutionPanelProps {
  tool: MCPTool | null;
  onClose: () => void;
  onExecute: (tool: MCPTool, args: Record<string, any>) => Promise<void>;
  isRunning: boolean;
  initialArgs?: Record<string, any>;
}

const ToolExecutionPanel: React.FC<ToolExecutionPanelProps> = ({
  tool,
  onClose,
  onExecute,
  isRunning,
  initialArgs,
}) => {
  const [runArgs, setRunArgs] = useState(initialArgs ? JSON.stringify(initialArgs, null, 2) : '{}');
  const [formArgs, setFormArgs] = useState<Record<string, any>>(initialArgs || {});
  const [mode, setMode] = useState<'form' | 'json'>('form');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Reset state when tool changes or modal is closed
  React.useEffect(() => {
    if (tool) {
      setRunArgs(initialArgs ? JSON.stringify(initialArgs, null, 2) : '{}');
      setFormArgs(initialArgs || {});
      setMode('form');
      setJsonError(null);
    }
  }, [tool, initialArgs]);

  if (!tool) return null;

  const handleExecute = () => {
    let args = {};
    try {
      args = JSON.parse(runArgs);
      setJsonError(null);
    } catch (e) {
      setJsonError('Invalid JSON format');
      return;
    }

    onExecute(tool, args);
  };

  const handleClose = () => {
    if (isRunning) return;
    onClose();
  };

  return (
    <Modal
      isOpen={!!tool}
      onClose={handleClose}
      title={`Run Tool: ${tool.name}`}
      actions={[
        {
          label: 'Cancel',
          onClick: handleClose,
          variant: 'ghost',
          disabled: isRunning,
        },
        {
          label: isRunning ? 'Running...' : 'Run Tool',
          onClick: handleExecute,
          variant: 'primary',
          loading: isRunning,
          disabled: isRunning,
        },
      ]}
    >
      <ToolConfigPanel
        tool={tool}
        runArgs={runArgs}
        setRunArgs={setRunArgs}
        formArgs={formArgs}
        setFormArgs={setFormArgs}
        mode={mode}
        setMode={setMode}
        jsonError={jsonError}
        setJsonError={setJsonError}
        isRunning={isRunning}
      />
    </Modal>
  );
};

export default ToolExecutionPanel;
