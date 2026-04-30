import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hook & component mocks
// ---------------------------------------------------------------------------

// useUrlParams — drives view-mode dropdown state. Tests adjust `currentView`
// to flip the trigger label / active item without re-importing the page.
const setUrlParamMock = vi.fn();
let currentView: 'default' | 'compact' | 'swarm3d' = 'default';
vi.mock('../../../hooks/useUrlParams', () => ({
  default: () => ({
    values: { search: '', status: 'all', view: currentView },
    setValue: setUrlParamMock,
  }),
}));

// useIsBelowBreakpoint — flipped per-test to render desktop vs mobile.
let isMobileMock = false;
vi.mock('../../../hooks/useBreakpoint', () => ({
  useIsBelowBreakpoint: () => isMobileMock,
  useBreakpoint: () => 'lg',
}));

// Heavy data hooks — return empty/stable shapes so the page renders.
vi.mock('../hooks/useBotsPageData', () => ({
  useBotsPageData: () => ({
    personas: [],
    llmProfiles: [],
    globalConfig: {},
    configLoading: false,
  }),
}));
vi.mock('../hooks/useBotsList', () => ({
  useBotsList: () => ({
    bots: [],
    setBots: vi.fn(),
    botsLoading: false,
    fetchBots: vi.fn(),
  }),
}));
vi.mock('../hooks/useBotPreview', () => ({
  useBotPreview: () => ({
    previewBot: null,
    setPreviewBot: vi.fn(),
    previewTab: 'activity',
    setPreviewTab: vi.fn(),
    activityLogs: [],
    chatHistory: [],
    logFilter: '',
    setLogFilter: vi.fn(),
    activityError: null,
    chatError: null,
    fetchPreviewActivity: vi.fn(),
    fetchPreviewChat: vi.fn(),
    handlePreviewBot: vi.fn(),
  }),
}));
vi.mock('../hooks/useBotActions', () => ({
  useBotActions: () => ({
    handleToggleBotStatus: vi.fn(),
    handleUpdateBot: vi.fn(),
    handleCreateBot: vi.fn(),
    handleReorder: vi.fn(),
    handleBulkDelete: vi.fn(),
  }),
}));
vi.mock('../hooks/useBotExport', () => ({
  useBotExport: () => ({
    handleBulkExport: vi.fn(),
    handleExportAll: vi.fn(),
    handleExportSingleBot: vi.fn(),
  }),
}));

// Toast / saved-stamp contexts — return no-op functions.
vi.mock('../../../components/DaisyUI/ToastNotification', () => ({
  useSuccessToast: () => vi.fn(),
  useErrorToast: () => vi.fn(),
}));
vi.mock('../../../contexts/SavedStampContext', () => ({
  useSavedStamp: () => ({ showStamp: vi.fn() }),
}));

// Heavy children — replaced with cheap stubs that expose props for assertions.
vi.mock('../../../components/BotManagement/CreateBotWizard', () => ({
  CreateBotWizard: ({ isOpen }: { isOpen: boolean }) => (
    <div data-testid="create-wizard" data-open={isOpen ? 'true' : 'false'} />
  ),
}));
vi.mock('../../../components/BotManagement/ImportBotsModal', () => ({
  default: () => <div data-testid="import-modal" />,
}));
vi.mock('../../../components/BotSettingsModal', () => ({
  BotSettingsModal: () => <div data-testid="settings-modal" />,
}));
vi.mock('../BotSettingsTab', () => ({ default: () => <div data-testid="settings-tab" /> }));
vi.mock('../BotSwarm3DView', () => ({ BotSwarm3DView: () => <div data-testid="swarm3d" /> }));
vi.mock('../BotListGrid', () => ({ BotListGrid: () => <div data-testid="bot-grid" /> }));
vi.mock('../BotDetailContent', () => ({ BotDetailContent: () => <div data-testid="bot-detail" /> }));

// ---------------------------------------------------------------------------
// Import after mocks so the page picks them up.
// ---------------------------------------------------------------------------
import BotsPage from '../index';

const renderPage = () =>
  render(
    <MemoryRouter>
      <BotsPage />
    </MemoryRouter>
  );

describe('BotsPage', () => {
  beforeEach(() => {
    setUrlParamMock.mockClear();
    currentView = 'default';
    isMobileMock = false;
  });

  it('renders the view-mode dropdown trigger with a "View mode:" aria-label', () => {
    renderPage();
    const trigger = screen.getByRole('button', { name: /^View mode:/ });
    expect(trigger).toBeTruthy();
  });

  it('reflects the current viewMode in the trigger aria-label', () => {
    currentView = 'compact';
    renderPage();
    expect(screen.getByRole('button', { name: 'View mode: Compact' })).toBeTruthy();
  });

  it('calls setUrlParam("view", value) when a dropdown item is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^View mode:/ }));
    const items = screen.getAllByRole('menuitemradio');
    const swarm = items.find((el) => el.textContent?.includes('3D Swarm'));
    expect(swarm).toBeTruthy();
    fireEvent.click(swarm!);
    expect(setUrlParamMock).toHaveBeenCalledWith('view', 'swarm3d');
  });

  it('marks the active dropdown item with aria-checked and indicator classes', () => {
    currentView = 'compact';
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^View mode:/ }));
    const items = screen.getAllByRole('menuitemradio');
    const active = items.find((el) => el.getAttribute('aria-checked') === 'true');
    expect(active).toBeTruthy();
    expect(active!.textContent).toContain('Compact');
    expect(active!.className).toContain('bg-base-200');
    expect(active!.className).toContain('border-l-2');
    expect(active!.className).toContain('border-primary');
  });

  it('renders the MobileFAB pair only when isMobile is true', () => {
    isMobileMock = false;
    const { unmount } = renderPage();
    expect(screen.queryByRole('button', { name: 'Create bot' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Refresh bots' })).toBeNull();
    unmount();

    isMobileMock = true;
    renderPage();
    expect(screen.getByRole('button', { name: 'Create bot' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Refresh bots' })).toBeTruthy();
  });

  it('opens the create modal when the create FAB is clicked', () => {
    isMobileMock = true;
    renderPage();
    expect(screen.queryByTestId('create-wizard')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Create bot' }));
    const wizard = screen.getByTestId('create-wizard');
    expect(wizard.getAttribute('data-open')).toBe('true');
  });
});
