import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LLMProvidersConfig from '../LLMProvidersConfig';

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

describe('LLMProvidersConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('mock-token');
  });

  test('renders LLM providers list', async () => {
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
      },
      {
        id: 'llm2',
        name: 'Flowise Local',
        type: 'flowise',
        config: {
          apiKey: 'flowise-key',
          apiUrl: 'http://localhost:3000/api/v1',
          chatflowId: 'chatflow-123',
        },
        isActive: false,
      }
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { providers: mockProviders },
      }),
    });

    render(<LLMProvidersConfig />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('OpenAI GPT-4')).toBeInTheDocument();
      expect(screen.getByText('Flowise Local')).toBeInTheDocument();
    });
    
    // Check status indicators
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  test('opens new provider modal', () => {
    render(<LLMProvidersConfig />);
    
    // Click "Add New LLM Provider" button
    const addButton = screen.getByText('Add New LLM Provider');
    fireEvent.click(addButton);
    
    // Check if modal opens
    expect(screen.getByText('Add New LLM Provider')).toBeInTheDocument();
    expect(screen.getByText('Provider Name')).toBeInTheDocument();
    expect(screen.getByText('Provider Type')).toBeInTheDocument();
  });

  test('validates provider form fields', async () => {
    render(<LLMProvidersConfig />);
    
    // Open modal
    fireEvent.click(screen.getByText('Add New LLM Provider'));
    
    // Try to submit without required fields
    const saveButton = screen.getByText('Save Provider');
    fireEvent.click(saveButton);
    
    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/Provider name is required/)).toBeInTheDocument();
    });
  });

  test('submits new provider form successfully', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { providers: [] },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { 
            provider: {
              id: 'llm3',
              name: 'Test Provider',
              type: 'openai',
              config: { apiKey: 'sk-test' },
              isActive: true
            }
          },
        }),
      });

    render(<LLMProvidersConfig />);
    
    // Open modal
    fireEvent.click(screen.getByText('Add New LLM Provider'));
    
    // Fill form
    fireEvent.change(screen.getByLabelText('Provider Name'), {
      target: { value: 'Test Provider' }
    });
    
    fireEvent.change(screen.getByLabelText('Provider Type'), {
      target: { value: 'openai' }
    });
    
    fireEvent.change(screen.getByLabelText('API Key'), {
      target: { value: 'sk-test' }
    });
    
    // Submit form
    const saveButton = screen.getByText('Save Provider');
    fireEvent.click(saveButton);
    
    // Check success message
    await waitFor(() => {
      expect(screen.getByText('LLM provider created successfully')).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        error: 'Internal Server Error',
        message: 'Failed to retrieve providers'
      }),
    });

    render(<LLMProvidersConfig />);
    
    // Wait for error handling
    await waitFor(() => {
      expect(screen.getByText(/Failed to load LLM providers/)).toBeInTheDocument();
    });
  });

  test('toggles provider status', async () => {
    const mockProviders = [
      {
        id: 'llm1',
        name: 'OpenAI GPT-4',
        type: 'openai',
        config: { apiKey: 'sk-test' },
        isActive: true,
      }
    ];

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { providers: mockProviders },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Provider status updated successfully'
        }),
      });

    render(<LLMProvidersConfig />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('OpenAI GPT-4')).toBeInTheDocument();
    });
    
    // Find and click toggle button
    const toggleButton = screen.getByLabelText('Toggle provider status');
    fireEvent.click(toggleButton);
    
    // Check success message
    await waitFor(() => {
      expect(screen.getByText('Provider status updated successfully')).toBeInTheDocument();
    });
  });

  test('opens edit modal for existing provider', async () => {
    const mockProviders = [
      {
        id: 'llm1',
        name: 'OpenAI GPT-4',
        type: 'openai',
        config: {
          apiKey: 'sk-test',
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

    render(<LLMProvidersConfig />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('OpenAI GPT-4')).toBeInTheDocument();
    });
    
    // Find and click edit button
    const editButton = screen.getByLabelText('Edit provider');
    fireEvent.click(editButton);
    
    // Check if edit modal opens with pre-filled data
    await waitFor(() => {
      expect(screen.getByText('Edit LLM Provider')).toBeInTheDocument();
      expect(screen.getByDisplayValue('OpenAI GPT-4')).toBeInTheDocument();
      expect(screen.getByDisplayValue('openai')).toBeInTheDocument();
    });
  });

  test('deletes provider', async () => {
    const mockProviders = [
      {
        id: 'llm1',
        name: 'OpenAI GPT-4',
        type: 'openai',
        config: { apiKey: 'sk-test' },
        isActive: true,
      }
    ];

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { providers: mockProviders },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Provider deleted successfully'
        }),
      });

    render(<LLMProvidersConfig />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('OpenAI GPT-4')).toBeInTheDocument();
    });
    
    // Find and click delete button
    const deleteButton = screen.getByLabelText('Delete provider');
    fireEvent.click(deleteButton);
    
    // Confirm deletion in modal
    await waitFor(() => {
      expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
    });
    
    const confirmButton = screen.getByText('Delete');
    fireEvent.click(confirmButton);
    
    // Check success message
    await waitFor(() => {
      expect(screen.getByText('Provider deleted successfully')).toBeInTheDocument();
    });
  });
});