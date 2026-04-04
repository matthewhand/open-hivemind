import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import TemplatesPage from '../../../../src/client/src/pages/TemplatesPage';
import { apiService } from '../../../../src/client/src/services/api';
import * as usePageLifecycleModule from '../../../../src/client/src/hooks/usePageLifecycle';
import { ToastProvider } from '../../../../src/client/src/components/DaisyUI/ToastNotification';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../../../../src/client/src/services/api');
jest.mock('../../../../src/client/src/hooks/usePageLifecycle', () => ({
  usePageLifecycle: jest.fn(() => ({
    data: {},
    loading: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

const mockTemplates = [
  {
    id: 'discord-basic',
    name: 'Discord Basic Bot',
    description: 'Basic Discord bot configuration',
    category: 'discord',
    tags: ['discord', 'basic'],
    config: {
      messageProvider: 'discord',
      llmProvider: 'openai',
    },
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    usageCount: 10,
  },
  {
    id: 'slack-basic',
    name: 'Slack Basic Bot',
    description: 'Basic Slack bot configuration',
    category: 'slack',
    tags: ['slack', 'basic'],
    config: {
      messageProvider: 'slack',
      llmProvider: 'openai',
    },
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    usageCount: 5,
  },
  {
    id: 'custom-template',
    name: 'Custom Template',
    description: 'A custom template',
    category: 'general',
    tags: ['custom'],
    config: {},
    isBuiltIn: false,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    usageCount: 2,
  },
];

const renderWithRouter = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>{component}</ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

/**
 * @jest-environment jsdom
 */

describe('TemplatesPage', () => {
  const mockUsePageLifecycle = usePageLifecycleModule.usePageLifecycle as jest.Mock;

  beforeEach(() => {
    mockUsePageLifecycle.mockReturnValue({
      data: { data: { templates: mockTemplates } },
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render page title and description', () => {
    renderWithRouter(<TemplatesPage />);

    expect(screen.getByText('Configuration Templates')).toBeInTheDocument();
    expect(
      screen.getByText('Browse and apply pre-built bot configuration templates')
    ).toBeInTheDocument();
  });

  it('should display all templates', async () => {
    renderWithRouter(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Discord Basic Bot')).toBeInTheDocument();
      expect(screen.getByText('Slack Basic Bot')).toBeInTheDocument();
      expect(screen.getByText('Custom Template')).toBeInTheDocument();
    });
  });

  it('should display category tabs with counts', async () => {
    renderWithRouter(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('All Templates')).toBeInTheDocument();
      expect(screen.getByText('Discord')).toBeInTheDocument();
      expect(screen.getByText('Slack')).toBeInTheDocument();
    });

    // Check badge counts
    const badges = screen.getAllByText('1');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('should filter templates by search query', async () => {
    renderWithRouter(<TemplatesPage />);

    const searchInput = screen.getByPlaceholderText(
      'Search templates by name, description, or tags...'
    );

    fireEvent.change(searchInput, { target: { value: 'Discord' } });

    await waitFor(() => {
      expect(screen.getByText('Discord Basic Bot')).toBeInTheDocument();
      expect(screen.queryByText('Slack Basic Bot')).not.toBeInTheDocument();
    });
  });

  it('should filter templates by category', async () => {
    renderWithRouter(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Discord Basic Bot')).toBeInTheDocument();
    });

    const discordTab = screen.getByText('Discord');
    fireEvent.click(discordTab);

    await waitFor(() => {
      expect(screen.getByText('Discord Basic Bot')).toBeInTheDocument();
      expect(screen.queryByText('Slack Basic Bot')).not.toBeInTheDocument();
    });
  });

  it('should show built-in badge for built-in templates', async () => {
    renderWithRouter(<TemplatesPage />);

    await waitFor(() => {
      const builtInBadges = screen.getAllByText('Built-in');
      expect(builtInBadges.length).toBe(2);
    });
  });

  it('should display template tags', async () => {
    renderWithRouter(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('discord')).toBeInTheDocument();
      expect(screen.getByText('basic')).toBeInTheDocument();
      expect(screen.getByText('slack')).toBeInTheDocument();
    });
  });

  it('should display usage count', async () => {
    renderWithRouter(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Used 10x')).toBeInTheDocument();
      expect(screen.getByText('Used 5x')).toBeInTheDocument();
      expect(screen.getByText('Used 2x')).toBeInTheDocument();
    });
  });

  it('should open preview modal when preview button is clicked', async () => {
    renderWithRouter(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Discord Basic Bot')).toBeInTheDocument();
    });

    const previewButtons = screen.getAllByLabelText('Preview template');
    fireEvent.click(previewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Template Preview')).toBeInTheDocument();
      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });
  });

  it('should open apply modal when apply button is clicked', async () => {
    renderWithRouter(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Discord Basic Bot')).toBeInTheDocument();
    });

    const applyButtons = screen.getAllByText('Apply Template');
    fireEvent.click(applyButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Creating a bot from template:')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter bot name')).toBeInTheDocument();
    });
  });

  it('should apply template and create bot', async () => {
    const mockPost = apiService.post as jest.Mock;
    mockPost.mockResolvedValue({
      data: {
        bot: {
          id: 'new-bot-id',
          name: 'My New Bot',
        },
      },
    });

    renderWithRouter(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Discord Basic Bot')).toBeInTheDocument();
    });

    const applyButtons = screen.getAllByText('Apply Template');
    fireEvent.click(applyButtons[0]);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter bot name')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText('Enter bot name');
    fireEvent.change(nameInput, { target: { value: 'My New Bot' } });

    const createButton = screen.getByText('Create Bot');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/admin/templates/discord-basic/apply', {
        name: 'My New Bot',
        description: 'Basic Discord bot configuration',
      });
    });
  });

  it('should show error if bot name is empty when applying', async () => {
    renderWithRouter(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Discord Basic Bot')).toBeInTheDocument();
    });

    const applyButtons = screen.getAllByText('Apply Template');
    fireEvent.click(applyButtons[0]);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter bot name')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create Bot');
    fireEvent.click(createButton);

    // The button should be disabled when name is empty
    expect(createButton).toBeDisabled();
  });

  it('should show delete button only for custom templates', async () => {
    renderWithRouter(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Custom Template')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText('Delete template');
    expect(deleteButtons.length).toBe(1);
  });

  it('should open delete confirmation modal', async () => {
    renderWithRouter(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('Custom Template')).toBeInTheDocument();
    });

    const deleteButton = screen.getByLabelText('Delete template');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Delete Template')).toBeInTheDocument();
      expect(
        screen.getByText(/Are you sure you want to delete the template/)
      ).toBeInTheDocument();
    });
  });

  it('should show empty state when no templates match filter', async () => {
    renderWithRouter(<TemplatesPage />);

    const searchInput = screen.getByPlaceholderText(
      'Search templates by name, description, or tags...'
    );

    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No templates found')).toBeInTheDocument();
      expect(
        screen.getByText('No templates match your search criteria.')
      ).toBeInTheDocument();
    });
  });

  it('should handle loading state', () => {
    mockUsePageLifecycle.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: jest.fn(),
    });

    const { container } = renderWithRouter(<TemplatesPage />);

    // Should show skeleton loader
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should group templates by category', async () => {
    renderWithRouter(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText('discord Templates')).toBeInTheDocument();
      expect(screen.getByText('slack Templates')).toBeInTheDocument();
      expect(screen.getByText('general Templates')).toBeInTheDocument();
    });
  });
});
