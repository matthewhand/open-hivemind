# Bot Management Solution Design

## Overview

Designing a comprehensive bot management interface using DaisyUI/Tailwind CSS for configuring bot instances with message providers, LLM providers, and personas.

## Requirements

1. **Bot Instances**: Configure bot instances that connect to multiple providers and personas
2. **Message Providers**: Active connections to all configured message providers simultaneously
3. **LLM Providers**: Failover series (first available, fallback on error)
4. **Personas**: Each bot has exactly one persona that defines its behavior and personality
5. **UI Requirements**:
   - Use DaisyUI/Tailwind components
   - Show providers by name ('discord', 'openai') in bot page
   - Plus (+) shortcut for quick provider/persona configuration
   - Popup for provider/persona configuration
   - Direct menu tabs for provider and persona management

## Solution Architecture

### 1. Data Model

```typescript
interface BotInstance {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error';
  messageProviders: MessageProvider[];  // Multiple active connections
  llmProviders: LLMProvider[];          // Failover chain
  personaId: string;                     // Exactly one persona per bot
  createdAt: string;
  lastActive?: string;
}

interface Persona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  traits: PersonaTrait[];
  category: PersonaCategory;
  isBuiltIn: boolean;
  createdAt: string;
  usageCount: number;
}

interface PersonaTrait {
  name: string;
  value: string;
  type: 'personality' | 'behavior' | 'tone' | 'style';
}

type PersonaCategory =
  | 'general'
  | 'customer_service'
  | 'creative'
  | 'technical'
  | 'educational'
  | 'entertainment'
  | 'professional';

interface MessageProvider {
  id: string;
  name: string;  // 'discord', 'telegram', 'slack'
  type: 'discord' | 'telegram' | 'slack' | 'webhook';
  config: Record<string, any>;
  status: 'connected' | 'disconnected' | 'error';
}

interface LLMProvider {
  id: string;
  name: string;  // 'openai', 'anthropic', 'local'
  type: 'openai' | 'anthropic' | 'ollama' | 'huggingface';
  config: Record<string, any>;
  status: 'available' | 'unavailable' | 'error';
}

// Built-in default persona
const DEFAULT_PERSONA: Persona = {
  id: 'default',
  name: 'Helpful Assistant',
  description: 'A friendly and helpful AI assistant',
  systemPrompt: 'You are a helpful assistant. Be polite, professional, and provide accurate information to the best of your ability.',
  traits: [
    { name: 'Tone', value: 'Friendly', type: 'tone' },
    { name: 'Style', value: 'Professional', type: 'style' },
    { name: 'Behavior', value: 'Helpful', type: 'behavior' }
  ],
  category: 'general',
  isBuiltIn: true,
  createdAt: new Date().toISOString(),
  usageCount: 0
};
```

### 2. Component Structure

```
src/client/src/
├── components/
│   ├── BotManagement/
│   │   ├── BotCard.tsx              # Individual bot instance card
│   │   ├── BotGrid.tsx              # Grid of bot cards
│   │   ├── BotStatusBadge.tsx       # Status indicator
│   │   ├── ProviderList.tsx         # List of providers for a bot
│   │   ├── ProviderChip.tsx         # Individual provider display
│   │   ├── PersonaChip.tsx          # Persona display component
│   │   └── QuickAddButton.tsx       # Plus button for adding providers/personas
│   ├── ProviderConfiguration/
│   │   ├── ProviderConfigModal.tsx  # Popup for provider configuration
│   │   ├── MessageProviderForm.tsx  # Message provider config form
│   │   ├── LLMProviderForm.tsx      # LLM provider config form
│   │   └── ProviderSelector.tsx     # Provider type selection
│   ├── PersonaConfiguration/
│   │   ├── PersonaConfigModal.tsx   # Popup for persona configuration
│   │   ├── PersonaForm.tsx          # Persona creation/editing form
│   │   ├── PersonaSelector.tsx      # Persona selection component
│   │   ├── PersonaPreview.tsx       # Persona preview component
│   │   └── PersonaTemplates.tsx     # Pre-built persona templates
│   └── DaisyUI/ (existing components)
├── pages/
│   ├── BotsPage.tsx                 # Main bot management page
│   ├── MessageProvidersPage.tsx     # Dedicated message provider config
│   ├── LLMProvidersPage.tsx         # Dedicated LLM provider config
│   └── PersonasPage.tsx             # Dedicated persona management page
└── hooks/
    ├── useBots.ts                   # Bot data management
    ├── useProviders.ts              # Provider data management
    ├── usePersonas.ts               # Persona data management
    └── useModal.ts                  # Modal state management
```

### 3. DaisyUI Component Mapping

| UI Element | DaisyUI Component | Purpose |
|------------|-------------------|---------|
| Bot Cards | `card` + `card-body` | Display bot instances |
| Status Indicators | `badge` | Show bot/provider status |
| Provider Lists | `chip` + `chip-content` | Show configured providers |
| Persona Display | `chip` + `badge` | Show bot persona |
| Add Buttons | `btn` + `btn-circle` + `btn-primary` | Plus button shortcuts |
| Configuration Modal | `modal` + `modal-box` | Provider/persona configuration popup |
| Provider Forms | `form-control` + `input` + `select` | Configuration inputs |
| Persona Forms | `form-control` + `textarea` + `input` | Persona creation inputs |
| Status Tables | `table` + `table-zebra` | Provider/persona overview tables |
| Action Buttons | `btn` + `btn-sm` + `btn-ghost` | Start/stop/configure actions |
| Toggle Switches | `toggle` | Enable/disable providers |
| Tabs | `tabs` + `tab` | Message/LLM provider/persona sections |
| Preview Cards | `card` + `card-compact` | Persona preview display |

### 4. Main Bot Page Layout

```tsx
<div className="container mx-auto p-6">
  {/* Header */}
  <div className="flex justify-between items-center mb-6">
    <h1 className="text-3xl font-bold">Bot Management</h1>
    <div className="flex gap-2">
      <button className="btn btn-primary">
        <Plus className="w-4 h-4" />
        New Bot
      </button>
      <button className="btn btn-secondary">
        <Settings className="w-4 h-4" />
        Providers
      </button>
    </div>
  </div>

  {/* Bot Grid */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {bots.map(bot => (
      <div key={bot.id} className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-start mb-4">
            <h2 className="card-title">{bot.name}</h2>
            <BotStatusBadge status={bot.status} />
          </div>

          {/* Persona Section */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold">Persona</span>
              <QuickAddButton
                type="persona"
                botId={bot.id}
                onClick={() => openPersonaModal(bot.id)}
              />
            </div>
            <PersonaChip
              persona={getPersonaById(bot.personaId)}
              onChange={(personaId) => updateBotPersona(bot.id, personaId)}
              disabled={bot.status === 'running'}
            />
          </div>

          {/* Message Providers */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold">Message Providers</span>
              <QuickAddButton
                type="message"
                botId={bot.id}
                onClick={() => openProviderModal(bot.id, 'message')}
              />
            </div>
            <ProviderList
              providers={bot.messageProviders}
              type="message"
              onRemove={(providerId) => removeProvider(bot.id, providerId)}
            />
          </div>

          {/* LLM Providers */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold">LLM Providers</span>
              <QuickAddButton
                type="llm"
                botId={bot.id}
                onClick={() => openProviderModal(bot.id, 'llm')}
              />
            </div>
            <ProviderList
              providers={bot.llmProviders}
              type="llm"
              onRemove={(providerId) => removeProvider(bot.id, providerId)}
            />
          </div>

          {/* Actions */}
          <div className="card-actions justify-end">
            <button className="btn btn-sm btn-ghost">Configure</button>
            <button
              className={`btn btn-sm ${bot.status === 'running' ? 'btn-error' : 'btn-success'}`}
              onClick={() => toggleBot(bot.id)}
            >
              {bot.status === 'running' ? 'Stop' : 'Start'}
            </button>
          </div>
        </div>
      </div>
    ))}
  </div>
</div>
```

### 5. Provider Configuration Modal

```tsx
{/* Provider Configuration Modal */}
<div className={`modal ${isModalOpen ? 'modal-open' : ''}`}>
  <div className="modal-box max-w-2xl">
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-xl font-bold">
        {isEditMode ? 'Edit' : 'Add'} {providerType === 'message' ? 'Message' : 'LLM'} Provider
      </h3>
      <button
        className="btn btn-sm btn-circle btn-ghost"
        onClick={closeModal}
      >
        <X className="w-4 h-4" />
      </button>
    </div>

    {/* Provider Type Selection */}
    <div className="tabs tabs-boxed mb-6">
      {providerType === 'message' ? (
        <>
          <a className={`tab ${selectedProviderType === 'discord' ? 'tab-active' : ''}`}
             onClick={() => setSelectedProviderType('discord')}>
            Discord
          </a>
          <a className={`tab ${selectedProviderType === 'telegram' ? 'tab-active' : ''}`}
             onClick={() => setSelectedProviderType('telegram')}>
            Telegram
          </a>
          <a className={`tab ${selectedProviderType === 'slack' ? 'tab-active' : ''}`}
             onClick={() => setSelectedProviderType('slack')}>
            Slack
          </a>
        </>
      ) : (
        <>
          <a className={`tab ${selectedProviderType === 'openai' ? 'tab-active' : ''}`}
             onClick={() => setSelectedProviderType('openai')}>
            OpenAI
          </a>
          <a className={`tab ${selectedProviderType === 'anthropic' ? 'tab-active' : ''}`}
             onClick={() => setSelectedProviderType('anthropic')}>
            Anthropic
          </a>
          <a className={`tab ${selectedProviderType === 'ollama' ? 'tab-active' : ''}`}
             onClick={() => setSelectedProviderType('ollama')}>
            Ollama
          </a>
        </>
      )}
    </div>

    {/* Configuration Form */}
    <form onSubmit={handleSubmit}>
      <div className="form-control">
        <label className="label">
          <span className="label-text">Provider Name</span>
        </label>
        <input
          type="text"
          className="input input-bordered w-full"
          value={providerName}
          onChange={(e) => setProviderName(e.target.value)}
          placeholder={getProviderPlaceholder(selectedProviderType)}
        />
      </div>

      {/* Provider-specific fields */}
      {renderProviderSpecificFields(selectedProviderType)}

      <div className="modal-action">
        <button type="button" className="btn btn-ghost" onClick={closeModal}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {isEditMode ? 'Update' : 'Add'} Provider
        </button>
      </div>
    </form>
  </div>
</div>
```

### 6. Persona Display Components

```tsx
// PersonaChip.tsx
const PersonaChip: React.FC<{
  persona: Persona;
  onChange?: (personaId: string) => void;
  disabled?: boolean;
}> = ({ persona, onChange, disabled }) => {
  return (
    <div className="chip bg-base-200 border border-base-300">
      <div className="chip-content">
        <span className="flex items-center gap-2">
          <Mask className="w-4 h-4" />
          {persona.name}
          <span className="badge badge-sm badge-neutral">
            {persona.category}
          </span>
        </span>
        {!disabled && onChange && (
          <button
            className="btn btn-xs btn-circle btn-ghost ml-2"
            onClick={() => {/* Open persona selector */}}
          >
            <Settings className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

// PersonaSelector.tsx
const PersonaSelector: React.FC<{
  selectedPersonaId: string;
  personas: Persona[];
  onSelect: (personaId: string) => void;
  onCreateNew: () => void;
}> = ({ selectedPersonaId, personas, onSelect, onCreateNew }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {personas.map((persona) => (
          <div
            key={persona.id}
            className={`card cursor-pointer transition-all ${
              selectedPersonaId === persona.id
                ? 'ring-2 ring-primary bg-primary/5'
                : 'bg-base-100 hover:bg-base-200'
            }`}
            onClick={() => onSelect(persona.id)}
          >
            <div className="card-body p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold">{persona.name}</h3>
                <span className="badge badge-sm badge-ghost">
                  {persona.category}
                </span>
              </div>
              <p className="text-sm text-base-content/70 mb-2">
                {persona.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {persona.traits.slice(0, 3).map((trait, index) => (
                  <span key={index} className="badge badge-xs badge-outline">
                    {trait.value}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        className="btn btn-outline btn-primary w-full"
        onClick={onCreateNew}
      >
        <Plus className="w-4 h-4 mr-2" />
        Create New Persona
      </button>
    </div>
  );
};
```

### 7. Provider Display Components

```tsx
// ProviderChip.tsx
const ProviderChip: React.FC<{
  provider: MessageProvider | LLMProvider;
  type: 'message' | 'llm';
  onRemove?: () => void;
}> = ({ provider, type, onRemove }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'available':
        return 'badge-success';
      case 'error':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  };

  return (
    <div className="chip bg-base-200 border border-base-300">
      <div className="chip-content">
        <span className="flex items-center gap-2">
          <ProviderIcon type={provider.type} className="w-4 h-4" />
          {provider.name}
          <span className={`badge badge-sm ${getStatusColor(provider.status)}`}>
            {provider.status}
          </span>
        </span>
        {onRemove && (
          <button
            className="btn btn-xs btn-circle btn-ghost ml-2"
            onClick={onRemove}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

// ProviderList.tsx
const ProviderList: React.FC<{
  providers: MessageProvider[] | LLMProvider[];
  type: 'message' | 'llm';
  onRemove?: (providerId: string) => void;
}> = ({ providers, type, onRemove }) => {
  if (providers.length === 0) {
    return (
      <div className="text-center py-4 text-base-content/60">
        <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No {type} providers configured</p>
        <p className="text-xs">Click the + button to add one</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {providers.map((provider, index) => (
        <div key={provider.id} className="relative">
          <ProviderChip
            provider={provider}
            type={type}
            onRemove={() => onRemove?.(provider.id)}
          />
          {type === 'llm' && index === 0 && (
            <div className="absolute -top-2 -right-2">
              <span className="badge badge-primary badge-xs">Primary</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
```

### 8. Navigation Structure Updates

Add new navigation items to UberLayout:

```tsx
// New navigation items
{
  text: 'Message Providers',
  icon: <MessageIcon />,
  path: '/admin/message-providers',
  visible: true,
},
{
  text: 'LLM Providers',
  icon: <BrainIcon />,
  path: '/admin/llm-providers',
  visible: true,
},
{
  text: 'Personas',
  icon: <MaskIcon />,
  path: '/admin/personas',
  visible: true,
},
```

### 9. Persona Configuration Pages

Create dedicated pages for persona management:

```tsx
// PersonasPage.tsx
const PersonasPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Persona Management</h1>
        <button className="btn btn-primary" onClick={openNewPersonaModal}>
          <Plus className="w-4 h-4 mr-2" />
          Create Persona
        </button>
      </div>

      {/* Persona Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {personaCategories.map(category => (
          <Card key={category} className="bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">{category}</h2>
              <p className="text-sm text-base-content/60">
                {getPersonasByCategory(category).length} personas
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Persona Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {personas.map(persona => (
          <Card key={persona.id} className="bg-base-100 shadow-lg hover:shadow-xl transition-shadow">
            <div className="card-body">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="card-title">{persona.name}</h3>
                  <span className="badge badge-sm badge-ghost mt-1">
                    {persona.category}
                  </span>
                </div>
                {persona.isBuiltIn && (
                  <span className="badge badge-sm badge-info">Built-in</span>
                )}
              </div>

              <p className="text-sm text-base-content/70 mb-4">
                {persona.description}
              </p>

              <div className="flex flex-wrap gap-1 mb-4">
                {persona.traits.slice(0, 3).map((trait, index) => (
                  <span key={index} className="badge badge-xs badge-outline">
                    {trait.value}
                  </span>
                ))}
              </div>

              <div className="text-xs text-base-content/50 mb-4">
                Used by {persona.usageCount} bots
              </div>

              <div className="card-actions justify-end">
                <button className="btn btn-sm btn-ghost">Preview</button>
                <button className="btn btn-sm btn-ghost">Edit</button>
                {!persona.isBuiltIn && (
                  <button className="btn btn-sm btn-error">Delete</button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// PersonaConfigModal.tsx
const PersonaConfigModal: React.FC<{
  isOpen: boolean;
  persona?: Persona;
  onClose: () => void;
  onSubmit: (personaData: PersonaFormData) => void;
}> = ({ isOpen, persona, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: persona?.name || '',
    description: persona?.description || '',
    systemPrompt: persona?.systemPrompt || '',
    category: persona?.category || 'general',
    traits: persona?.traits || []
  });

  return (
    <div className={`modal ${isOpen ? 'modal-open' : ''}`}>
      <div className="modal-box max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">
            {persona ? 'Edit Persona' : 'Create New Persona'}
          </h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Persona Name</span>
                <span className="label-text-alt text-error">*</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Friendly Assistant"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Category</span>
              </label>
              <select
                className="select select-bordered"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value as PersonaCategory})}
              >
                <option value="general">General</option>
                <option value="customer_service">Customer Service</option>
                <option value="creative">Creative</option>
                <option value="technical">Technical</option>
                <option value="educational">Educational</option>
                <option value="entertainment">Entertainment</option>
                <option value="professional">Professional</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="form-control mb-6">
            <label className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea
              className="textarea textarea-bordered"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe this persona's characteristics and use case"
              rows={3}
            />
          </div>

          {/* System Prompt */}
          <div className="form-control mb-6">
            <label className="label">
              <span className="label-text">System Prompt</span>
              <span className="label-text-alt text-error">*</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-32"
              value={formData.systemPrompt}
              onChange={(e) => setFormData({...formData, systemPrompt: e.target.value})}
              placeholder="You are a helpful assistant..."
              required
            />
            <label className="label">
              <span className="label-text-alt">
                This prompt will be used to define the AI's behavior and personality
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="modal-action">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {persona ? 'Update' : 'Create'} Persona
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

### 10. Provider Configuration Pages

Create dedicated pages for provider management:

```tsx
// MessageProvidersPage.tsx
const MessageProvidersPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Message Providers</h1>
        <button className="btn btn-primary" onClick={openNewProviderModal}>
          <Plus className="w-4 h-4 mr-2" />
          Add Provider
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Bots Connected</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {messageProviders.map(provider => (
              <tr key={provider.id}>
                <td>{provider.name}</td>
                <td>
                  <span className="badge badge-ghost">
                    <ProviderIcon type={provider.type} className="w-4 h-4 mr-1" />
                    {provider.type}
                  </span>
                </td>
                <td>
                  <StatusBadge status={provider.status} />
                </td>
                <td>{provider.connectedBots.length}</td>
                <td>
                  <div className="flex gap-2">
                    <button className="btn btn-xs btn-ghost">Edit</button>
                    <button className="btn btn-xs btn-ghost">Test</button>
                    <button className="btn btn-xs btn-error">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

## Implementation Status

### ✅ Completed: Persona System (Phase 1-2)
1. ✅ Core persona data models and interfaces
2. ✅ Built-in default "Helpful Assistant" persona
3. ✅ Persona chip component for display
4. ✅ Persona selector component with search/filter
5. ✅ Persona configuration modal with trait management
6. ✅ Comprehensive persona management page
7. ✅ BotCard integration with persona display and selection
8. ✅ Navigation routes and menu integration
9. ✅ usePersonas hook for state management
10. ✅ Persona categories, export functionality, and usage tracking

### 🔄 Current: Provider-Specific Configuration (Phase 3)
1. 🔄 Design dynamic provider configuration system
2. 🔄 Create provider-specific form components
3. 🔄 Implement avatar retrieval from provider APIs
4. 🔄 Update BotCard with enhanced provider configuration

### 📋 Next: Advanced Features
1. Provider templates and preset configurations
2. Advanced provider testing and diagnostics
3. Provider analytics and monitoring
4. Bulk provider operations
5. Import/export provider configurations

## Provider-Specific Configuration Design

### 1. Enhanced Provider Data Model

```typescript
interface ProviderConfig {
  // Base configuration
  id: string;
  name: string;
  type: ProviderType;
  enabled: boolean;

  // Avatar and branding
  avatarUrl?: string;
  brandingColor?: string;
  iconUrl?: string;

  // Connection details
  config: Record<string, any>;
  credentials?: Record<string, string>;

  // Status and metadata
  status: 'connected' | 'disconnected' | 'error' | 'testing';
  lastTested?: string;
  connectedBots: string[];

  // Provider-specific metadata
  metadata?: {
    accountId?: string;
    workspaceName?: string;
    serverName?: string;
    guildName?: string;
    channelCount?: number;
    userCount?: number;
  };
}

type MessageProviderType =
  | 'discord'
  | 'slack'
  | 'mattermost'
  | 'telegram'
  | 'webhook';

type LLMProviderType =
  | 'openai'
  | 'anthropic'
  | 'ollama'
  | 'huggingface'
  | 'google_gemini'
  | 'azure_openai';
```

### 2. Provider Configuration Schema

```typescript
// Discord-specific configuration
interface DiscordConfig {
  botToken: string;
  clientId: string;
  guildId?: string; // Optional server-specific
  intents: string[];
  presence?: {
    status: 'online' | 'idle' | 'dnd' | 'invisible';
    activity?: {
      type: 'Playing' | 'Listening' | 'Watching' | 'Competing';
      name: string;
    };
  };
  allowedChannels?: string[];
  blockedChannels?: string[];
  commandPrefix?: string;
}

// Slack-specific configuration
interface SlackConfig {
  botToken: string;
  appToken: string;
  teamId?: string;
  channelId?: string;
  signingSecret: string;
  socketMode: boolean;
  allowedChannels?: string[];
  blockedUsers?: string[];
}

// Mattermost-specific configuration
interface MattermostConfig {
  instanceUrl: string;
  botToken: string;
  teamId?: string;
  channelId?: string;
  websocketUrl?: string;
  allowedChannels?: string[];
  mentionKeywords?: string[];
}

// OpenAI-specific configuration
interface OpenAIConfig {
  apiKey: string;
  organizationId?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  customInstructions?: string;
}

// Anthropic-specific configuration
interface AnthropicConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}
```

### 3. Dynamic Configuration Form Component

```tsx
interface ProviderConfigFormProps {
  providerType: MessageProviderType | LLMProviderType;
  initialConfig?: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
  onTestConnection: (config: Record<string, any>) => Promise<boolean>;
  onAvatarLoad: (config: Record<string, any>) => Promise<string | null>;
}

const ProviderConfigForm: React.FC<ProviderConfigFormProps> = ({
  providerType,
  initialConfig,
  onConfigChange,
  onTestConnection,
  onAvatarLoad
}) => {
  const [config, setConfig] = useState(initialConfig || {});
  const [isTesting, setIsTesting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);

  // Render provider-specific fields
  const renderProviderFields = () => {
    switch (providerType) {
      case 'discord':
        return <DiscordConfigForm config={config} onChange={setConfig} />;
      case 'slack':
        return <SlackConfigForm config={config} onChange={setConfig} />;
      case 'mattermost':
        return <MattermostConfigForm config={config} onChange={setConfig} />;
      case 'openai':
        return <OpenAIConfigForm config={config} onChange={setConfig} />;
      case 'anthropic':
        return <AnthropicConfigForm config={config} onChange={setConfig} />;
      // ... other providers
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const success = await onTestConnection(config);
      if (success) {
        // Try to load avatar after successful connection
        handleLoadAvatar();
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleLoadAvatar = async () => {
    setIsLoadingAvatar(true);
    try {
      const url = await onAvatarLoad(config);
      setAvatarUrl(url);
    } finally {
      setIsLoadingAvatar(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Provider Header */}
      <div className="flex items-center gap-4">
        <div className="avatar">
          <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Provider avatar" className="rounded-full" />
            ) : (
              <ProviderIcon type={providerType} className="w-8 h-8" />
            )}
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold capitalize">{providerType}</h3>
          <div className="flex items-center gap-2">
            <Badge
              color={isTesting ? "warning" : "neutral"}
              size="sm"
            >
              {isTesting ? "Testing..." : "Not Connected"}
            </Badge>
            {config && Object.keys(config).length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTestConnection}
                disabled={isTesting}
              >
                Test Connection
              </Button>
            )}
            {isLoadingAvatar && (
              <div className="loading loading-spinner loading-sm"></div>
            )}
          </div>
        </div>
      </div>

      {/* Provider-specific configuration fields */}
      {renderProviderFields()}

      {/* Configuration summary */}
      {Object.keys(config).length > 0 && (
        <div className="alert alert-info">
          <Info className="w-4 h-4" />
          <span>
            Configuration is ready. Click "Test Connection" to verify and load avatar.
          </span>
        </div>
      )}
    </div>
  );
};
```

### 4. Enhanced Provider Configuration Modal

```tsx
const ProviderConfigModal: React.FC<ProviderConfigModalProps> = ({
  isOpen,
  providerType,
  initialConfig,
  onClose,
  onSave
}) => {
  const [selectedProviderType, setSelectedProviderType] = useState(providerType);
  const [config, setConfig] = useState(initialConfig || {});
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(selectedProviderType, config);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async (testConfig: Record<string, any>) => {
    // Provider-specific connection testing logic
    return await testProviderConnection(selectedProviderType, testConfig);
  };

  const handleAvatarLoad = async (testConfig: Record<string, any>) => {
    // Provider-specific avatar loading logic
    return await loadProviderAvatar(selectedProviderType, testConfig);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="large">
      <Modal.Header>
        <Modal.Title>
          Configure {providerType === 'message' ? 'Message' : 'LLM'} Provider
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Provider Type Selection */}
        <div className="tabs tabs-boxed mb-6">
          {getProviderTypes(providerType).map(type => (
            <button
              key={type}
              className={`tab ${selectedProviderType === type ? 'tab-active' : ''}`}
              onClick={() => setSelectedProviderType(type)}
            >
              <ProviderIcon type={type} className="w-4 h-4 mr-2" />
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Dynamic Configuration Form */}
        <ProviderConfigForm
          providerType={selectedProviderType}
          initialConfig={config}
          onConfigChange={setConfig}
          onTestConnection={handleTestConnection}
          onAvatarLoad={handleAvatarLoad}
        />
      </Modal.Body>

      <Modal.Actions>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSaving || Object.keys(config).length === 0}
        >
          {isSaving ? (
            <>
              <div className="loading loading-spinner loading-sm mr-2"></div>
              Saving...
            </>
          ) : (
            'Save Provider'
          )}
        </Button>
      </Modal.Actions>
    </Modal>
  );
};
```

### 5. Avatar Retrieval Service

```typescript
// Provider avatar service
class ProviderAvatarService {
  async loadAvatar(
    providerType: string,
    config: Record<string, any>
  ): Promise<string | null> {
    try {
      switch (providerType) {
        case 'discord':
          return await this.loadDiscordAvatar(config);
        case 'slack':
          return await this.loadSlackAvatar(config);
        case 'mattermost':
          return await this.loadMattermostAvatar(config);
        case 'openai':
          return await this.loadOpenAIAvatar(config);
        // ... other providers
        default:
          return null;
      }
    } catch (error) {
      console.error(`Failed to load avatar for ${providerType}:`, error);
      return null;
    }
  }

  private async loadDiscordAvatar(config: DiscordConfig): Promise<string | null> {
    // Use Discord API to get bot avatar
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        'Authorization': `Bot ${config.botToken}`
      }
    });

    if (response.ok) {
      const user = await response.json();
      if (user.avatar) {
        return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
      }
    }
    return null;
  }

  private async loadSlackAvatar(config: SlackConfig): Promise<string | null> {
    // Use Slack API to get bot avatar
    const response = await fetch('https://slack.com/api/auth.test', {
      headers: {
        'Authorization': `Bearer ${config.botToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.ok && data.user) {
        // Get user info including avatar
        const userResponse = await fetch('https://slack.com/api/users.info', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.botToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ user: data.user_id })
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.ok && userData.user.profile?.image_72) {
            return userData.user.profile.image_72;
          }
        }
      }
    }
    return null;
  }

  // Similar methods for other providers...
}
```

### 6. DaisyUI Components for Provider Configuration

| UI Element | DaisyUI Component | Purpose |
|------------|-------------------|---------|
| Provider Type Tabs | `tabs` + `tabs-boxed` | Select provider type |
| Avatar Display | `avatar` + `avatar-placeholder` | Show provider avatar |
| Configuration Forms | `form-control` + `input` + `textarea` | Provider settings |
| Connection Status | `badge` + `alert` | Show connection status |
| Test Button | `btn` + `btn-outline` | Test provider connection |
| Loading States | `loading` + `loading-spinner` | Show progress |
| Success/Error States | `alert` + `alert-success/error` | Feedback |
| Credential Inputs | `input` + `input-bordered` + `input-password` | Secure fields |
| Toggle Switches | `toggle` + `toggle-primary` | Enable/disable options |
| Modal Container | `modal` + `modal-box` | Configuration popup |
| Help Tooltips | `tooltip` + `tooltip-top` | Field guidance |

This enhanced design provides a comprehensive provider-specific configuration system with avatar retrieval, making it easy for users to connect their bots to various services while providing visual feedback and testing capabilities.

## Key Design Decisions

1. **Visual Hierarchy**: Cards for bots, chips for providers/personas, clear status indicators
2. **Quick Actions**: Plus buttons for immediate provider/persona addition
3. **Flexible Access**: Both popup configuration and dedicated pages
4. **Status Awareness**: Real-time provider status with visual indicators
5. **Failover Clarity**: Visual indication of primary LLM provider
6. **Persona Integration**: Each bot has exactly one persona, prominently displayed
7. **Default Persona**: Pre-configured "Helpful Assistant" persona for immediate use
8. **Responsive Design**: Grid layout adapts to screen size
9. **Category Organization**: Personas organized by use case categories
10. **Built-in Protection**: Default personas cannot be deleted

## DaisyUI Benefits

- **Consistent Styling**: Built-in design system ensures consistency
- **Theme Support**: Automatic dark/light mode adaptation
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Responsive**: Mobile-first responsive design patterns
- **Customizable**: Easy to extend with custom classes

This design provides a comprehensive, user-friendly interface for managing bot instances and their providers while maintaining clean code organization and leveraging DaisyUI's component ecosystem.