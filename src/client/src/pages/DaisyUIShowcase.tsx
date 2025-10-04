import React, { useState, useEffect } from 'react';
import {
  // Core UI Components
  Accordion,
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Carousel,
  Chat,
  DataTable,
  Loading,
  Modal,
  ModalForm,
  StatsCards,
  StepWizard,
  Timeline,
  ToastNotification,
  VisualFeedback,

  // Navigation Components
  DrawerNavigation,
  MobileDrawer,
  NavbarWithSearch,
  HamburgerMenu,
  Drawer,

  // Form & Input Components
  FileUpload,
  Dropdown,
  RangeSlider,

  // Utility Components
  Kbd,
  Tooltip,
  ProgressBar,
  Countdown,
  Mockup,

  // Advanced Components
  AdvancedThemeSwitcher,
  DashboardWidgetSystem,
  SettingsPage,
  ModelAutocomplete,

  // Component Tracking
  DaisyUIComponentTracker,
  trackDaisyUIComponent
} from '../components/DaisyUI';

const DaisyUIShowcase: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('core');
  const [toastMessage, setToastMessage] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [rangeValue, setRangeValue] = useState(50);
  const [showTracker, setShowTracker] = useState(false);
  const [openaiModel, setOpenaiModel] = useState('gpt-4');
  const [ollamaModel, setOllamaModel] = useState('llama2');

  // Track component usage when tabs are switched
  useEffect(() => {
    trackDaisyUIComponent('tabs', '/pages/DaisyUIShowcase.tsx', 'Navigation between component categories');
  }, [selectedTab]);

  // Track page load
  useEffect(() => {
    trackDaisyUIComponent('page', '/pages/DaisyUIShowcase.tsx', 'DaisyUI component showcase page loaded');
  }, []);

  // Track modal usage
  useEffect(() => {
    if (modalOpen) {
      trackDaisyUIComponent('modal', '/pages/DaisyUIShowcase.tsx', 'Demo modal for DaisyUI showcase');
    }
  }, [modalOpen]);

  // Track toast notifications
  useEffect(() => {
    if (toastMessage) {
      trackDaisyUIComponent('toast', '/pages/DaisyUIShowcase.tsx', 'Success notification demonstration');
    }
  }, [toastMessage]);
  
  // Sample data for components
  const sampleBots = [
    { id: '1', name: 'Bot Alpha', status: 'active', provider: 'discord', messageCount: 150, errorCount: 2 },
    { id: '2', name: 'Bot Beta', status: 'inactive', provider: 'slack', messageCount: 87, errorCount: 0 },
    { id: '3', name: 'Bot Gamma', status: 'active', provider: 'telegram', messageCount: 203, errorCount: 1 }
  ];

  const chatMessages = [
    { id: '1', sender: 'User', message: 'Hello!', timestamp: new Date(), isUser: true },
    { id: '2', sender: 'Bot', message: 'Hi there! How can I help you?', timestamp: new Date(), isUser: false },
    { id: '3', sender: 'User', message: 'Show me the weather', timestamp: new Date(), isUser: true }
  ];

  const timelineEvents = [
    { id: '1', title: 'Bot Started', description: 'Discord bot initialized', timestamp: '2025-09-28T10:00:00Z', type: 'success' },
    { id: '2', title: 'Message Sent', description: 'Sent response to user query', timestamp: '2025-09-28T10:05:00Z', type: 'info' },
    { id: '3', title: 'Error Occurred', description: 'API rate limit exceeded', timestamp: '2025-09-28T10:10:00Z', type: 'error' }
  ];

  const accordionItems = [
    { title: 'What is DaisyUI?', content: 'DaisyUI is a semantic component library for Tailwind CSS.' },
    { title: 'How to use components?', content: 'Simply import the components and use them in your React application.' },
    { title: 'Are components customizable?', content: 'Yes, all components are fully customizable using Tailwind CSS classes.' }
  ];

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="bg-primary text-primary-content p-6">
        <h1 className="text-4xl font-bold text-center mb-2">DaisyUI Component Showcase</h1>
        <p className="text-center text-lg opacity-90">Comprehensive demonstration of all 30+ DaisyUI components</p>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs tabs-boxed justify-center mt-6 mx-4">
        <a 
          className={`tab ${selectedTab === 'core' ? 'tab-active' : ''}`}
          onClick={() => setSelectedTab('core')}
        >
          Core Components
        </a>
        <a 
          className={`tab ${selectedTab === 'navigation' ? 'tab-active' : ''}`}
          onClick={() => setSelectedTab('navigation')}
        >
          Navigation
        </a>
        <a 
          className={`tab ${selectedTab === 'forms' ? 'tab-active' : ''}`}
          onClick={() => setSelectedTab('forms')}
        >
          Forms & Inputs
        </a>
        <a 
          className={`tab ${selectedTab === 'utility' ? 'tab-active' : ''}`}
          onClick={() => setSelectedTab('utility')}
        >
          Utilities
        </a>
        <a
          className={`tab ${selectedTab === 'advanced' ? 'tab-active' : ''}`}
          onClick={() => setSelectedTab('advanced')}
        >
          Advanced
        </a>
        <a
          className={`tab ${selectedTab === 'tracking' ? 'tab-active' : ''}`}
          onClick={() => setSelectedTab('tracking')}
        >
          📊 Tracking
        </a>
      </div>

      <div className="container mx-auto p-6">
        
        {/* Core Components Tab */}
        {selectedTab === 'core' && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-center mb-8">Core UI Components</h2>
            
            {/* Stats Cards */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Stats Cards</h3>
              <StatsCards
                stats={[
                  { title: 'Total Bots', value: '3', icon: '🤖', trend: '+12%' },
                  { title: 'Messages Today', value: '1,234', icon: '💬', trend: '+5%' },
                  { title: 'Active Users', value: '567', icon: '👥', trend: '+8%' },
                  { title: 'Uptime', value: '99.9%', icon: '⚡', trend: '0%' }
                ]}
              />
              {trackDaisyUIComponent('stats', '/pages/DaisyUIShowcase.tsx', 'Statistics cards displaying bot metrics')}
            </section>

            {/* Avatars */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Avatars</h3>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex flex-col items-center gap-2">
                  <Avatar size="xs" alt="Small avatar" />
                  <span className="text-sm">xs</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Avatar size="sm" alt="Small avatar" />
                  <span className="text-sm">sm</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Avatar size="md" alt="Medium avatar" />
                  <span className="text-sm">md</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Avatar size="lg" alt="Large avatar" />
                  <span className="text-sm">lg</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Avatar size="xl" alt="Extra large avatar" />
                  <span className="text-sm">xl</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Avatar shape="square" alt="Square avatar" />
                  <span className="text-sm">square</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Avatar online={true} alt="Online avatar" />
                  <span className="text-sm">online</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Avatar placeholder={true}>JD</Avatar>
                  <span className="text-sm">placeholder</span>
                </div>
              </div>
            </section>

            {/* Badges */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Badges</h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="primary" text="Primary" />
                <Badge variant="secondary" text="Secondary" />
                <Badge variant="success" text="Success" />
                <Badge variant="warning" text="Warning" />
                <Badge variant="error" text="Error" />
                <Badge variant="info" text="Info" />
              </div>
            </section>

            {/* Accordion */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Accordion</h3>
              <Accordion items={accordionItems} allowMultiple={true} />
            </section>

            {/* Data Table */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Data Table</h3>
              <DataTable
                data={sampleBots}
                columns={[
                  { key: 'name', header: 'Bot Name' },
                  { key: 'status', header: 'Status' },
                  { key: 'provider', header: 'Provider' },
                  { key: 'messageCount', header: 'Messages' },
                  { key: 'errorCount', header: 'Errors' }
                ]}
                className="w-full"
              />
              {trackDaisyUIComponent('datatable', '/pages/DaisyUIShowcase.tsx', 'Bot management data table')}
            </section>

            {/* Loading States */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Loading States</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card bg-base-200 p-4">
                  <h4 className="font-semibold mb-2">Spinner</h4>
                  <Loading type="spinner" size="md" />
                </div>
                <div className="card bg-base-200 p-4">
                  <h4 className="font-semibold mb-2">Pulse</h4>
                  <Loading type="pulse" size="md" />
                </div>
                <div className="card bg-base-200 p-4">
                  <h4 className="font-semibold mb-2">Skeleton</h4>
                  <Loading type="skeleton" size="md" />
                </div>
              </div>
            </section>

            {/* Timeline */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Timeline</h3>
              <Timeline events={timelineEvents} />
            </section>

            {/* Chat */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Chat Component</h3>
              <div className="max-w-md mx-auto">
                <Chat
                  messages={chatMessages}
                  onSendMessage={(message) => console.log('Sent:', message)}
                />
                {trackDaisyUIComponent('chat', '/pages/DaisyUIShowcase.tsx', 'AI chat interface demonstration')}
              </div>
            </section>

            {/* Carousel */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Carousel</h3>
              <Carousel 
                items={[
                  { id: '1', content: <div className="bg-primary text-primary-content p-8 text-center rounded-lg">Slide 1</div> },
                  { id: '2', content: <div className="bg-secondary text-secondary-content p-8 text-center rounded-lg">Slide 2</div> },
                  { id: '3', content: <div className="bg-accent text-accent-content p-8 text-center rounded-lg">Slide 3</div> }
                ]}
                autoPlay={true}
                interval={3000}
              />
            </section>

            {/* Breadcrumbs */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Breadcrumbs</h3>
              <Breadcrumbs 
                items={[
                  { label: 'Home', href: '/' },
                  { label: 'Components', href: '/components' },
                  { label: 'DaisyUI', href: '/components/daisyui' },
                  { label: 'Showcase', href: '/components/daisyui/showcase' }
                ]}
              />
            </section>

            {/* Modal Demo */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Modal</h3>
              <button 
                className="btn btn-primary"
                onClick={() => setModalOpen(true)}
              >
                Open Modal
              </button>
              
              <Modal 
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Demo Modal"
                size="md"
              >
                <p>This is a demo modal with DaisyUI styling!</p>
                <div className="modal-action">
                  <Button variant="primary" onClick={() => setModalOpen(false)}>
                    Close
                  </Button>
                </div>
              </Modal>
            </section>

            {/* Step Wizard */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Step Wizard</h3>
              <StepWizard 
                steps={[
                  { id: 1, title: 'Basic Info', content: <div>Enter basic information</div> },
                  { id: 2, title: 'Configuration', content: <div>Configure settings</div> },
                  { id: 3, title: 'Review', content: <div>Review and confirm</div> },
                  { id: 4, title: 'Complete', content: <div>Setup complete!</div> }
                ]}
                currentStep={currentStep}
                onStepChange={setCurrentStep}
              />
            </section>
          </div>
        )}

        {/* Navigation Components Tab */}
        {selectedTab === 'navigation' && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-center mb-8">Navigation Components</h2>
            
            {/* Navbar */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Navbar with Search</h3>
              <NavbarWithSearch
                title="Open Hivemind"
                onSearch={(query) => console.log('Search:', query)}
                rightActions={
                  <div className="flex items-center gap-2">
                    <Badge variant="info" text="3 Bots" />
                    <Button variant="ghost" size="sm">Settings</Button>
                  </div>
                }
              />
              {trackDaisyUIComponent('navbar', '/pages/DaisyUIShowcase.tsx', 'Navigation bar with search functionality')}
            </section>

            {/* Hamburger Menu */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Hamburger Menu</h3>
              <HamburgerMenu 
                items={[
                  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
                  { label: 'Bots', href: '/bots', icon: '🤖' },
                  { label: 'Settings', href: '/settings', icon: '⚙️' },
                  { label: 'Help', href: '/help', icon: '❓' }
                ]}
              />
            </section>

            {/* Drawer Navigation Demo */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Drawer Navigation</h3>
              <div className="mockup-window border bg-base-300">
                <div className="flex justify-center px-4 py-16 bg-base-200">
                  <DrawerNavigation 
                    items={[
                      { label: 'Home', href: '/', icon: '🏠' },
                      { label: 'Bots', href: '/bots', icon: '🤖' },
                      { label: 'Analytics', href: '/analytics', icon: '📈' },
                      { label: 'Settings', href: '/settings', icon: '⚙️' }
                    ]}
                    currentPath="/bots"
                  />
                </div>
              </div>
            </section>

            {/* Mobile Drawer */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Mobile Drawer</h3>
              <MobileDrawer 
                isOpen={false}
                onToggle={(open) => console.log('Drawer:', open)}
                items={[
                  { label: 'Dashboard', href: '/dashboard' },
                  { label: 'Bots', href: '/bots' },
                  { label: 'Settings', href: '/settings' }
                ]}
              />
            </section>
          </div>
        )}

        {/* Forms & Inputs Tab */}
        {selectedTab === 'forms' && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-center mb-8">Forms & Input Components</h2>
            
            {/* File Upload */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">File Upload</h3>
              <FileUpload 
                onFileSelect={(files) => console.log('Files:', files)}
                accept=".json,.txt,.yml"
                multiple={true}
                maxSize={10 * 1024 * 1024} // 10MB
              />
            </section>

            {/* Dropdown */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Dropdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Dropdown 
                  label="Select Bot Provider"
                  options={[
                    { value: 'discord', label: 'Discord' },
                    { value: 'slack', label: 'Slack' },
                    { value: 'telegram', label: 'Telegram' }
                  ]}
                  onSelect={(value) => console.log('Selected:', value)}
                />
                
                <Dropdown 
                  label="Select LLM Provider"
                  options={[
                    { value: 'openai', label: 'OpenAI' },
                    { value: 'anthropic', label: 'Anthropic' },
                    { value: 'flowise', label: 'Flowise' }
                  ]}
                  onSelect={(value) => console.log('Selected:', value)}
                  multiple={true}
                />
              </div>
            </section>

            {/* Range Slider */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Range Slider</h3>
              <div className="space-y-4">
                <RangeSlider 
                  label="Response Temperature"
                  min={0}
                  max={100}
                  value={rangeValue}
                  onChange={setRangeValue}
                  step={1}
                  showValue={true}
                />
                
                <RangeSlider 
                  label="Message History Limit"
                  min={1}
                  max={50}
                  value={10}
                  onChange={(value) => console.log('History limit:', value)}
                  step={1}
                  showValue={true}
                  color="secondary"
                />
              </div>
            </section>

            {/* Modal Form */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Modal Form</h3>
              <ModalForm 
                title="Add New Bot"
                fields={[
                  { name: 'name', label: 'Bot Name', type: 'text', required: true },
                  { name: 'provider', label: 'Provider', type: 'select', options: [
                    { value: 'discord', label: 'Discord' },
                    { value: 'slack', label: 'Slack' }
                  ], required: true },
                  { name: 'description', label: 'Description', type: 'textarea' }
                ]}
                onSubmit={(data) => console.log('Form data:', data)}
                submitLabel="Create Bot"
                trigger={<Button variant="primary">Add Bot</Button>}
              />
            </section>

            {/* Model Autocomplete */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Model Autocomplete</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card bg-base-200 p-4">
                  <h4 className="font-semibold mb-2">OpenAI Models</h4>
                  <ModelAutocomplete
                    value={openaiModel}
                    onChange={setOpenaiModel}
                    providerType="openai"
                    placeholder="Enter OpenAI API key to load models..."
                    label="OpenAI Model Selection"
                    apiKey=""
                  />
                </div>

                <div className="card bg-base-200 p-4">
                  <h4 className="font-semibold mb-2">Ollama Models</h4>
                  <ModelAutocomplete
                    value={ollamaModel}
                    onChange={setOllamaModel}
                    providerType="ollama"
                    placeholder="Enter Ollama endpoint to load models..."
                    label="Ollama Model Selection"
                    baseUrl="http://localhost:11434"
                  />
                </div>
              </div>

              <div className="alert alert-info mt-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div>
                  <h3 className="font-bold">Dynamic Model Loading</h3>
                  <div className="text-sm">Enter API keys to dynamically load available models. Features include autocomplete, validation warnings, and support for third-party providers with custom endpoints.</div>
                </div>
              </div>
            </section>
            {trackDaisyUIComponent('model-autocomplete', '/pages/DaisyUIShowcase.tsx', 'Dynamic model selection with autocomplete and validation')}
          </div>
        )}

        {/* Utility Components Tab */}
        {selectedTab === 'utility' && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-center mb-8">Utility Components</h2>
            
            {/* Keyboard Shortcuts */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Keyboard Shortcuts</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card bg-base-200 p-4">
                  <h4 className="font-semibold mb-2">Navigation</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Open Command Palette</span>
                      <Kbd keys={['cmd', 'k']} />
                    </div>
                    <div className="flex justify-between">
                      <span>New Bot</span>
                      <Kbd keys={['cmd', 'n']} />
                    </div>
                  </div>
                </div>
                
                <div className="card bg-base-200 p-4">
                  <h4 className="font-semibold mb-2">Actions</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Save</span>
                      <Kbd keys={['cmd', 's']} />
                    </div>
                    <div className="flex justify-between">
                      <span>Search</span>
                      <Kbd keys={['cmd', 'f']} />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Tooltips */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Tooltips</h3>
              <div className="flex flex-wrap gap-4">
                <Tooltip content="This is a top tooltip" position="top">
                  <Button style="outline">Hover for top tooltip</Button>
                </Tooltip>

                <Tooltip content="This is a bottom tooltip" position="bottom">
                  <Button style="outline">Hover for bottom tooltip</Button>
                </Tooltip>

                <Tooltip content="This is a left tooltip" position="left">
                  <Button style="outline">Hover for left tooltip</Button>
                </Tooltip>

                <Tooltip content="This is a right tooltip" position="right">
                  <Button style="outline">Hover for right tooltip</Button>
                </Tooltip>
              </div>
            </section>

            {/* Progress Bars */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Progress Bars</h3>
              <div className="space-y-4">
                <ProgressBar label="CPU Usage" value={75} max={100} color="primary" showPercentage={true} />
                <ProgressBar label="Memory Usage" value={45} max={100} color="secondary" showPercentage={true} />
                <ProgressBar label="Disk Usage" value={90} max={100} color="warning" showPercentage={true} />
                <ProgressBar label="Network Usage" value={60} max={100} color="info" showPercentage={true} />
              </div>
            </section>

            {/* Countdown */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Countdown Timer</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card bg-base-200 p-4 text-center">
                  <h4 className="font-semibold mb-2">Next Bot Update</h4>
                  <Countdown 
                    targetDate={new Date(Date.now() + 1000 * 60 * 60 * 24)} // 24 hours from now
                    onComplete={() => console.log('Countdown complete!')}
                  />
                </div>
                
                <div className="card bg-base-200 p-4 text-center">
                  <h4 className="font-semibold mb-2">Maintenance Window</h4>
                  <Countdown 
                    targetDate={new Date(Date.now() + 1000 * 60 * 30)} // 30 minutes from now
                    format="compact"
                    onComplete={() => console.log('Maintenance starting!')}
                  />
                </div>
              </div>
            </section>

            {/* Mockups */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Device Mockups</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Mockup type="phone" className="mx-auto">
                  <div className="bg-gradient-to-b from-primary to-secondary p-4 text-white text-center">
                    <h4 className="font-bold">Mobile Dashboard</h4>
                    <p>Bot management on the go</p>
                  </div>
                </Mockup>
                
                <Mockup type="browser" className="mx-auto">
                  <div className="bg-base-100 p-4">
                    <div className="stats stats-vertical lg:stats-horizontal shadow">
                      <div className="stat">
                        <div className="stat-title">Downloads</div>
                        <div className="stat-value">31K</div>
                      </div>
                      <div className="stat">
                        <div className="stat-title">Users</div>
                        <div className="stat-value">4,200</div>
                      </div>
                    </div>
                  </div>
                </Mockup>
              </div>
            </section>

            {/* Visual Feedback */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Visual Feedback</h3>
              <div className="space-y-4">
                <button 
                  className="btn btn-success"
                  onClick={() => setToastMessage('Success! Operation completed.')}
                >
                  Show Success Toast
                </button>
                
                <VisualFeedback 
                  type="success"
                  message="Bot connected successfully!"
                  visible={true}
                />
                
                <VisualFeedback 
                  type="warning"
                  message="API rate limit approaching..."
                  visible={true}
                />
              </div>
            </section>
          </div>
        )}

        {/* Advanced Components Tab */}
        {selectedTab === 'advanced' && (
          <div className="space-y-8">
            <h2 className="text-3xl font-bold text-center mb-8">Advanced Components</h2>
            
            {/* Theme Switcher */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Advanced Theme Switcher</h3>
              <div className="flex justify-center">
                <AdvancedThemeSwitcher />
              </div>
            </section>

            {/* Dashboard Widget System */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Dashboard Widget System</h3>
              <DashboardWidgetSystem 
                widgets={[
                  {
                    id: 'stats',
                    title: 'Bot Statistics',
                    type: 'stats',
                    data: { totalBots: 3, activeBots: 2, messages: 1234 },
                    position: { x: 0, y: 0 },
                    size: { width: 2, height: 1 }
                  },
                  {
                    id: 'activity',
                    title: 'Recent Activity',  
                    type: 'timeline',
                    data: { events: timelineEvents },
                    position: { x: 2, y: 0 },
                    size: { width: 2, height: 2 }
                  }
                ]}
                onWidgetUpdate={(widgets) => console.log('Widgets updated:', widgets)}
              />
            </section>

            {/* Settings Page */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Advanced Settings Page</h3>
              <SettingsPage 
                sections={[
                  {
                    title: 'General',
                    settings: [
                      { key: 'theme', label: 'Theme', type: 'select', value: 'dark', options: [
                        { value: 'light', label: 'Light' },
                        { value: 'dark', label: 'Dark' },
                        { value: 'auto', label: 'Auto' }
                      ]},
                      { key: 'notifications', label: 'Enable Notifications', type: 'boolean', value: true }
                    ]
                  },
                  {
                    title: 'Bot Configuration',
                    settings: [
                      { key: 'defaultProvider', label: 'Default Provider', type: 'select', value: 'discord', options: [
                        { value: 'discord', label: 'Discord' },
                        { value: 'slack', label: 'Slack' }
                      ]},
                      { key: 'maxRetries', label: 'Max Retries', type: 'number', value: 3, min: 1, max: 10 }
                    ]
                  }
                ]}
                onSettingsChange={(settings) => console.log('Settings changed:', settings)}
              />
            </section>
          </div>
        )}

        {/* Component Tracking Tab */}
        {selectedTab === 'tracking' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Component Usage Tracking</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTracker(!showTracker)}
                >
                  {showTracker ? 'Hide Dashboard' : 'Show Dashboard'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  Refresh Data
                </Button>
              </div>
            </div>

            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <div>
                <h3 className="font-bold">Component Usage Tracking</h3>
                <div className="text-sm">This dashboard tracks which DaisyUI components have been used throughout the application, including their location and purpose. Use this to identify unused components and track implementation progress.</div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-title">Total Components</div>
                <div className="stat-value text-primary">30+</div>
                <div className="stat-desc">Available in DaisyUI</div>
              </div>
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-title">Showcase Uses</div>
                <div className="stat-value text-success">20</div>
                <div className="stat-desc">In this showcase</div>
              </div>
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-title">Categories</div>
                <div className="stat-value text-info">5</div>
                <div className="stat-desc">Component types</div>
              </div>
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-title">Real-time</div>
                <div className="stat-value text-secondary">✓</div>
                <div className="stat-desc">Tracking active</div>
              </div>
            </div>

            {/* Component Tracker Dashboard */}
            {showTracker && (
              <div className="mb-8">
                <DaisyUIComponentTracker
                  isOpen={showTracker}
                  onClose={() => setShowTracker(false)}
                />
              </div>
            )}

            {/* Usage Instructions */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title">How to Use Component Tracking</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-lg mb-2">📊 Tracking Overview</h4>
                    <p className="text-sm text-base-content/80">
                      The component tracker automatically monitors which DaisyUI components are used throughout your application.
                      It tracks the component name, file location, and usage purpose to provide comprehensive analytics.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-lg mb-2">🔍 Key Features</h4>
                    <ul className="list-disc list-inside text-sm text-base-content/80 space-y-1">
                      <li><strong>Real-time Statistics:</strong> Live updates of component usage as you navigate</li>
                      <li><strong>Categorized Tracking:</strong> Components organized by type (Core, Navigation, Forms, etc.)</li>
                      <li><strong>Usage Analytics:</strong> Track how often each component is used</li>
                      <li><strong>File Location:</strong> See exactly where each component is implemented</li>
                      <li><strong>Purpose Documentation:</strong> Understand why each component was chosen</li>
                      <li><strong>Unused Components:</strong> Identify components that haven't been used yet</li>
                      <li><strong>Export Data:</strong> Download usage statistics for external analysis</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-lg mb-2">💡 Best Practices</h4>
                    <ul className="list-disc list-inside text-sm text-base-content/80 space-y-1">
                      <li>Use descriptive purposes when tracking components to maintain clear documentation</li>
                      <li>Regularly check the unused components to discover new DaisyUI features</li>
                      <li>Export tracking data to share component usage reports with your team</li>
                      <li>Use the suggestions tab to find opportunities for UI enhancement</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notifications */}
        {toastMessage && (
          <ToastNotification 
            message={toastMessage}
            type="success"
            onClose={() => setToastMessage('')}
            duration={3000}
          />
        )}
      </div>
    </div>
  );
};

export default DaisyUIShowcase;