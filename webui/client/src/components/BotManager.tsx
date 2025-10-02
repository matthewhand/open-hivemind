import React, { useState, useEffect } from 'react';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  ContentCopy as CloneIcon,
} from '@mui/icons-material';
import { apiService, type Bot } from '../services/api';

interface BotManagerProps {
  onBotSelect?: (bot: Bot) => void;
}

const BotManager: React.FC<BotManagerProps> = ({ onBotSelect }) => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [toast, setToast] = useState({ open: false, message: '', type: 'success' as 'success' | 'error' });

 // Form state
 const [formData, setFormData] = useState({
    name: '',
    messageProvider: '',
    llmProvider: '',
    persona: '',
    systemInstruction: '',
  });

  const messageProviders = ['discord', 'slack', 'mattermost'];
  const llmProviders = ['openai', 'flowise', 'openwebui', 'openswarm', 'perplexity', 'replicate', 'n8n'];

  const fetchBots = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getConfig();
      setBots(response.bots);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBots();
  }, []);

  const handleCreateBot = async () => {
    try {
      await apiService.createBot({
        name: formData.name,
        messageProvider: formData.messageProvider,
        llmProvider: formData.llmProvider,
      });

      setToast({ open: true, message: 'Bot created successfully', type: 'success' });
      setCreateModalOpen(false);
      setFormData({ name: '', messageProvider: '', llmProvider: '', persona: '', systemInstruction: '' });
      fetchBots();
    } catch (err) {
      setToast({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to create bot',
        type: 'error'
      });
    }
  };

  const handleEditBot = async () => {
    if (!selectedBot) return;

    try {
      // Use the bot name as the identifier for updating, since Bot type might not have an 'id' property
      await apiService.updateBot(selectedBot.name, {
        name: formData.name,
        messageProvider: formData.messageProvider,
        llmProvider: formData.llmProvider,
        persona: formData.persona,
        systemInstruction: formData.systemInstruction
      });

      setToast({ open: true, message: 'Bot updated successfully', type: 'success' });
      setEditModalOpen(false);
      setSelectedBot(null);
      setFormData({ name: '', messageProvider: '', llmProvider: '', persona: '', systemInstruction: '' });
      fetchBots();
    } catch (err) {
      setToast({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to update bot',
        type: 'error'
      });
    }
  };

  const handleDeleteBot = async (botName: string) => {
    if (!confirm(`Are you sure you want to delete bot "${botName}"?`)) return;

    try {
      await apiService.deleteBot(botName);
      setToast({ open: true, message: 'Bot deleted successfully', type: 'success' });
      fetchBots();
    } catch (err) {
      setToast({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to delete bot',
        type: 'error'
      });
    }
  };

  const handleCloneBot = async (botName: string) => {
    const newName = prompt(`Enter new name for cloned bot "${botName}":`);
    if (!newName) return;

    try {
      await apiService.cloneBot(botName, newName);
      setToast({ open: true, message: 'Bot cloned successfully', type: 'success' });
      fetchBots();
    } catch (err) {
      setToast({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to clone bot',
        type: 'error'
      });
    }
  };

  const openEditModal = (bot: Bot) => {
    setSelectedBot(bot);
    setFormData({
      name: bot.name,
      messageProvider: bot.messageProvider,
      llmProvider: bot.llmProvider,
      persona: bot.persona || '',
      systemInstruction: bot.systemInstruction || '',
    });
    setEditModalOpen(true);
  };

  const openCreateModal = () => {
    setFormData({ name: '', messageProvider: '', llmProvider: '', persona: '', systemInstruction: '' });
    setCreateModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">
          Bot Management
        </h2>
        <button
          className="btn btn-primary"
          onClick={openCreateModal}
        >
          <AddIcon className="mr-2" />
          Create Bot
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Message Provider</th>
              <th>LLM Provider</th>
              <th>Persona</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bots.map((bot) => (
              <tr key={bot.name} className="hover">
                <td>
                  <span className="font-bold">{bot.name}</span>
                </td>
                <td>
                  <div className="badge badge-primary badge-outline">{bot.messageProvider}</div>
                </td>
                <td>
                  <div className="badge badge-secondary badge-outline">{bot.llmProvider}</div>
                </td>
                <td>
                  {bot.persona && (
                    <div className="badge badge-outline">{bot.persona}</div>
                  )}
                </td>
                <td>
                  <div className="badge badge-success">Active</div>
                </td>
                <td>
                  <div className="flex gap-1">
                    <div className="tooltip" data-tip="Edit">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          openEditModal(bot);
                          onBotSelect?.(bot);
                        }}
                      >
                        <EditIcon />
                      </button>
                    </div>
                    <div className="tooltip" data-tip="Clone">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleCloneBot(bot.name)}
                      >
                        <CloneIcon />
                      </button>
                    </div>
                    <div className="tooltip" data-tip="Start">
                      <button
                        className="btn btn-ghost btn-sm text-success"
                        onClick={() => setToast({ open: true, message: 'Bot start functionality not yet implemented', type: 'success' })}
                      >
                        <StartIcon />
                      </button>
                    </div>
                    <div className="tooltip" data-tip="Stop">
                      <button
                        className="btn btn-ghost btn-sm text-warning"
                        onClick={() => setToast({ open: true, message: 'Bot stop functionality not yet implemented', type: 'success' })}
                      >
                        <StopIcon />
                      </button>
                    </div>
                    <div className="tooltip" data-tip="Delete">
                      <button
                        className="btn btn-ghost btn-sm text-error"
                        onClick={() => handleDeleteBot(bot.name)}
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Bot Modal */}
      <dialog id="create_bot_modal" className={`modal ${createModalOpen ? 'modal-open' : ''}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg">Create New Bot</h3>
          <div className="py-4 space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Bot Name</span></label>
              <input
                type="text"
                placeholder="Bot Name"
                className="input input-bordered w-full"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-4">
              <div className="form-control w-1/2">
                <label className="label"><span className="label-text">Message Provider</span></label>
                <select
                  className="select select-bordered"
                  value={formData.messageProvider}
                  onChange={(e) => setFormData({ ...formData, messageProvider: e.target.value })}
                  required
                >
                  <option disabled value="">Select Provider</option>
                  {messageProviders.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control w-1/2">
                <label className="label"><span className="label-text">LLM Provider</span></label>
                <select
                  className="select select-bordered"
                  value={formData.llmProvider}
                  onChange={(e) => setFormData({ ...formData, llmProvider: e.target.value })}
                  required
                >
                  <option disabled value="">Select Provider</option>
                  {llmProviders.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn" onClick={() => setCreateModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary ml-2" onClick={handleCreateBot}>
                Create Bot
              </button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Edit Bot Modal */}
      <dialog id="edit_bot_modal" className={`modal ${editModalOpen ? 'modal-open' : ''}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg">Edit Bot</h3>
          <div className="py-4 space-y-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Bot Name</span></label>
              <input
                type="text"
                placeholder="Bot Name"
                className="input input-bordered w-full"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-4">
              <div className="form-control w-1/2">
                <label className="label"><span className="label-text">Message Provider</span></label>
                <select
                  className="select select-bordered"
                  value={formData.messageProvider}
                  onChange={(e) => setFormData({ ...formData, messageProvider: e.target.value })}
                  required
                >
                  {messageProviders.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control w-1/2">
                <label className="label"><span className="label-text">LLM Provider</span></label>
                <select
                  className="select select-bordered"
                  value={formData.llmProvider}
                  onChange={(e) => setFormData({ ...formData, llmProvider: e.target.value })}
                  required
                >
                  {llmProviders.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Persona</span></label>
              <input
                type="text"
                placeholder="Persona"
                className="input input-bordered w-full"
                value={formData.persona}
                onChange={(e) => setFormData({ ...formData, persona: e.target.value })}
              />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">System Instruction</span></label>
              <textarea
                className="textarea textarea-bordered h-24"
                placeholder="System Instruction"
                value={formData.systemInstruction}
                onChange={(e) => setFormData({ ...formData, systemInstruction: e.target.value })}
              ></textarea>
            </div>
          </div>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn" onClick={() => setEditModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary ml-2" onClick={handleEditBot}>
                Update Bot
              </button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Toast for notifications */}
      {toast.open && (
        <div className="toast toast-end">
          <div className={`alert alert-${toast.type}`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotManager;
