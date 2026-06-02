import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const getGlobalConfigMock = vi.fn();
const getPersonasMock = vi.fn();
const getLlmProfilesMock = vi.fn();
const updateGlobalConfigMock = vi.fn();

vi.mock('../../../services/api', () => ({
  apiService: {
    getGlobalConfig: (...args: unknown[]) => getGlobalConfigMock(...args),
    getPersonas: (...args: unknown[]) => getPersonasMock(...args),
    getLlmProfiles: (...args: unknown[]) => getLlmProfilesMock(...args),
    updateGlobalConfig: (...args: unknown[]) => updateGlobalConfigMock(...args),
  },
}));

const showStampMock = vi.fn();
vi.mock('../../../contexts/SavedStampContext', () => ({
  useSavedStamp: () => ({ showStamp: showStampMock }),
}));

const errorToastMock = vi.fn();
vi.mock('../../../components/DaisyUI/ToastNotification', () => ({
  useErrorToast: () => errorToastMock,
}));

// localStorage hook — keep advanced section collapsed by default but controllable.
vi.mock('../../../hooks/useLocalStorage', () => ({
  useLocalStorage: (_key: string, initial: boolean) => {
    const [value, setValue] = React.useState(initial);
    return [value, setValue];
  },
}));

import BotSettingsTab from '../BotSettingsTab';

beforeEach(() => {
  vi.clearAllMocks();
  getGlobalConfigMock.mockResolvedValue({
    _userSettings: {
      values: {
        'botDefaults.autoStart': true,
        'botDefaults.llmProfile': 'gpt4',
      },
    },
  });
  getPersonasMock.mockResolvedValue([
    { id: 'p1', name: 'Helpful Assistant' },
    { id: 'p2', name: 'Code Reviewer' },
  ]);
  getLlmProfilesMock.mockResolvedValue({
    llm: [
      { key: 'gpt4', name: 'GPT-4' },
      { key: 'claude', name: 'Claude' },
    ],
  });
  updateGlobalConfigMock.mockResolvedValue({ success: true });
});

describe('BotSettingsTab', () => {
  it('loads persona and LLM profile options from the API', async () => {
    render(<BotSettingsTab />);

    await waitFor(() => {
      expect(screen.getByText('Helpful Assistant')).toBeTruthy();
    });
    expect(screen.getByText('Code Reviewer')).toBeTruthy();
    expect(screen.getByText('GPT-4')).toBeTruthy();
    expect(screen.getByText('Claude')).toBeTruthy();

    expect(getGlobalConfigMock).toHaveBeenCalledTimes(1);
    expect(getPersonasMock).toHaveBeenCalledTimes(1);
    expect(getLlmProfilesMock).toHaveBeenCalledTimes(1);
  });

  it('hydrates controls from saved general settings', async () => {
    render(<BotSettingsTab />);

    const autoStart = await screen.findByRole('switch', { name: /Auto-start on creation/i });
    await waitFor(() => expect((autoStart as HTMLInputElement).checked).toBe(true));

    const llmSelect = screen.getByDisplayValue('GPT-4') as HTMLSelectElement;
    expect(llmSelect.value).toBe('gpt4');
  });

  it('persists a change through updateGlobalConfig and shows the saved stamp', async () => {
    render(<BotSettingsTab />);

    const personaSelect = (await screen.findByText('Helpful Assistant')).closest('select')!;
    fireEvent.change(personaSelect, { target: { value: 'p2' } });

    await waitFor(() => {
      expect(updateGlobalConfigMock).toHaveBeenCalledWith({ 'botDefaults.persona': 'p2' });
    });
    expect(showStampMock).toHaveBeenCalled();
  });

  it('reverts and shows an error toast when the save fails', async () => {
    updateGlobalConfigMock.mockRejectedValueOnce(new Error('network'));
    render(<BotSettingsTab />);

    const autoStart = (await screen.findByRole('switch', {
      name: /Auto-start on creation/i,
    })) as HTMLInputElement;
    await waitFor(() => expect(autoStart.checked).toBe(true));

    fireEvent.click(autoStart); // toggle off -> save rejects -> revert to true

    await waitFor(() => {
      expect(errorToastMock).toHaveBeenCalled();
    });
    await waitFor(() => expect(autoStart.checked).toBe(true));
  });

  it('saves numeric defaults as numbers, not strings', async () => {
    render(<BotSettingsTab />);

    // Reveal the advanced section that holds the numeric inputs.
    const advancedToggle = (await screen.findByRole('switch', {
      name: /Advanced/i,
    })) as HTMLInputElement;
    fireEvent.click(advancedToggle);

    const maxRetry = (await screen.findByPlaceholderText('3')) as HTMLInputElement;
    fireEvent.change(maxRetry, { target: { value: '7' } });
    fireEvent.blur(maxRetry);

    await waitFor(() => {
      expect(updateGlobalConfigMock).toHaveBeenCalledWith({
        'botDefaults.maxRetryAttempts': 7,
      });
    });
  });

  it('surfaces an error toast when a numeric save fails', async () => {
    updateGlobalConfigMock.mockRejectedValueOnce(new Error('network'));
    render(<BotSettingsTab />);

    const advancedToggle = (await screen.findByRole('switch', {
      name: /Advanced/i,
    })) as HTMLInputElement;
    fireEvent.click(advancedToggle);

    const dedup = (await screen.findByPlaceholderText('5')) as HTMLInputElement;
    fireEvent.change(dedup, { target: { value: '9' } });
    fireEvent.blur(dedup);

    await waitFor(() => {
      expect(updateGlobalConfigMock).toHaveBeenCalledWith({ 'botDefaults.dedupWindowSeconds': 9 });
    });
    await waitFor(() => expect(errorToastMock).toHaveBeenCalled());
  });

  it('rolls back to the captured value when a direct save fails (closure freshness)', async () => {
    // Toggles call saveField directly, so the rollback target is meaningful.
    // The first save (autoReconnect) fails AFTER a prior successful change,
    // proving saveField captures the up-to-date previous value, not a stale one.
    render(<BotSettingsTab />);

    const advancedToggle = (await screen.findByRole('switch', {
      name: /Advanced/i,
    })) as HTMLInputElement;
    fireEvent.click(advancedToggle);

    const autoReconnect = (await screen.findByRole('switch', {
      name: /Auto-reconnect on disconnect/i,
    })) as HTMLInputElement;
    expect(autoReconnect.checked).toBe(false);

    // First toggle succeeds -> now true.
    fireEvent.click(autoReconnect);
    await waitFor(() => expect(autoReconnect.checked).toBe(true));

    // Second toggle fails -> must roll back to the freshly-captured true.
    updateGlobalConfigMock.mockRejectedValueOnce(new Error('network'));
    fireEvent.click(autoReconnect);
    await waitFor(() => expect(errorToastMock).toHaveBeenCalled());
    await waitFor(() => expect(autoReconnect.checked).toBe(true));
  });

  it('coerces stored numeric defaults that arrive as strings', async () => {
    getGlobalConfigMock.mockResolvedValueOnce({
      _userSettings: {
        values: {
          'botDefaults.maxRetryAttempts': '8',
          'botDefaults.dedupWindowSeconds': '12',
        },
      },
    });
    render(<BotSettingsTab />);

    const advancedToggle = (await screen.findByRole('switch', {
      name: /Advanced/i,
    })) as HTMLInputElement;
    fireEvent.click(advancedToggle);

    const maxRetry = (await screen.findByPlaceholderText('3')) as HTMLInputElement;
    expect(maxRetry.value).toBe('8');
    const dedup = (await screen.findByPlaceholderText('5')) as HTMLInputElement;
    expect(dedup.value).toBe('12');
  });
});
