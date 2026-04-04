/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { apiService } from '../../../../src/client/src/services/api';

jest.mock('../../../../src/client/src/services/api');

const mockSuccessToast = jest.fn();
const mockErrorToast = jest.fn();

jest.mock('../../../../src/client/src/components/DaisyUI/ToastNotification', () => ({
  __esModule: true,
  default: ({ children }: any) => children,
  useToast: () => ({
    addToast: jest.fn(),
    removeToast: jest.fn(),
    clearAll: jest.fn(),
    toasts: [],
  }),
  useSuccessToast: () => mockSuccessToast,
  useErrorToast: () => mockErrorToast,
  useWarningToast: () => jest.fn(),
  useInfoToast: () => jest.fn(),
  ToastProvider: ({ children }: any) => children,
  NotificationCenter: () => null,
}));

const mockRefetch = jest.fn().mockResolvedValue({ data: { data: { templates: [] } } });
const mockUseQuery = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
  QueryClient: jest.fn(),
  QueryClientProvider: ({ children }: any) => children,
}));

jest.mock('../../../../src/client/src/services/ErrorService', () => ({
  ErrorService: { report: jest.fn() },
}));

jest.mock('../../../../src/client/src/hooks/usePageLifecycle', () => ({
  usePageLifecycle: jest.fn(() => ({
    data: {},
    loading: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

// Need to lazily import the component AFTER all mocks are set up
let TemplatesPage: any;

beforeAll(async () => {
  TemplatesPage = (await import('../../../../src/client/src/pages/TemplatesPage')).default;
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

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('TemplatesPage', () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({
      data: { data: { templates: mockTemplates } },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
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
      expect(screen.getByText('Discord Basic Bot')).toBeInTheDocument();
    });

    // Tags are rendered inside badge spans alongside SVG icons
    const tagBadges = document.querySelectorAll('.badge-ghost');
    const tagTexts = Array.from(tagBadges).map((el) => el.textContent?.trim());
    expect(tagTexts).toEqual(expect.arrayContaining(['discord', 'basic', 'slack']));
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
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    renderWithRouter(<TemplatesPage />);

    // Should show skeleton loader (DaisyUI uses 'skeleton' class)
    expect(document.querySelector('.skeleton')).toBeInTheDocument();
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
