import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/DaisyUI';
import {
  Plus as AddIcon,
  BookOpen as TemplatesIcon,
  Settings as ConfigIcon
} from 'lucide-react';
import { useBots } from '../hooks/useBots';
import { useBotProviders } from '../hooks/useBotProviders';
import { useModal } from '../hooks/useModal';
import BotCard from '../components/BotManagement/BotCard';
import CreateBotForm from '../components/BotManagement/CreateBotForm';
import ProviderConfigModal from '../components/ProviderConfiguration/ProviderConfigModal';
import { Breadcrumbs } from '../components/DaisyUI';

const BotsPage: React.FC = () => {
  const navigate = useNavigate();
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Hooks for state management
  const { bots, loading, error, createBot, startBot, stopBot, cloneBot, deleteBot, clearError } = useBots();
  const { addMessageProvider, addLLMProvider, removeProvider } = useBotProviders();
  const { modalState, openAddModal, openEditModal, closeModal } = useModal();

  const breadcrumbItems = [{ label: 'Bots', href: '/uber/bots', isActive: true }];

  const quickActions = [
    {
      title: 'Create New Bot',
      description: 'Set up a new bot instance with custom configuration',
      icon: <AddIcon className="w-10 h-10" />,
      action: () => setShowCreateForm(true),
      color: 'primary'
    },
    {
      title: 'Bot Templates',
      description: 'Browse pre-configured templates for quick bot setup',
      icon: <TemplatesIcon className="w-10 h-10" />,
      action: () => navigate('/uber/bots/templates'),
      color: 'secondary'
    },
    {
      title: 'Provider Settings',
      description: 'Configure global message and LLM provider settings',
      icon: <ConfigIcon className="w-10 h-10" />,
      action: () => navigate('/uber/providers'),
      color: 'accent'
    }
  ];

  // Handle bot actions
  const handleCreateBot = (name: string, description?: string) => {
    const newBot = createBot(name, description);
    setShowCreateForm(false);
  };

  const handleStartBot = async (botId: string) => {
    await startBot(botId);
  };

  const handleStopBot = async (botId: string) => {
    await stopBot(botId);
  };

  const handleCloneBot = (botId: string) => {
    cloneBot(botId);
  };

  const handleDeleteBot = (botId: string) => {
    if (window.confirm('Are you sure you want to delete this bot?')) {
      deleteBot(botId);
    }
  };

  const handleConfigureBot = (botId: string) => {
    navigate(`/uber/bots/${botId}/configure`);
  };

  const handleAddProvider = (botId: string, providerType: 'message' | 'llm') => {
    openAddModal(botId, providerType);
  };

  const handleRemoveProvider = (botId: string, providerId: string) => {
    if (window.confirm('Are you sure you want to remove this provider?')) {
      removeProvider(botId, providerId);
    }
  };

  const handleProviderSubmit = (providerData: any) => {
    if (!modalState.botId) return;

    if (modalState.providerType === 'message') {
      addMessageProvider(
        modalState.botId,
        providerData.type,
        providerData.name,
        providerData.config
      );
    } else {
      addLLMProvider(
        modalState.botId,
        providerData.type,
        providerData.name,
        providerData.config
      );
    }

    closeModal();
  };

  return (
    <div className="p-6">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mt-4 mb-8">
        <h1 className="text-4xl font-bold mb-2">Bot Management</h1>
        <p className="text-base-content/70">
          Manage your bot instances, create new bots, and configure settings
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
          <button className="btn btn-sm btn-ghost ml-auto" onClick={clearError}>
            ✕
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {quickActions.map((action, index) => (
          <Card key={index} className="bg-base-100 shadow-xl border border-base-300">
            <div className="card-body">
              <div className="text-center mb-4">
                <div className={`text-${action.color} mb-2`}>
                  {action.icon}
                </div>
                <h2 className="card-title justify-center text-lg">
                  {action.title}
                </h2>
                <p className="text-sm text-base-content/60 mt-2">
                  {action.description}
                </p>
              </div>
              <div className="card-actions justify-center">
                <Button
                  variant={action.color}
                  onClick={action.action}
                  className="w-full"
                >
                  {action.title.split(' ')[0]}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Bot Form */}
      {showCreateForm && (
        <Card className="bg-base-100 shadow-xl border border-base-300 mb-8">
          <div className="card-body">
            <h2 className="card-title text-xl mb-4">Create New Bot</h2>
            <CreateBotForm
              onSubmit={handleCreateBot}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </Card>
      )}

      {/* Bots Grid */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Your Bots</h2>
          <div className="text-sm text-base-content/60">
            {bots.length} bot{bots.length !== 1 ? 's' : ''} configured
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="loading loading-spinner loading-lg"></div>
          </div>
        ) : bots.length === 0 ? (
          <Card className="bg-base-100/50 border border-dashed border-base-300">
            <div className="card-body text-center py-12">
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold mb-2">No bots configured yet</h3>
              <p className="text-base-content/60 mb-6">
                Get started by creating your first bot instance
              </p>
              <Button
                variant="primary"
                onClick={() => setShowCreateForm(true)}
              >
                <AddIcon className="w-4 h-4 mr-2" />
                Create Your First Bot
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {bots.map((bot) => (
              <BotCard
                key={bot.id}
                bot={bot}
                onStartBot={handleStartBot}
                onStopBot={handleStopBot}
                onConfigureBot={handleConfigureBot}
                onCloneBot={handleCloneBot}
                onDeleteBot={handleDeleteBot}
                onAddProvider={handleAddProvider}
                onRemoveProvider={handleRemoveProvider}
              />
            ))}
          </div>
        )}
      </div>

      {/* Provider Configuration Modal */}
      <ProviderConfigModal
        modalState={modalState}
        onClose={closeModal}
        onSubmit={handleProviderSubmit}
      />
    </div>
  );
};

export default BotsPage;