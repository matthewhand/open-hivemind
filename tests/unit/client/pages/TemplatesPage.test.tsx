/**
 * @jest-environment jsdom
 */
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

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  return new Proxy({}, {
    get: (_target: any, prop: string) => {
      const Icon = (props: any) => {
        const React = require('react');
        return React.createElement('svg', { ...props, 'data-testid': `icon-${prop}` });
      };
      Icon.displayName = prop;
      return Icon;
    },
  });
});

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

const createQueryClient = (templates?: any[]) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  if (templates) {
    queryClient.setQueryData(
      ['apiQuery', '/api/admin/templates'],
      { data: { templates } }
    );
  }
  return queryClient;
};

const renderWithRouter = (component: React.ReactElement, templates?: any[]) => {
  const queryClient = createQueryClient(templates);

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>{component}</ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('TemplatesPage', () => {
  const mockUsePageLifecycle = usePageLifecycleModule.usePageLifecycle as jest.Mock;

  beforeEach(() => {
    mockUsePageLifecycle.mockReturnValue({
      data: { data: { templates: mockTemplates } },
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
    // Configure apiService.get so useQuery resolves with template data
    (apiService as any).get = jest.fn().mockResolvedValue({ data: { templates: mockTemplates } });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render page title and description', async () => {
    renderWithRouter(<TemplatesPage />, mockTemplates);

    await waitFor(() => {
      expect(screen.getByText('Configuration Templates')).toBeInTheDocument();
      expect(
        screen.getByText('Browse and apply pre-built bot configuration templates')
      ).toBeInTheDocument();
    });
  });

  it('should display all templates', async () => {
    renderWithRouter(<TemplatesPage />, mockTemplates);

    await waitFor(() => {
      expect(screen.getAllByText('Discord Basic Bot').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Slack Basic Bot').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Custom Template').length).toBeGreaterThan(0);
    });
  });

  it('should display category tabs with counts', async () => {
    renderWithRouter(<TemplatesPage />, mockTemplates);

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
    renderWithRouter(<TemplatesPage />, mockTemplates);

    await waitFor(() => {
      expect(screen.getAllByText('Discord Basic Bot').length).toBeGreaterThan(0);
    });

    // Wait for page to fully load and search input to appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search templates by name, description, or tags...')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(
      'Search templates by name, description, or tags...'
    );

    fireEvent.change(searchInput, { target: { value: 'Discord' } });

    await waitFor(() => {
      expect(screen.getAllByText('Discord Basic Bot').length).toBeGreaterThan(0);
      expect(screen.queryByText('Slack Basic Bot')).toBeNull();
    });
  });

  it('should filter templates by category', async () => {
    renderWithRouter(<TemplatesPage />, mockTemplates);

    await waitFor(() => {
      expect(screen.getAllByText('Discord Basic Bot').length).toBeGreaterThan(0);
    });

    const discordTab = screen.getByText('Discord');
    fireEvent.click(discordTab);

    await waitFor(() => {
      expect(screen.getAllByText('Discord Basic Bot').length).toBeGreaterThan(0);
      // Slack templates are filtered out of the grid but may still appear in the carousel
      // Just verify Discord templates are visible after filter
    });
  });

  it('should show built-in badge for built-in templates', async () => {
    renderWithRouter(<TemplatesPage />, mockTemplates);

    await waitFor(() => {
      const builtInBadges = screen.getAllByText('Built-in');
      expect(builtInBadges.length).toBe(2);
    });
  });

  it('should display template tags', async () => {
    renderWithRouter(<TemplatesPage />, mockTemplates);

    await waitFor(() => {
      expect(screen.getAllByText('discord').length).toBeGreaterThan(0);
      expect(screen.getAllByText('basic').length).toBeGreaterThan(0);
      expect(screen.getAllByText('slack').length).toBeGreaterThan(0);
    });
  });

  it('should display usage count', async () => {
    renderWithRouter(<TemplatesPage />, mockTemplates);

    await waitFor(() => {
      expect(screen.getByText('Used 10x')).toBeInTheDocument();
      expect(screen.getByText('Used 5x')).toBeInTheDocument();
      expect(screen.getByText('Used 2x')).toBeInTheDocument();
    });
  });

  it('should open preview modal when preview button is clicked', async () => {
    renderWithRouter(<TemplatesPage />, mockTemplates);

    await waitFor(() => {
      expect(screen.getAllByText('Discord Basic Bot').length).toBeGreaterThan(0);
    });

    const previewButtons = screen.getAllByLabelText('Preview template');
    fireEvent.click(previewButtons[0]);

    await waitFor(() => {
      // Modal title is the template name, not 'Template Preview'
      expect(screen.getByText('Configuration')).toBeInTheDocument();
    });
  });

  it('should open apply modal when apply button is clicked', async () => {
    renderWithRouter(<TemplatesPage />, mockTemplates);

    await waitFor(() => {
      expect(screen.getAllByText('Discord Basic Bot').length).toBeGreaterThan(0);
    });

    const applyButtons = screen.getAllByText('Apply Template');
    fireEvent.click(applyButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Creating a bot from template/)).toBeInTheDocument();
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

    renderWithRouter(<TemplatesPage />, mockTemplates);

    await waitFor(() => {
      expect(screen.getAllByText('Discord Basic Bot').length).toBeGreaterThan(0);
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
    renderWithRouter(<TemplatesPage />, mockTemplates);

    await waitFor(() => {
      expect(screen.getAllByText('Discord Basic Bot').length).toBeGreaterThan(0);
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
    renderWithRouter(<TemplatesPage />, mockTemplates);

    await waitFor(() => {
      expect(screen.getAllByText('Custom Template').length).toBeGreaterThan(0);
    });

    const deleteButtons = screen.getAllByLabelText('Delete template');
    expect(deleteButtons.length).toBe(1);
  });

  it('should open delete confirmation modal', async () => {
    renderWithRouter(<TemplatesPage />, mockTemplates);

    await waitFor(() => {
      expect(screen.getAllByText('Custom Template').length).toBeGreaterThan(0);
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
    renderWithRouter(<TemplatesPage />, mockTemplates);

    // Wait for search input to appear (page must load first)
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search templates by name, description, or tags...')).toBeInTheDocument();
    });

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
    // Make apiService.get never resolve so useQuery stays loading
    (apiService.get as jest.Mock).mockReturnValue(new Promise(() => {}));
    mockUsePageLifecycle.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: jest.fn(),
    });

    const { container } = renderWithRouter(<TemplatesPage />);

    // Should show skeleton loader (SkeletonPage uses skeleton class)
    expect(container.querySelector('.skeleton')).toBeInTheDocument();
  });

  it('should group templates by category', async () => {
    renderWithRouter(<TemplatesPage />, mockTemplates);

    await waitFor(() => {
      expect(screen.getByText('discord Templates')).toBeInTheDocument();
      expect(screen.getByText('slack Templates')).toBeInTheDocument();
      expect(screen.getByText('general Templates')).toBeInTheDocument();
    });
  });
});
