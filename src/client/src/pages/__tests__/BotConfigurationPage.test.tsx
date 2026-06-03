/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

// ---- Mocks ------------------------------------------------------------------
// Only the network layer is mocked; the real ToastProvider / SavedStampProvider
// are supplied as wrappers so we exercise the actual component wiring.

const { mockGet, mockPut, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPut: vi.fn(),
  mockPost: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  apiService: {
    get: (...args: any[]) => mockGet(...args),
    put: (...args: any[]) => mockPut(...args),
    post: (...args: any[]) => mockPost(...args),
  },
}));

import BotConfigurationPage from '../BotConfigurationPage';
import { ToastProvider } from '../../components/DaisyUI/ToastNotification';
import { SavedStampProvider } from '../../contexts/SavedStampContext';

// ---- Helpers ----------------------------------------------------------------

/**
 * Build a `/api/config/global` response with a single `openai` section whose
 * text field `apiKey` carries the supplied value. Object identity is fresh on
 * each call, mirroring a real refetch returning a brand-new payload -- which is
 * exactly the condition the reset effect must key on.
 */
const buildGlobalConfig = (apiKey: string) => ({
  openai: {
    values: { apiKey },
    schema: { properties: { apiKey: { format: 'string' } } },
  },
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <ToastProvider>
        <SavedStampProvider>
          <BotConfigurationPage />
        </SavedStampProvider>
      </ToastProvider>
    </MemoryRouter>,
  );

const inputByName = (name: string): HTMLInputElement =>
  document.querySelector(`input[name="${name}"]`) as HTMLInputElement;

beforeEach(() => {
  vi.clearAllMocks();
  // Default: rollbacks endpoint returns an empty list, global config returns a
  // section. fetchConfigs() issues two GETs (global, then rollbacks).
  mockGet.mockImplementation((url: string) => {
    if (url.includes('/rollbacks')) return Promise.resolve({ rollbacks: [] });
    return Promise.resolve(buildGlobalConfig('first-key'));
  });
  mockPut.mockResolvedValue({});
});

afterEach(() => cleanup());

// ---- Tests ------------------------------------------------------------------

describe('BotConfigurationPage / ConfigSectionForm', () => {
  it('populates form fields from the fetched config values', async () => {
    renderPage();

    await waitFor(() => expect(inputByName('apiKey')).toBeTruthy());
    expect(inputByName('apiKey').value).toBe('first-key');
  });

  it('resets the form to the new values after a refetch (Reload)', async () => {
    // This is the behaviour the fix is built around: the reset effect keys on
    // the `config` object identity, so a refetch that returns a brand-new object
    // must re-populate the form with the new values.
    let call = 0;
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/rollbacks')) return Promise.resolve({ rollbacks: [] });
      call += 1;
      return Promise.resolve(buildGlobalConfig(call === 1 ? 'first-key' : 'second-key'));
    });

    renderPage();
    await waitFor(() => expect(inputByName('apiKey')?.value).toBe('first-key'));

    fireEvent.click(screen.getByRole('button', { name: /Reload/i }));

    await waitFor(() => expect(inputByName('apiKey')?.value).toBe('second-key'));
  });

  it('renders the correct control per field schema (boolean/enum/number/text)', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/rollbacks')) return Promise.resolve({ rollbacks: [] });
      return Promise.resolve({
        openai: {
          values: {
            enabled: true,
            model: 'gpt-4',
            maxTokens: 1024,
            apiKey: 'secret',
          },
          schema: {
            properties: {
              enabled: { format: 'boolean' },
              model: { enum: ['gpt-4', 'gpt-3.5'] },
              maxTokens: { format: 'int' },
              apiKey: { sensitive: true },
            },
          },
        },
      });
    });

    renderPage();
    await waitFor(() => expect(inputByName('apiKey')).toBeTruthy());

    // boolean -> checkbox toggle, checked because value is true. The Toggle is
    // driven through a react-hook-form Controller and is the only checkbox on
    // the form, so query it by type.
    const enabled = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(enabled).toBeTruthy();
    expect(enabled.checked).toBe(true);

    // enum -> <select> with the options from the schema
    const model = document.querySelector('select[name="model"]') as HTMLSelectElement;
    expect(model).toBeTruthy();
    const optionLabels = Array.from(model.options).map(o => o.value);
    expect(optionLabels).toContain('gpt-4');
    expect(optionLabels).toContain('gpt-3.5');

    // int -> number input
    expect(inputByName('maxTokens').type).toBe('number');

    // sensitive -> password input, masked
    expect(inputByName('apiKey').type).toBe('password');
  });

  it('saves edited values via PUT and refetches afterwards', async () => {
    renderPage();
    await waitFor(() => expect(inputByName('apiKey')?.value).toBe('first-key'));

    fireEvent.change(inputByName('apiKey'), { target: { value: 'edited-key' } });
    fireEvent.click(screen.getByRole('button', { name: /Save openai Configuration/i }));

    await waitFor(() => expect(mockPut).toHaveBeenCalledTimes(1));
    expect(mockPut).toHaveBeenCalledWith('/api/config/global', {
      configName: 'openai',
      updates: { apiKey: 'edited-key' },
    });

    // saveConfig() calls fetchConfigs() again -> two further GETs
    // (global + rollbacks) on top of the initial two.
    await waitFor(() => expect(mockGet.mock.calls.length).toBeGreaterThanOrEqual(4));
  });
});
