import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProvidersPage from '../ProvidersPage';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock DaisyUI components to simplify testing
jest.mock('../../components/DaisyUI', () => ({
  Card: ({ children, className }: any) => <div data-testid="card" className={className}>{children}</div>,
  Button: ({ children, onClick, className }: any) => <button onClick={onClick} className={className}>{children}</button>,
  Badge: ({ children, variant }: any) => <span data-testid={`badge-${variant}`}>{children}</span>,
  Breadcrumbs: () => <div data-testid="breadcrumbs" />,
}));

describe('ProvidersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
  };

  it('renders provider categories correctly', () => {
    renderWithRouter(<ProvidersPage />);

    // Check for category titles
    expect(screen.getByText('Message Providers')).toBeDefined();
    expect(screen.getByText('LLM Providers')).toBeDefined();

    // Check for category descriptions
    expect(screen.getByText(/Configure Discord, Telegram, Slack, and Webhook providers/i)).toBeDefined();
    expect(screen.getByText(/Set up OpenAI, Anthropic, Ollama, and custom LLM providers/i)).toBeDefined();
  });

  it('renders all provider types in badges', () => {
    renderWithRouter(<ProvidersPage />);

    // Message Providers
    expect(screen.getByText('Discord')).toBeDefined();
    expect(screen.getByText('Telegram')).toBeDefined();
    expect(screen.getByText('Slack')).toBeDefined();
    expect(screen.getByText('Webhook')).toBeDefined();

    // LLM Providers
    expect(screen.getByText('OpenAI')).toBeDefined();
    expect(screen.getByText('Anthropic')).toBeDefined();
    expect(screen.getByText('Ollama')).toBeDefined();
    expect(screen.getByText('Custom')).toBeDefined();
  });

  it('navigates to message providers config when clicked', () => {
    renderWithRouter(<ProvidersPage />);

    const buttons = screen.getAllByRole('button');
    const configureMessageButton = buttons.find(button => button.textContent?.includes('Configure Message Providers'));

    if (configureMessageButton) {
      fireEvent.click(configureMessageButton);
      expect(mockNavigate).toHaveBeenCalledWith('/admin/providers/message');
    }
  });

  it('navigates to LLM providers config when clicked', () => {
    renderWithRouter(<ProvidersPage />);

    const buttons = screen.getAllByRole('button');
    const configureLLMButton = buttons.find(button => button.textContent?.includes('Configure LLM Providers'));

    if (configureLLMButton) {
      fireEvent.click(configureLLMButton);
      expect(mockNavigate).toHaveBeenCalledWith('/admin/providers/llm');
    }
  });

  it('renders features list for each category', () => {
    renderWithRouter(<ProvidersPage />);

    // Message Features
    expect(screen.getByText('Real-time messaging integration')).toBeDefined();
    expect(screen.getByText('Multi-platform support')).toBeDefined();

    // LLM Features
    expect(screen.getByText('Multiple AI model support')).toBeDefined();
    expect(screen.getByText('Fallback configuration')).toBeDefined();
  });

  it('renders Quick Start Guide section', () => {
    renderWithRouter(<ProvidersPage />);

    expect(screen.getByText('Quick Start Guide')).toBeDefined();
    expect(screen.getByText('Configure Providers')).toBeDefined();
    expect(screen.getByText('Create Bot Instance')).toBeDefined();
    expect(screen.getByText('Start Bot')).toBeDefined();
  });
});
