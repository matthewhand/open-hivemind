import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ComprehensiveConfigPanel from '../ComprehensiveConfigPanel';

// Mock the API calls
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('ComprehensiveConfigPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('mock-token');
  });

  test('renders configuration panel with tabs', () => {
    render(<ComprehensiveConfigPanel />);
    
    // Check if main tabs are rendered
    expect(screen.getByText('LLM Providers')).toBeInTheDocument();
    expect(screen.getByText('Messenger Providers')).toBeInTheDocument();
    expect(screen.getByText('Personas')).toBeInTheDocument();
    expect(screen.getByText('MCP Servers')).toBeInTheDocument();
    expect(screen.getByText('Tool Usage Guards')).toBeInTheDocument();
  });

  test('switches between tabs correctly', () => {
    render(<ComprehensiveConfigPanel />);
    
    // Initially LLM Providers tab should be active
    expect(screen.getByText('Configure LLM providers')).toBeInTheDocument();
    
    // Click on Messenger Providers tab
    fireEvent.click(screen.getByText('Messenger Providers'));
    expect(screen.getByText('Configure messenger providers')).toBeInTheDocument();
    
    // Click on Personas tab
    fireEvent.click(screen.getByText('Personas'));
    expect(screen.getByText('Manage personas')).toBeInTheDocument();
  });

  test('LLM Providers tab renders correctly', async () => {
    const mockProviders = [
      {
        id: 'llm1',
        name: 'OpenAI GPT-4',
        type: 'openai',
        config: {
          apiKey: 'sk-...',
          model: 'gpt-4',
          baseUrl: 'https://api.openai.com/v1',
          temperature: 0.7,
          maxTokens: 2048,
        },
        isActive: true,
      }
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { providers: mockProviders },
      }),
    });

    render(<ComprehensiveConfigPanel />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('OpenAI GPT-4')).toBeInTheDocument();
    });
  });

  test('Messenger Providers tab renders correctly', async () => {
    const mockProviders = [
      {
        id: 'messenger1',
        name: 'Discord Bot',
        type: 'discord',
        config: {
          token: 'discord-token',
          clientId: 'client-id',
          guildId: 'guild-id',
          channelId: 'channel-id',
        },
        isActive: true,
      }
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { providers: mockProviders },
      }),
    });

    render(<ComprehensiveConfigPanel />);
    
    // Click on Messenger Providers tab
    fireEvent.click(screen.getByText('Messenger Providers'));
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Discord Bot')).toBeInTheDocument();
    });
  });

  test('Personas tab renders correctly', async () => {
    const mockPersonas = [
      {
        key: 'default',
        name: 'Default Assistant',
        systemPrompt: 'You are a helpful AI assistant.'
      }
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { personas: mockPersonas },
      }),
    });

    render(<ComprehensiveConfigPanel />);
    
    // Click on Personas tab
    fireEvent.click(screen.getByText('Personas'));
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Default Assistant')).toBeInTheDocument();
    });
  });

  test('MCP Servers tab renders correctly', async () => {
    const mockServers = {
      servers: [
        {
          name: 'Test Server',
          url: 'http://localhost:3000',
          status: 'connected'
        }
      ],
      configurations: [
        {
          name: 'Test Server',
          serverUrl: 'http://localhost:3000',
          apiKey: 'abc***'
        }
      ]
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockServers,
      }),
    });

    render(<ComprehensiveConfigPanel />);
    
    // Click on MCP Servers tab
    fireEvent.click(screen.getByText('MCP Servers'));
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Server')).toBeInTheDocument();
    });
  });

  test('Tool Usage Guards tab renders correctly', async () => {
    const mockGuards = [
      {
        id: 'guard1',
        name: 'Owner Only for Summarize',
        toolName: 'summarize',
        guardType: 'owner_only',
        config: { ownerOnly: true },
        isActive: true,
      }
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { guards: mockGuards },
      }),
    });

    render(<ComprehensiveConfigPanel />);
    
    // Click on Tool Usage Guards tab
    fireEvent.click(screen.getByText('Tool Usage Guards'));
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Owner Only for Summarize')).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        error: 'Internal Server Error',
        message: 'Failed to retrieve data'
      }),
    });

    render(<ComprehensiveConfigPanel />);
    
    // Wait for error handling
    await waitFor(() => {
      expect(screen.getByText(/Failed to load configuration/)).toBeInTheDocument();
    });
  });

  test('can open new LLM provider modal', () => {
    render(<ComprehensiveConfigPanel />);
    
    // Click "Add New LLM Provider" button
    const addButton = screen.getByText('Add New LLM Provider');
    fireEvent.click(addButton);
    
    // Check if modal opens
    expect(screen.getByText('Add New LLM Provider')).toBeInTheDocument();
    expect(screen.getByText('Provider Name')).toBeInTheDocument();
    expect(screen.getByText('Provider Type')).toBeInTheDocument();
  });

  test('can open new Messenger provider modal', () => {
    render(<ComprehensiveConfigPanel />);
    
    // Click on Messenger Providers tab
    fireEvent.click(screen.getByText('Messenger Providers'));
    
    // Click "Add New Messenger Provider" button
    const addButton = screen.getByText('Add New Messenger Provider');
    fireEvent.click(addButton);
    
    // Check if modal opens
    expect(screen.getByText('Add New Messenger Provider')).toBeInTheDocument();
    expect(screen.getByText('Provider Name')).toBeInTheDocument();
    expect(screen.getByText('Provider Type')).toBeInTheDocument();
  });
});