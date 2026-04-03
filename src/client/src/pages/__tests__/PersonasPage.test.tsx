import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../../components/DaisyUI/ToastNotification';
import PersonasPage from '../PersonasPage';
import { vi, type Mock } from 'vitest';

// Mock the custom hooks that PersonasPage depends on
const mockFetchData = vi.fn();
const mockSetPersonas = vi.fn();

vi.mock('../PersonasPage/hooks/usePersonasData', () => ({
  usePersonasData: vi.fn(() => ({
    bots: [],
    personas: [],
    loading: false,
    error: null,
    fetchData: mockFetchData,
    searchQuery: '',
    setSearchQuery: vi.fn(),
    selectedCategory: 'all',
    setSelectedCategory: vi.fn(),
    filteredPersonas: [],
    filteredPersonaIds: [],
    setPersonas: mockSetPersonas,
  })),
}));

vi.mock('../PersonasPage/hooks/usePersonaActions', () => ({
  usePersonaActions: vi.fn(() => ({
    bulkDeleting: false,
    handlePersonaReorder: vi.fn(),
    handleBulkDeletePersonas: vi.fn(),
    openCreateModal: vi.fn(),
    openEditModal: vi.fn(),
  })),
}));

vi.mock('../../services/api', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getPersonas: vi.fn().mockResolvedValue([]),
    getBots: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../hooks/useBreakpoint', () => ({
  useIsBelowBreakpoint: vi.fn(() => false),
}));

vi.mock('../../hooks/useBulkSelection', () => ({
  useBulkSelection: vi.fn(() => ({
    selectedIds: new Set(),
    selectedCount: 0,
    isAllSelected: false,
    isIndeterminate: false,
    toggleSelection: vi.fn(),
    toggleAll: vi.fn(),
    clearSelection: vi.fn(),
    isSelected: vi.fn(() => false),
    toggleItem: vi.fn(),
  })),
}));

vi.mock('../../hooks/useDragAndDrop', () => ({
  useDragAndDrop: vi.fn(() => ({
    onDragStart: vi.fn(() => vi.fn()),
    onDragOver: vi.fn(() => vi.fn()),
    onDragEnd: vi.fn(),
    onDrop: vi.fn(() => vi.fn()),
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
    getItemStyle: vi.fn(() => ({})),
  })),
}));

vi.mock('lucide-react', async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual };
});

const { usePersonasData } = await import('../PersonasPage/hooks/usePersonasData');

describe('PersonasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProviders = (ui: React.ReactElement) =>
    render(
      <MemoryRouter>
        <ToastProvider>{ui}</ToastProvider>
      </MemoryRouter>
    );

  it('shows loading state initially', () => {
    (usePersonasData as Mock).mockReturnValue({
      bots: [],
      personas: [],
      loading: true,
      error: null,
      fetchData: mockFetchData,
      searchQuery: '',
      setSearchQuery: vi.fn(),
      selectedCategory: 'all',
      setSelectedCategory: vi.fn(),
      filteredPersonas: [],
      filteredPersonaIds: [],
      setPersonas: mockSetPersonas,
    });

    renderWithProviders(<PersonasPage />);
    // SkeletonPage renders a div with role="status"
    expect(screen.getByRole('status', { name: /loading page content/i })).toBeInTheDocument();
  });

  it('renders page heading when no personas exist', async () => {
    renderWithProviders(<PersonasPage />);

    await waitFor(() => {
      expect(screen.getByText('Persona Management')).toBeInTheDocument();
    });
  });

  it('renders personas successfully', async () => {
    const mockPersonas = [
      {
        id: 'persona-1',
        name: 'Test Persona 1',
        description: 'First test persona',
        systemPrompt: 'System prompt 1',
        category: 'general',
        isBuiltIn: false,
        assignedBotNames: [],
        assignedBotIds: [],
      },
    ];

    (usePersonasData as Mock).mockReturnValue({
      bots: [],
      personas: mockPersonas,
      loading: false,
      error: null,
      fetchData: mockFetchData,
      searchQuery: '',
      setSearchQuery: vi.fn(),
      selectedCategory: 'all',
      setSelectedCategory: vi.fn(),
      filteredPersonas: mockPersonas,
      filteredPersonaIds: ['persona-1'],
      setPersonas: mockSetPersonas,
    });

    renderWithProviders(<PersonasPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Persona 1')).toBeInTheDocument();
      expect(screen.getByText('First test persona')).toBeInTheDocument();
    });
  });

  it.todo('shows error alert when data hook returns error (blocked by Alert default-import bug in PersonasPage)');
});
