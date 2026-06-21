/**
 * Unit tests for useProviderPage — the shared state + CRUD hook backing all
 * provider-config pages (LLM, Memory, Message, Tool).
 *
 * Mocking strategy:
 *   - `apiService` (get/post/put/delete) is mocked via vi.mock so no network
 *     happens and we can assert on call arguments / drive responses.
 *   - The context hooks `useWebSocket` and `useSavedStamp`, and the
 *     `useErrorToast` factory, are mocked via vi.mock so the hook can run
 *     outside its providers and we can spy on side effects (showStamp, toast).
 *   - `useUrlParams` and `useLocalStorage` are left REAL; useUrlParams reads
 *     react-router's search params, so every renderHook uses a MemoryRouter
 *     wrapper.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// --- mocks -----------------------------------------------------------------

vi.mock('../../services/api', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const showStamp = vi.fn();
vi.mock('../../contexts/SavedStampContext', () => ({
  useSavedStamp: () => ({ showStamp }),
}));

const mockWebSocket = { configVersion: 0, lastConfigChange: null as any };
vi.mock('../../contexts/WebSocketContext', () => ({
  useWebSocket: () => mockWebSocket,
}));

const errorToast = vi.fn();
vi.mock('../../components/DaisyUI/ToastNotification', () => ({
  useErrorToast: () => errorToast,
}));

import { useProviderPage, UseProviderPageConfig } from '../useProviderPage';
import { apiService } from '../../services/api';

// --- helpers ---------------------------------------------------------------

const config: UseProviderPageConfig = {
  apiPath: '/api/config/tool-profiles',
  entityKey: 'tool',
  wsChangeType: 'tool-profiles',
  localStorageKey: 'tool-expanded',
};

const sampleProfiles = [
  { key: 'gpt4', name: 'GPT 4', provider: 'openai', config: { model: 'gpt-4' } },
  { key: 'claude', name: 'Claude', provider: 'anthropic', config: { model: 'opus' } },
  { key: 'gpt35', name: 'GPT 3.5', provider: 'openai', config: { model: 'gpt-3.5' } },
];

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(MemoryRouter, null, children);

const renderProviderPage = (cfg: UseProviderPageConfig = config) =>
  renderHook(() => useProviderPage(cfg), { wrapper });

const mockApi = apiService as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockWebSocket.configVersion = 0;
  mockWebSocket.lastConfigChange = null;
  // sensible defaults; individual tests override as needed
  mockApi.get.mockResolvedValue({ [config.entityKey]: sampleProfiles });
  mockApi.post.mockResolvedValue({});
  mockApi.put.mockResolvedValue({});
  mockApi.delete.mockResolvedValue({});
});

// --- tests -----------------------------------------------------------------

describe('useProviderPage', () => {
  it('1. fetches on mount, populates profiles from res[entityKey], clears loading', async () => {
    const { result } = renderProviderPage();

    // initial render — loading true before the fetch resolves
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockApi.get).toHaveBeenCalledWith(config.apiPath);
    expect(result.current.profiles).toEqual(sampleProfiles);
    expect(result.current.error).toBeNull();
  });

  it('1b. defaults profiles to [] when res[entityKey] is missing', async () => {
    mockApi.get.mockResolvedValueOnce({});
    const { result } = renderProviderPage();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profiles).toEqual([]);
  });

  it('2. sets error and clears loading when fetch rejects', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderProviderPage();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('boom');
    expect(result.current.profiles).toEqual([]);
  });

  it('3. handleAddProfile opens the form modal in non-edit mode with the default provider', async () => {
    const { result } = renderProviderPage();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleAddProfile('openai');
    });

    expect(result.current.formModal).toEqual({ isOpen: true, isEdit: false, profile: null });
    expect(result.current.selectedProvider).toBe('openai');
    expect(result.current.formData).toEqual({ name: '', provider: 'openai', config: {} });
  });

  it('3b. handleAddProfile with no default provider uses empty provider', async () => {
    const { result } = renderProviderPage();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleAddProfile();
    });

    expect(result.current.formModal.isOpen).toBe(true);
    expect(result.current.selectedProvider).toBe('');
    expect(result.current.formData).toEqual({ name: '', provider: '', config: {} });
  });

  it('4. handleEditProfile opens the form modal in edit mode and populates formData from the profile', async () => {
    const { result } = renderProviderPage();
    await waitFor(() => expect(result.current.loading).toBe(false));

    const profile = sampleProfiles[0];
    act(() => {
      result.current.handleEditProfile(profile);
    });

    expect(result.current.formModal).toEqual({ isOpen: true, isEdit: true, profile });
    expect(result.current.selectedProvider).toBe('openai');
    expect(result.current.formData).toEqual({
      name: 'GPT 4',
      provider: 'openai',
      config: { model: 'gpt-4' },
    });
    // config must be a copy, not the same reference
    expect(result.current.formData.config).not.toBe(profile.config);
  });

  it('5. handleDeleteProfile opens the confirm modal; confirming deletes and refetches', async () => {
    const { result } = renderProviderPage();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleDeleteProfile('gpt4');
    });

    expect(result.current.confirmModal.isOpen).toBe(true);
    expect(result.current.confirmModal.title).toBe('Delete Profile');
    expect(result.current.confirmModal.message).toBe('Delete profile "gpt4"?');

    mockApi.get.mockClear(); // so we can assert the refetch
    await act(async () => {
      await result.current.confirmModal.onConfirm();
    });

    expect(mockApi.delete).toHaveBeenCalledWith(`${config.apiPath}/gpt4`);
    // confirm modal closed
    expect(result.current.confirmModal.isOpen).toBe(false);
    // refetch happened
    await waitFor(() => expect(mockApi.get).toHaveBeenCalledWith(config.apiPath));
  });

  it('5b. handleDeleteProfile surfaces an error toast when delete fails', async () => {
    const { result } = renderProviderPage();
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockApi.delete.mockRejectedValueOnce(new Error('nope'));

    act(() => {
      result.current.handleDeleteProfile('gpt4');
    });
    await act(async () => {
      await result.current.confirmModal.onConfirm();
    });

    expect(errorToast).toHaveBeenCalledWith('Delete Failed', expect.stringContaining('nope'));
  });

  it('6. filteredProfiles filters by searchQuery (name/provider substring) and filterType', async () => {
    const { result } = renderProviderPage();
    await waitFor(() => expect(result.current.loading).toBe(false));

    // baseline — all three
    expect(result.current.filteredProfiles).toHaveLength(3);

    // search by name substring ("gpt" matches "GPT 4" and "GPT 3.5")
    act(() => {
      result.current.setSearchQuery('gpt');
    });
    await waitFor(() =>
      expect(result.current.filteredProfiles.map(p => p.key)).toEqual(['gpt4', 'gpt35']),
    );

    // search by provider substring ("anthropic")
    act(() => {
      result.current.setSearchQuery('anthropic');
    });
    await waitFor(() =>
      expect(result.current.filteredProfiles.map(p => p.key)).toEqual(['claude']),
    );

    // clear search, filter by type
    act(() => {
      result.current.setSearchQuery('');
    });
    act(() => {
      result.current.setFilterType('openai');
    });
    await waitFor(() =>
      expect(result.current.filteredProfiles.map(p => p.key)).toEqual(['gpt4', 'gpt35']),
    );
  });

  it('7. providerTypes derives a unique provider list from profiles', async () => {
    const { result } = renderProviderPage();
    await waitFor(() => expect(result.current.loading).toBe(false));

    // openai appears twice but should be deduped
    expect(result.current.providerTypes).toEqual([
      { label: 'openai', value: 'openai' },
      { label: 'anthropic', value: 'anthropic' },
    ]);
  });

  it('8. toggleExpand toggles expandedProfile between a key and null', async () => {
    const { result } = renderProviderPage();
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.expandedProfile).toBeNull();

    act(() => {
      result.current.toggleExpand('gpt4');
    });
    expect(result.current.expandedProfile).toBe('gpt4');

    // toggling the same key collapses back to null
    act(() => {
      result.current.toggleExpand('gpt4');
    });
    expect(result.current.expandedProfile).toBeNull();

    // toggling a different key while collapsed expands it
    act(() => {
      result.current.toggleExpand('claude');
    });
    expect(result.current.expandedProfile).toBe('claude');
  });

  it('9. handleFormSubmit (create) posts a slugified-key payload, stamps, and refetches', async () => {
    const { result } = renderProviderPage();
    await waitFor(() => expect(result.current.loading).toBe(false));

    // open add modal then fill form data the way the UI would
    act(() => {
      result.current.handleAddProfile('openai');
    });
    act(() => {
      result.current.setFormData({
        name: 'My New Profile!',
        provider: 'openai',
        config: { model: 'gpt-4' },
      });
      result.current.setSelectedProvider('openai');
    });

    mockApi.get.mockClear();
    await act(async () => {
      await result.current.handleFormSubmit();
    });

    expect(mockApi.post).toHaveBeenCalledWith(config.apiPath, {
      key: 'my-new-profile', // slugified: lowercase, spaces->-, strip non [a-z0-9-]
      name: 'My New Profile!',
      provider: 'openai',
      config: { model: 'gpt-4' },
    });
    expect(showStamp).toHaveBeenCalled();
    expect(result.current.formModal.isOpen).toBe(false);
    await waitFor(() => expect(mockApi.get).toHaveBeenCalledWith(config.apiPath));
  });

  it('9b. handleFormSubmit (edit, same key) calls PUT', async () => {
    const { result } = renderProviderPage();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleEditProfile(sampleProfiles[0]); // key 'gpt4', name 'GPT 4'
    });
    // keep the same name so the slugified key equals the old key ('gpt-4' != 'gpt4'?)
    // GPT 4 -> slug 'gpt-4', old key is 'gpt4' => treated as a rename. Force same key:
    act(() => {
      result.current.setFormData(prev => ({ ...prev, name: 'gpt4' }));
    });

    await act(async () => {
      await result.current.handleFormSubmit();
    });

    expect(mockApi.put).toHaveBeenCalledWith(`${config.apiPath}/gpt4`, expect.objectContaining({
      key: 'gpt4',
      provider: 'openai',
    }));
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it('9c. handleFormSubmit (edit, key rename) deletes old then posts new', async () => {
    const { result } = renderProviderPage();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleEditProfile(sampleProfiles[1]); // key 'claude'
    });
    act(() => {
      result.current.setFormData(prev => ({ ...prev, name: 'renamed' }));
    });

    await act(async () => {
      await result.current.handleFormSubmit();
    });

    expect(mockApi.delete).toHaveBeenCalledWith(`${config.apiPath}/claude`);
    expect(mockApi.post).toHaveBeenCalledWith(config.apiPath, expect.objectContaining({
      key: 'renamed',
    }));
  });

  it('9d. handleFormSubmit surfaces an error toast and keeps the modal open on failure', async () => {
    const { result } = renderProviderPage();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.handleAddProfile('openai');
    });
    act(() => {
      result.current.setFormData({ name: 'X', provider: 'openai', config: {} });
      result.current.setSelectedProvider('openai');
    });

    mockApi.post.mockRejectedValueOnce(new Error('save-fail'));
    await act(async () => {
      await result.current.handleFormSubmit();
    });

    expect(errorToast).toHaveBeenCalledWith('Save Failed', expect.stringContaining('save-fail'));
    expect(showStamp).not.toHaveBeenCalled();
    expect(result.current.formModal.isOpen).toBe(true);
  });

  it('10. refetches when WebSocket configVersion changes for the watched type', async () => {
    const { result, rerender } = renderProviderPage();
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockApi.get.mockClear();

    // simulate a config-change event of the watched type
    mockWebSocket.configVersion = 1;
    mockWebSocket.lastConfigChange = { type: 'tool-profiles' };
    rerender();

    await waitFor(() => expect(mockApi.get).toHaveBeenCalledWith(config.apiPath));
  });

  it('10b. ignores WebSocket config changes of a different type', async () => {
    const { result, rerender } = renderProviderPage();
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockApi.get.mockClear();

    mockWebSocket.configVersion = 1;
    mockWebSocket.lastConfigChange = { type: 'something-else' };
    rerender();

    // give any async refetch a tick; it must NOT fire
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockApi.get).not.toHaveBeenCalled();
  });
});
