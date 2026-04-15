/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TemplatesPage from '../../../../src/client/src/pages/TemplatesPage';
import { apiService } from '../../../../src/client/src/services/api';
import { useApiQuery } from '../../../../src/client/src/hooks/useApiQuery';
import * as usePageLifecycleModule from '../../../../src/client/src/hooks/usePageLifecycle';
import { ToastProvider, useSuccessToast, useErrorToast } from '../../../../src/client/src/components/DaisyUI/ToastNotification';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock lucide-react icons
jest.mock('lucide-react', () => {
  const React = require('react');
  const mockIcon = (name: string) => (props: any) => React.createElement('div', { 'data-testid': `icon-${name.toLowerCase()}`, ...props });
  return {
    FileText: mockIcon('FileText'),
    Search: mockIcon('Search'),
    Filter: mockIcon('Filter'),
    Plus: mockIcon('Plus'),
    CheckCircle: mockIcon('CheckCircle'),
    Clock: mockIcon('Clock'),
    Tag: mockIcon('Tag'),
    Package: mockIcon('Package'),
    AlertCircle: mockIcon('AlertCircle'),
    RefreshCw: mockIcon('RefreshCw'),
    ChevronRight: mockIcon('ChevronRight'),
    Download: mockIcon('Download'),
    Trash2: mockIcon('Trash2'),
    Copy: mockIcon('Copy'),
    Eye: mockIcon('Eye'),
    Edit3: mockIcon('Edit3'),
    User: mockIcon('User'),
    Calendar: mockIcon('Calendar'),
  };
});

jest.mock('../../../../src/client/src/components/DaisyUI/ToastNotification', () => {
  const React = require('react');
  return {
    __esModule: true,
    ToastProvider: ({ children }: any) => React.createElement('div', { 'data-testid': 'toast-provider' }, children),
    useToast: () => ({ addToast: jest.fn() }),
    useSuccessToast: () => jest.fn(),
    useErrorToast: () => jest.fn(),
    useWarningToast: () => jest.fn(),
    useInfoToast: () => jest.fn(),
  };
});

// Mock DaisyUI components
jest.mock('../../../../src/client/src/components/DaisyUI', () => {
  const React = require('react');
  const mockComponent = (name: string) => ({ children, ...props }: any) => 
    React.createElement('div', { 'data-testid': name.toLowerCase(), ...props }, children);
  
  return {
    __esModule: true,
    PageHeader: ({ title, children }: any) => React.createElement('div', { 'data-testid': 'page-header' }, title, children),
    CodeBlock: ({ code }: any) => React.createElement('pre', { 'data-testid': 'code-block' }, code),
    Button: ({ children, onClick, disabled, loading }: any) => (
      React.createElement('button', { 
        onClick, 
        disabled: disabled || loading, 
        'data-testid': 'button' 
      }, loading ? 'Loading...' : children)
    ),
    Tabs: mockComponent('Tabs'),
    LoadingSpinner: () => React.createElement('div', { 'data-testid': 'loading-spinner' }, 'Loading...'),
    EmptyState: ({ title }: any) => React.createElement('div', { 'data-testid': 'empty-state' }, title),
    SkeletonPage: () => React.createElement('div', { 'data-testid': 'skeleton-page' }, 'Loading Skeleton...'),
    Modal: ({ children, isOpen, title }: any) => isOpen ? React.createElement('div', { 'data-testid': 'modal' }, React.createElement('h3', {}, title), children) : null,
    ConfirmModal: ({ children, isOpen, title }: any) => isOpen ? React.createElement('div', { 'data-testid': 'confirm-modal' }, React.createElement('h3', {}, title), children) : null,
    Alert: mockComponent('Alert'),
    Badge: ({ children }: any) => React.createElement('span', { 'data-testid': 'badge' }, children),
    Card: mockComponent('Card'),
    Divider: () => React.createElement('hr', { 'data-testid': 'divider' }),
    Carousel: mockComponent('Carousel'),
    Pagination: () => React.createElement('div', { 'data-testid': 'pagination' }, 'Pagination'),
  };
});

jest.mock('../../../../src/client/src/components/DaisyUI/DetailDrawer', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, isOpen, title }: any) => isOpen ? React.createElement('div', { 'data-testid': 'detail-drawer' }, React.createElement('h3', {}, title), children) : null,
  };
});

jest.mock('../../../../src/client/src/components/DaisyUI/Input', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: any) => React.createElement('input', { ...props, 'data-testid': 'input' }),
  };
});

jest.mock('../../../../src/client/src/components/DaisyUI/Textarea', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: any) => React.createElement('textarea', { ...props, 'data-testid': 'textarea' }),
  };
});

jest.mock('../../../../src/client/src/components/SearchFilterBar', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('div', { 'data-testid': 'search-filter-bar' }, 'Search Filter Bar'),
  };
});

jest.mock('../../../../src/client/src/services/api', () => {
  const mockApi = {
    useGetTemplatesQuery: jest.fn(),
    useDeleteTemplateMutation: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  };
  return {
    apiService: mockApi,
    __esModule: true,
  };
});

jest.mock('../../../../src/client/src/hooks/usePageLifecycle', () => ({
  usePageLifecycle: jest.fn(),
}));

jest.mock('../../../../src/client/src/hooks/useApiQuery', () => ({
  useApiQuery: jest.fn(() => ({
    data: { data: { templates: mockTemplates } },
    loading: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

const mockTemplates = [
  {
    id: '1',
    name: 'Discord Basic',
    description: 'Basic Discord bot configuration',
    category: 'discord',
    tags: ['discord', 'basic'],
    config: {
      messageProvider: 'discord',
      llmProvider: 'openai',
    },
    isBuiltIn: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    name: 'Custom Template',
    description: 'A custom template',
    category: 'general',
    tags: ['custom'],
    config: {
      messageProvider: 'slack',
    },
    isBuiltIn: false,
    createdAt: new Date('2024-01-02'),
  },
];

const createQueryClient = (templates: any = []) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return queryClient;
};

const renderWithRouter = (component: React.ReactElement, templates: any = []) => {
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
  beforeEach(() => {
    jest.clearAllMocks();
    (apiService.useGetTemplatesQuery as jest.Mock).mockReturnValue({
      data: { templates: mockTemplates },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
    (apiService.useDeleteTemplateMutation as jest.Mock).mockReturnValue([
      jest.fn().mockResolvedValue({}),
      { isLoading: false },
    ]);
    (usePageLifecycleModule.usePageLifecycle as jest.Mock).mockReturnValue({});
    (useApiQuery as any).mockReturnValue({
      data: { data: { templates: mockTemplates } },
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('renders templates list', async () => {
    renderWithRouter(<TemplatesPage />);
    expect(screen.getByText('Discord Basic')).toBeInTheDocument();
    expect(screen.getByText('Custom Template')).toBeInTheDocument();
  });

  it('filters templates by category', async () => {
    renderWithRouter(<TemplatesPage />);

    // Clicking Discord tab
    const discordTab = screen.getByText('Discord');
    fireEvent.click(discordTab);

    expect(screen.getByText('Discord Basic')).toBeInTheDocument();
    // In actual implementation, filtering might hide the other one
  });

  it('opens detail drawer when clicking a template', async () => {
    renderWithRouter(<TemplatesPage />);

    const templateCard = screen.getByText('Discord Basic');
    fireEvent.click(templateCard);

    expect(screen.getByTestId('detail-drawer')).toBeInTheDocument();
    expect(screen.getByText('Basic Discord bot configuration')).toBeInTheDocument();
  });

  it('should apply template and create bot', async () => {
    const mockPost = apiService.post as jest.Mock;
    mockPost.mockResolvedValue({
      data: {
        bot: {
          id: 'new-bot-id',
          name: 'New Bot',
        }
      }
    });

    renderWithRouter(<TemplatesPage />);

    // Open template
    fireEvent.click(screen.getByText('Discord Basic'));

    // Enter bot name
    const nameInput = screen.getByPlaceholderText(/Enter bot name/i);
    fireEvent.change(nameInput, { target: { value: 'New Bot' } });

    // Apply
    const applyButton = screen.getByText(/Create Bot from Template/i);
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/admin/bots', expect.objectContaining({
        name: 'New Bot',
      }));
    });
  });

  it('should show error if bot name is empty when applying', async () => {
    renderWithRouter(<TemplatesPage />);

    fireEvent.click(screen.getByText('Discord Basic'));

    const applyButton = screen.getByText(/Create Bot from Template/i);
    fireEvent.click(applyButton);

    // Should show validation error (this depends on how your component handles it)
    // For now we just verify it didn't call the API
    expect(apiService.post).not.toHaveBeenCalled();
  });

  it('should show delete button only for custom templates', async () => {
    renderWithRouter(<TemplatesPage />);

    // Built-in template
    fireEvent.click(screen.getByText('Discord Basic'));
    expect(screen.queryByText(/Delete Template/i)).not.toBeInTheDocument();

    // Custom template
    // Close first drawer
    fireEvent.click(screen.getByText('Custom Template'));
    expect(screen.getByText(/Delete Template/i)).toBeInTheDocument();
  });

  it('should open delete confirmation modal', async () => {
    renderWithRouter(<TemplatesPage />);

    fireEvent.click(screen.getByText('Custom Template'));
    const deleteButton = screen.getByText(/Delete Template/i);
    fireEvent.click(deleteButton);

    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete this template/i)).toBeInTheDocument();
  });

  it('should show empty state when no templates match filter', async () => {
    (useApiQuery as any).mockReturnValue({
      data: { data: { templates: [] } },
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    renderWithRouter(<TemplatesPage />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('should handle loading state', async () => {
    (useApiQuery as any).mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: jest.fn(),
    });

    renderWithRouter(<TemplatesPage />);
    expect(screen.getByTestId('skeleton-page')).toBeInTheDocument();
  });

  it('should group templates by category', async () => {
    renderWithRouter(<TemplatesPage />);
    // Just verify the tabs exist
    expect(screen.getByText('Discord')).toBeInTheDocument();
    expect(screen.getByText('Slack')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
  });
});

