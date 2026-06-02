import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PersonaSettingsTab,
  PERSONA_SETTINGS_STORAGE_KEY,
  DEFAULT_PERSONA_SETTINGS,
} from './PersonaSettingsTab';
import type { Persona } from './hooks/usePersonasData';

const personas: Persona[] = [
  { id: 'p1', name: 'Helper', description: '', systemPrompt: '' } as unknown as Persona,
  { id: 'p2', name: 'Coder', description: '', systemPrompt: '' } as unknown as Persona,
];

/**
 * The shared test setup mocks localStorage with no-op vi.fn() stubs. Install a
 * real in-memory store per test so useLocalStorage round-trips correctly.
 */
let store: Record<string, string>;
beforeEach(() => {
  store = {};
  const mock = {
    getItem: vi.fn((k: string) => (k in store ? store[k] : null)),
    setItem: vi.fn((k: string, v: string) => {
      store[k] = String(v);
    }),
    removeItem: vi.fn((k: string) => {
      delete store[k];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn(),
    length: 0,
  };
  Object.defineProperty(window, 'localStorage', { value: mock, configurable: true });
});

describe('PersonaSettingsTab', () => {
  it('renders editable controls instead of a "coming soon" placeholder', () => {
    render(<PersonaSettingsTab personas={personas} />);
    expect(screen.queryByText(/coming soon/i)).toBeNull();
    expect(screen.getByLabelText('Default Persona')).toBeInTheDocument();
    expect(screen.getByLabelText('Temperature')).toBeInTheDocument();
    expect(screen.getByLabelText('Max Tokens')).toBeInTheDocument();
  });

  it('lists provided personas as default-persona options', () => {
    render(<PersonaSettingsTab personas={personas} />);
    const select = screen.getByLabelText('Default Persona') as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toContain('p1');
    expect(values).toContain('p2');
  });

  it('disables Save until a change is made, then persists to localStorage and calls onSaved', () => {
    const onSaved = vi.fn();
    render(<PersonaSettingsTab personas={personas} onSaved={onSaved} />);

    const saveBtn = screen.getByRole('button', { name: /save settings/i });
    expect(saveBtn).toBeDisabled();

    const select = screen.getByLabelText('Default Persona') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'p2' } });

    expect(saveBtn).not.toBeDisabled();
    fireEvent.click(saveBtn);

    expect(onSaved).toHaveBeenCalledTimes(1);
    const stored = JSON.parse(store[PERSONA_SETTINGS_STORAGE_KEY] || '{}');
    expect(stored.defaultPersonaId).toBe('p2');
    // Save becomes disabled again once draft matches saved state.
    expect(saveBtn).toBeDisabled();
  });

  it('reverts unsaved changes back to the saved state', () => {
    render(<PersonaSettingsTab personas={personas} />);
    const maxTokens = screen.getByLabelText('Max Tokens') as HTMLInputElement;
    expect(maxTokens.value).toBe(String(DEFAULT_PERSONA_SETTINGS.maxTokens));

    fireEvent.change(maxTokens, { target: { value: '4096' } });
    expect(maxTokens.value).toBe('4096');

    fireEvent.click(screen.getByRole('button', { name: /revert/i }));
    expect(maxTokens.value).toBe(String(DEFAULT_PERSONA_SETTINGS.maxTokens));
  });

  it('hydrates saved settings from localStorage on mount', () => {
    store[PERSONA_SETTINGS_STORAGE_KEY] = JSON.stringify({
      ...DEFAULT_PERSONA_SETTINGS,
      defaultPersonaId: 'p1',
      maxTokens: 1024,
    });
    render(<PersonaSettingsTab personas={personas} />);
    expect((screen.getByLabelText('Default Persona') as HTMLSelectElement).value).toBe('p1');
    expect((screen.getByLabelText('Max Tokens') as HTMLInputElement).value).toBe('1024');
  });

  it('reveals advanced controls when the Advanced toggle is enabled', () => {
    render(<PersonaSettingsTab personas={personas} />);
    expect(screen.queryByLabelText('Persona Ordering')).toBeNull();
    fireEvent.click(screen.getByRole('switch'));
    expect(screen.getByLabelText('Persona Ordering')).toBeInTheDocument();
    expect(screen.getByLabelText('Auto-Assignment Rules')).toBeInTheDocument();
  });
});
